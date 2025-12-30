import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

/* eslint-disable @typescript-eslint/no-explicit-any */

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();

    const wh = new Webhook(webhookSecret);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    const eventType = evt.type;
    const data = evt.data as any;

    if (eventType === "user.created" || eventType === "user.updated") {
      const email = data.email_addresses?.[0]?.email_address;
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;

      await ctx.runMutation((internal as any).webhooks.upsertUser, {
        clerkId: data.id as string,
        email,
        name,
        imageUrl: data.image_url,
      });
    }

    if (eventType === "user.deleted") {
      if (data.id) {
        await ctx.runMutation((internal as any).webhooks.deleteUser, { 
          clerkId: data.id as string 
        });
      }
    }

    // Clerk Billing: subscription.* events contain items[] array - find active item to determine tier
    if (
      eventType === "subscription.created" ||
      eventType === "subscription.updated" ||
      eventType === "subscription.active" ||
      eventType === "subscription.pastDue"
    ) {
      const userId = data.payer?.user_id || data.payer_id;
      if (!userId) {
        console.error(`[Webhook] ${eventType}: Missing user_id/payer_id`, { data });
        return new Response("Missing payer user_id", { status: 400 });
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const activeItem = items.find((item: any) => item.status === "active");
      const isPaidPlan = activeItem?.plan?.amount > 0;
      const tier = isPaidPlan ? "pro" : "free";
      const planId = activeItem?.plan_id || activeItem?.plan?.id;
      const planName = activeItem?.plan?.name;



      await ctx.runMutation((internal as any).webhooks.updateUserTier, {
        clerkId: userId as string,
        tier,
        planId,
        planName,
        subscriptionStatus: data.status as string,
      });
    }

    // Clerk Billing: subscriptionItem.* events fire for individual plan status changes
    if (
      eventType === "subscriptionItem.active" ||
      eventType === "subscriptionItem.canceled" ||
      eventType === "subscriptionItem.ended"
    ) {
      const userId = data.payer?.user_id;
      if (!userId) {
        console.error(`[Webhook] ${eventType}: Missing payer.user_id`, { data });
        return new Response("Missing payer user_id", { status: 400 });
      }

      let tier: "free" | "pro" = "free";
      if (eventType === "subscriptionItem.active" && data.plan?.amount > 0) {
        tier = "pro";
      }

      const planId = data.plan_id || data.plan?.id;
      const planName = data.plan?.name;



      await ctx.runMutation((internal as any).webhooks.updateUserTier, {
        clerkId: userId as string,
        tier,
        planId,
        planName,
        subscriptionStatus: data.status as string,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

export default http;
