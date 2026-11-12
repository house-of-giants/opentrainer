import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  checkRateLimit,
  consumeAIUsage,
  RATE_LIMITS,
  type RateLimitType,
} from "../lib/rateLimit";

const actionTypeValidator = v.union(
  v.literal("trainingLabReport"),
  v.literal("smartSwap"),
  v.literal("routineGeneration"),
  v.literal("routineSwap"),
  v.literal("dataExport")
);

export const checkAIRateLimit = internalQuery({
  args: {
    userId: v.id("users"),
    actionType: actionTypeValidator,
  },
  handler: async (ctx, args): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
    return checkRateLimit(ctx, args.userId, args.actionType as RateLimitType);
  },
});

export const consumeAIRateLimit = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.union(v.literal("routineGeneration"), v.literal("routineSwap")),
  },
  handler: async (ctx, args): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
    return consumeAIUsage(ctx, args.userId, args.action);
  },
});

export const getRateLimitConfig = internalQuery({
  args: {
    actionType: actionTypeValidator,
  },
  handler: async (_, args): Promise<{ maxRequests: number; windowMs: number }> => {
    return RATE_LIMITS[args.actionType as RateLimitType];
  },
});
