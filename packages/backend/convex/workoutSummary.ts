import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type WorkoutSummary = NonNullable<Doc<"workouts">["summary"]>;

export async function getWorkoutEntries(
  ctx: MutationCtx,
  workoutId: Id<"workouts">
): Promise<Doc<"entries">[]> {
  return ctx.db
    .query("entries")
    .withIndex("by_workout_created", (q) => q.eq("workoutId", workoutId))
    .collect();
}

export function buildWorkoutSummary(
  entries: Doc<"entries">[],
  startedAt: number,
  completedAt: number
): WorkoutSummary {
  let totalVolume = 0;
  let totalSets = 0;
  let totalCardioDurationSeconds = 0;
  let totalDistanceKm = 0;
  let hasCardio = false;
  let hasMobility = false;
  const exerciseNames = new Set<string>();

  for (const entry of entries) {
    exerciseNames.add(entry.exerciseName);

    if (entry.kind === "lifting" && entry.lifting) {
      totalSets++;
      if (entry.lifting.weight && entry.lifting.reps) {
        totalVolume += entry.lifting.weight * entry.lifting.reps;
      }
      continue;
    }

    if (entry.kind === "cardio" && entry.cardio) {
      hasCardio = true;
      totalCardioDurationSeconds += entry.cardio.durationSeconds;
      if (entry.cardio.distance && entry.cardio.distanceUnit) {
        const distanceKm =
          entry.cardio.distanceUnit === "km"
            ? entry.cardio.distance
            : entry.cardio.distanceUnit === "mi"
              ? entry.cardio.distance * 1.60934
              : entry.cardio.distance / 1000;
        totalDistanceKm += distanceKm;
      }
      continue;
    }

    if (entry.kind === "mobility") {
      hasMobility = true;
    }
  }

  const totalDurationMinutes = Math.round((completedAt - startedAt) / 60000);

  return {
    totalVolume,
    totalSets,
    totalDurationMinutes,
    exerciseCount: exerciseNames.size,
    totalCardioDurationSeconds: hasCardio ? totalCardioDurationSeconds : undefined,
    totalDistanceKm: totalDistanceKm > 0 ? totalDistanceKm : undefined,
    hasCardio: hasCardio || undefined,
    hasMobility: hasMobility || undefined,
  };
}

export async function recomputeWorkoutSummary(
  ctx: MutationCtx,
  workoutId: Id<"workouts">
): Promise<void> {
  const workout = await ctx.db.get(workoutId);
  if (!workout || workout.status !== "completed" || workout.completedAt === undefined) {
    return; // in_progress/cancelled workouts have no computed summary to keep fresh
  }
  const entries = await getWorkoutEntries(ctx, workoutId);
  await ctx.db.patch(workoutId, {
    summary: buildWorkoutSummary(entries, workout.startedAt, workout.completedAt),
  });
}
