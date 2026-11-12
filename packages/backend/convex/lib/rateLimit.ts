import { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

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
  routineSwap: {
    windowMs: TWENTY_FOUR_HOURS_MS,
    maxRequests: 10,
  },
  dataExport: {
    windowMs: TWENTY_FOUR_HOURS_MS,
    maxRequests: 5,
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;
export type AIUsageAction = Doc<"aiUsage">["action"];

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

async function countAIUsage(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  action: AIUsageAction,
  windowStart: number
): Promise<number> {
  const rows = await ctx.db
    .query("aiUsage")
    .withIndex("by_user_action_created", (q) =>
      q.eq("userId", userId).eq("action", action).gte("createdAt", windowStart)
    )
    .collect();
  return rows.length;
}

export async function checkRateLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  actionType: RateLimitType
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[actionType];
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const resetAt = windowStart + config.windowMs;

  let count: number;

  if (actionType === "smartSwap") {
    count = await countSmartSwapUsage(ctx, userId, windowStart);
  } else if (actionType === "trainingLabReport") {
    count = await countTrainingLabUsage(ctx, userId, windowStart);
  } else if (actionType === "routineGeneration" || actionType === "routineSwap") {
    count = await countAIUsage(ctx, userId, actionType, windowStart);
  } else {
    // dataExport is not counted: users.exportAllData is a query and cannot
    // record usage, so this limit never blocks an export.
    count = 0;
  }

  const remaining = Math.max(0, config.maxRequests - count);
  const allowed = count < config.maxRequests;

  return { allowed, remaining, resetAt };
}

/**
 * Checks the limit and, when allowed, records one usage row in the same
 * transaction. Call it immediately before the model call so that concurrent
 * requests cannot both pass a stale count.
 */
export async function consumeAIUsage(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: AIUsageAction
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const result = await checkRateLimit(ctx, userId, action);
  if (!result.allowed) {
    return result;
  }
  await ctx.db.insert("aiUsage", { userId, action, createdAt: Date.now() });
  return { ...result, remaining: result.remaining - 1 };
}

export async function enforceRateLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  actionType: RateLimitType
): Promise<void> {
  const { allowed, resetAt } = await checkRateLimit(ctx, userId, actionType);

  if (!allowed) {
    const hoursUntilReset = Math.max(1, Math.ceil((resetAt - Date.now()) / (60 * 60 * 1000)));
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
