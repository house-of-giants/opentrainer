import { findExerciseByName } from "@opentrainer/lib/exercise-deduplication";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function getSystemExercises(ctx: Ctx) {
  return await ctx.db
    .query("exercises")
    .withIndex("by_system", (q) => q.eq("isSystemExercise", true))
    .collect();
}

export async function getUserExercises(ctx: Ctx, userId: Id<"users">) {
  return await ctx.db
    .query("exercises")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

/**
 * The id of the exercise a logged name refers to for this user, if any.
 * Writes, history reads, and the exerciseId backfill all resolve names here,
 * so they agree on which exercise a name means.
 */
export async function resolveExerciseId(
  ctx: Ctx,
  userId: Id<"users">,
  exerciseName: string,
  systemExercises?: Doc<"exercises">[]
): Promise<Id<"exercises"> | undefined> {
  const [userExercises, system] = await Promise.all([
    getUserExercises(ctx, userId),
    systemExercises ?? getSystemExercises(ctx),
  ]);
  return findExerciseByName(userExercises, system, exerciseName)?._id;
}
