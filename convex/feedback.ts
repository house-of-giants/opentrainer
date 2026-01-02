import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./auth";

export const submitFeedback = mutation({
  args: {
    type: v.union(
      v.literal("bug"),
      v.literal("feature_request"),
      v.literal("ai_quality"),
      v.literal("general")
    ),
    message: v.string(),
    context: v.optional(v.object({
      page: v.optional(v.string()),
      workoutId: v.optional(v.id("workouts")),
    })),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const feedbackId = await ctx.db.insert("feedback", {
      userId: user._id,
      type: args.type,
      message: args.message,
      context: args.context,
      status: "new",
      createdAt: Date.now(),
    });

    return feedbackId;
  },
});

export const getFeedbackForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) return [];

    return await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});
