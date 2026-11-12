import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { getCurrentUser } from "./auth";
import { createConvexLogger, truncateId } from "./lib/logger";
import { buildWorkoutSummary, getWorkoutEntries } from "./workoutSummary";
import {
  IMPORT_BATCH_LIMITS,
  buildImportKey,
} from "@opentrainer/lib/history-import";
import { normalizeExerciseName } from "@opentrainer/lib/exercise-names";

const importSetValidator = v.object({
  exerciseName: v.string(),
  exerciseId: v.optional(v.id("exercises")),
  reps: v.optional(v.number()),
  weight: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  unit: v.union(v.literal("kg"), v.literal("lb")),
  rpe: v.optional(v.number()),
  rir: v.optional(v.number()),
  isWarmup: v.optional(v.boolean()),
  notes: v.optional(v.string()),
});

const importWorkoutValidator = v.object({
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  title: v.optional(v.string()),
  notes: v.optional(v.string()),
  sets: v.array(importSetValidator),
});

type ImportSet = typeof importSetValidator.type;

function validateSet(set: ImportSet) {
  const { reps, weight, durationSeconds, rpe, rir } = set;
  if (durationSeconds !== undefined && reps !== undefined) {
    throw new Error("A set can't have both reps and a duration");
  }
  if (durationSeconds !== undefined) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error("Duration must be greater than zero");
    }
  } else if (reps === undefined || !Number.isFinite(reps) || reps <= 0) {
    throw new Error("Reps must be greater than zero");
  }
  if (weight !== undefined && (!Number.isFinite(weight) || weight < 0)) {
    throw new Error("Weight can't be negative");
  }
  if (rpe !== undefined && (!Number.isFinite(rpe) || rpe < 1 || rpe > 10)) {
    throw new Error("RPE must be from 1 to 10");
  }
  if (rir !== undefined && (!Number.isFinite(rir) || rir < 0 || rir > 10)) {
    throw new Error("RIR must be from 0 to 10");
  }
}

async function findExistingWorkout(
  ctx: MutationCtx,
  userId: Id<"users">,
  importKey: string,
  startedAt: number,
  title: string | undefined
) {
  const imported = await ctx.db
    .query("workouts")
    .withIndex("by_user_import_key", (q) =>
      q.eq("userId", userId).eq("importKey", importKey)
    )
    .first();
  if (imported) return imported;

  // An OpenTrainer export keeps each workout's exact start time and title, so
  // re-importing it must not copy workouts that were logged in the app.
  const sameStart = await ctx.db
    .query("workouts")
    .withIndex("by_user_started", (q) =>
      q.eq("userId", userId).eq("startedAt", startedAt)
    )
    .collect();
  const normalizedTitle = normalizeExerciseName(title ?? "");
  return (
    sameStart.find(
      (workout) =>
        workout.status === "completed" &&
        normalizeExerciseName(workout.title ?? "") === normalizedTitle
    ) ?? null
  );
}

/**
 * Saves one batch of workouts from a CSV history import. Each workout is
 * saved as completed with its original dates. A workout that an earlier
 * import (or the app itself) already saved is skipped, so the same file can
 * be imported again without duplicates. The client sends the file in batches
 * within IMPORT_BATCH_LIMITS.
 */
export const importWorkouts = mutation({
  args: {
    workouts: v.array(importWorkoutValidator),
  },
  handler: async (ctx, args) => {
    const logger = createConvexLogger("historyImport.importWorkouts");

    const user = await getCurrentUser(ctx);
    if (!user) {
      logger.fail(new Error("User not found"));
      throw new Error("User not found");
    }
    logger.set({ user: { id: truncateId(user._id) } });

    const setCount = args.workouts.reduce((sum, w) => sum + w.sets.length, 0);
    if (
      args.workouts.length > IMPORT_BATCH_LIMITS.workouts ||
      setCount > IMPORT_BATCH_LIMITS.sets
    ) {
      throw new Error(
        `Send at most ${IMPORT_BATCH_LIMITS.workouts} workouts and ${IMPORT_BATCH_LIMITS.sets} sets per batch`
      );
    }

    const now = Date.now();
    const exercises = new Map<Id<"exercises">, Doc<"exercises">>();
    const getExercise = async (id: Id<"exercises">) => {
      const cached = exercises.get(id);
      if (cached) return cached;
      const exercise = await ctx.db.get(id);
      if (!exercise || (!exercise.isSystemExercise && exercise.userId !== user._id)) {
        throw new Error("Exercise not found");
      }
      exercises.set(id, exercise);
      return exercise;
    };

    let created = 0;
    let duplicates = 0;
    let setsCreated = 0;

    for (const workout of args.workouts) {
      const completedAt = workout.completedAt ?? workout.startedAt;
      if (!Number.isFinite(workout.startedAt) || !Number.isFinite(completedAt)) {
        throw new Error("Workout dates must be valid");
      }
      if (completedAt < workout.startedAt) {
        throw new Error("End time must not be before start time");
      }
      if (completedAt > now) {
        throw new Error("Times can't be in the future");
      }
      if (workout.sets.length === 0) {
        throw new Error("A workout needs at least one set");
      }
      workout.sets.forEach(validateSet);

      const title = workout.title?.trim() || undefined;
      const importKey = buildImportKey(workout.startedAt, title);
      const existing = await findExistingWorkout(
        ctx,
        user._id,
        importKey,
        workout.startedAt,
        title
      );
      if (existing) {
        duplicates += 1;
        continue;
      }

      const workoutId = await ctx.db.insert("workouts", {
        userId: user._id,
        title,
        status: "completed",
        startedAt: workout.startedAt,
        completedAt,
        notes: workout.notes?.trim() || undefined,
        importKey,
      });

      const setNumbers = new Map<string, number>();
      for (const [index, set] of workout.sets.entries()) {
        const exercise = set.exerciseId ? await getExercise(set.exerciseId) : null;
        const exerciseName = exercise?.name ?? set.exerciseName.trim();
        if (!exerciseName) {
          throw new Error("Each set needs an exercise name");
        }
        const setKey = normalizeExerciseName(exerciseName);
        const setNumber = (setNumbers.get(setKey) ?? 0) + 1;
        setNumbers.set(setKey, setNumber);

        await ctx.db.insert("entries", {
          workoutId,
          userId: user._id,
          exerciseId: exercise?._id,
          exerciseName,
          kind: "lifting",
          lifting: {
            setNumber,
            reps: set.reps,
            weight: set.weight,
            durationSeconds: set.durationSeconds,
            unit: set.unit,
            rpe: set.rpe,
            rir: set.rir,
            isWarmup: set.isWarmup || undefined,
          },
          notes: set.notes?.trim() || undefined,
          // Entries sort by createdAt, so keep the file's set order.
          createdAt: workout.startedAt + index,
        });
      }

      const entries = await getWorkoutEntries(ctx, workoutId);
      await ctx.db.patch(workoutId, {
        summary: buildWorkoutSummary(entries, workout.startedAt, completedAt),
      });

      created += 1;
      setsCreated += workout.sets.length;
    }

    logger.success({ import: { created, duplicates, sets: setsCreated } });

    return { created, duplicates, sets: setsCreated };
  },
});
