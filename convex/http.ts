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

    // Clerk Billing subscription events
    // Available: subscription.created, subscription.updated, subscription.active, subscription.pastDue
    // Payload keys: active_at, canceled_at, created_at, ended_at, id, items, latest_payment_id, 
    //               object, payer, payer_id, payment_source_id, status, updated_at
    if (
      eventType === "subscription.created" ||
      eventType === "subscription.updated" ||
      eventType === "subscription.active"
    ) {
      const userId = data.payer_id;
      if (!userId) {
        return new Response("Missing payer_id", { status: 400 });
      }

      // subscription.active event name itself indicates active subscription
      // For other events, check the status field
      const isActive = eventType === "subscription.active" || data.status === "active";
      const tier = isActive ? "pro" : "free";

      // Plan info is in items array
      const firstItem = Array.isArray(data.items) ? data.items[0] : null;
      const planId = firstItem?.plan_id || firstItem?.planId;
      const planName = firstItem?.plan?.name;

      await ctx.runMutation((internal as any).webhooks.updateUserTier, {
        clerkId: userId as string,
        tier,
        planId,
        planName,
        subscriptionStatus: data.status as string,
      });
    }

    // Handle past_due and ended/canceled subscriptions
    if (
      eventType === "subscription.pastDue" ||
      (eventType === "subscription.updated" && 
        (data.status === "past_due" || data.status === "canceled" || data.status === "ended"))
    ) {
      const userId = data.payer_id;
      if (!userId) {
        return new Response("Missing payer_id", { status: 400 });
      }

      await ctx.runMutation((internal as any).webhooks.updateUserTier, {
        clerkId: userId as string,
        tier: "free",
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
