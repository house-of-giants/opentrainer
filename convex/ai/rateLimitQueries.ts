import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { checkRateLimit, RATE_LIMITS, type RateLimitType } from "../lib/rateLimit";

export const checkAIRateLimit = internalQuery({
  args: {
    userId: v.id("users"),
    actionType: v.union(
      v.literal("trainingLabReport"),
      v.literal("smartSwap"),
      v.literal("routineGeneration"),
      v.literal("progression")
    ),
  },
  handler: async (ctx, args): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
    return checkRateLimit(ctx, args.userId, args.actionType as RateLimitType);
  },
});

export const getRateLimitConfig = internalQuery({
  args: {
    actionType: v.union(
      v.literal("trainingLabReport"),
      v.literal("smartSwap"),
      v.literal("routineGeneration"),
      v.literal("progression")
    ),
  },
  handler: async (_, args): Promise<{ maxRequests: number; windowMs: number }> => {
    return RATE_LIMITS[args.actionType as RateLimitType];
  },
});
