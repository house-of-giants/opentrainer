import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const upsertUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        updatedAt: Date.now(),
      });
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      tier: "free",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

export const deleteUser = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const updateUserTier = internalMutation({
  args: {
    clerkId: v.string(),
    tier: v.union(v.literal("free"), v.literal("pro")),
    planId: v.optional(v.string()),
    planName: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      console.error(`User not found for clerkId: ${args.clerkId}`);
      return;
    }

    await ctx.db.patch(user._id, {
      tier: args.tier,
      updatedAt: Date.now(),
    });

    console.log(`Updated user ${args.clerkId} tier to ${args.tier}`);
  },
});
