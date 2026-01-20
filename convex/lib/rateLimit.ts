import { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const RATE_LIMITS = {
  trainingLabReport: {
    windowMs: TWENTY_FOUR_HOURS_MS,
    maxRequests: 10,
  },
  smartSwap: {
    windowMs: TWENTY_FOUR_HOURS_MS,
    maxRequests: 30,
  },
  routineGeneration: {
    windowMs: TWENTY_FOUR_HOURS_MS,
    maxRequests: 10,
  },
  progression: {
    windowMs: TWENTY_FOUR_HOURS_MS,
    maxRequests: 50,
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

async function countSmartSwapUsage(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  windowStart: number
): Promise<number> {
  const swaps = await ctx.db
    .query("exerciseSwaps")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.gte(q.field("createdAt"), windowStart))
    .collect();
  return swaps.length;
}

async function countTrainingLabUsage(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  windowStart: number
): Promise<number> {
  const assessments = await ctx.db
    .query("assessments")
    .withIndex("by_user_created", (q) => q.eq("userId", userId))
    .filter((q) =>
      q.and(
        q.gte(q.field("createdAt"), windowStart),
        q.eq(q.field("subjectType"), "weekly_review")
      )
    )
    .collect();
  return assessments.length;
}

async function countGeneralAIUsage(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  windowStart: number
): Promise<number> {
  const assessments = await ctx.db
    .query("assessments")
    .withIndex("by_user_created", (q) => q.eq("userId", userId))
    .filter((q) => q.gte(q.field("createdAt"), windowStart))
    .collect();
  return assessments.length;
}

export async function checkRateLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  actionType: RateLimitType
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[actionType];
  const windowStart = Date.now() - config.windowMs;
  const resetAt = Date.now() + config.windowMs;

  let count: number;

  if (actionType === "smartSwap") {
    count = await countSmartSwapUsage(ctx, userId, windowStart);
  } else if (actionType === "trainingLabReport") {
    count = await countTrainingLabUsage(ctx, userId, windowStart);
  } else {
    count = await countGeneralAIUsage(ctx, userId, windowStart);
  }

  const remaining = Math.max(0, config.maxRequests - count);
  const allowed = count < config.maxRequests;

  return { allowed, remaining, resetAt };
}

export async function enforceRateLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  actionType: RateLimitType
): Promise<void> {
  const { allowed } = await checkRateLimit(ctx, userId, actionType);

  if (!allowed) {
    const hoursUntilReset = 24;
    throw new Error(
      `Rate limit exceeded for ${actionType}. ` +
        `You've used all ${RATE_LIMITS[actionType].maxRequests} requests for today. ` +
        `Try again in ${hoursUntilReset} hours.`
    );
  }
}

export async function getRateLimitStatus(
  ctx: QueryCtx,
  userId: Id<"users">,
  actionType: RateLimitType
): Promise<{ remaining: number; total: number; resetAt: number }> {
  const { remaining, resetAt } = await checkRateLimit(ctx, userId, actionType);
  return {
    remaining,
    total: RATE_LIMITS[actionType].maxRequests,
    resetAt,
  };
}
