const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const MUSCLE_RECOVERY_WINDOW_MS = 48 * HOUR_MS;
export const MUSCLE_RECOVERY_LOOKBACK_MS = 14 * DAY_MS;

const UNMAPPED_MUSCLE = "unmapped";

export type MuscleAnalyticsWorkout = {
  id: string;
  status: "in_progress" | "completed" | "cancelled";
  startedAt: number;
  completedAt?: number;
};

export type MuscleAnalyticsEntry = {
  workoutId: string;
  exerciseId?: string;
  exerciseName: string;
  kind: "lifting" | "cardio" | "mobility";
  lifting?: {
    reps?: number;
    weight?: number;
    durationSeconds?: number;
    unit?: "kg" | "lb";
    rpe?: number;
    isWarmup?: boolean;
  };
};

export type MuscleAnalyticsExercise = {
  id?: string;
  name: string;
  muscleGroups?: string[];
};

export type MuscleSplitDatum = {
  muscle: string;
  label: string;
  sets: number;
  percentage: number;
  isUnmapped: boolean;
};

export type MuscleRecoveryDatum = {
  muscle: string;
  label: string;
  recoveryPercent: number;
  hoursSinceLastTrained: number;
  lastTrainedAt: number;
  lastTrainedDate: string;
};

export type MuscleWorkloadDatum = {
  muscle: string;
  label: string;
  setsThisWeek: number;
  lastTrainedAt: number | null;
  lastTrainedDate: string | null;
  isUnmapped: boolean;
};

export type MuscleAnalyticsResult = {
  generatedAt: number;
  weekStart: number;
  weekEnd: number;
  recoveryWindowHours: number;
  recoveryLookbackDays: number;
  totalWorkingSets: number;
  totalMuscleSetContributions: number;
  unmappedWorkingSets: number;
  split: MuscleSplitDatum[];
  recovery: MuscleRecoveryDatum[];
  workload: MuscleWorkloadDatum[];
};

export function calculateMuscleAnalytics({
  now,
  weekStart,
  workouts,
  entries,
  exercises,
}: {
  now: number;
  weekStart: number;
  workouts: MuscleAnalyticsWorkout[];
  entries: MuscleAnalyticsEntry[];
  exercises: MuscleAnalyticsExercise[];
}): MuscleAnalyticsResult {
  const validWorkouts = new Map<string, MuscleAnalyticsWorkout>();
  for (const workout of workouts) {
    if (!isUsableCompletedWorkout(workout, now)) continue;
    validWorkouts.set(workout.id, workout);
  }

  const exerciseById = new Map<string, MuscleAnalyticsExercise>();
  const exerciseByName = new Map<string, MuscleAnalyticsExercise>();
  for (const exercise of exercises) {
    if (exercise.id) {
      exerciseById.set(exercise.id, exercise);
    }
    exerciseByName.set(normalizeKey(exercise.name), exercise);
  }

  const splitStats = new Map<string, { label: string; sets: number; isUnmapped: boolean }>();
  const recoveryStats = new Map<string, { label: string; lastTrainedAt: number }>();
  const recoveryLookbackStart = now - MUSCLE_RECOVERY_LOOKBACK_MS;

  let totalWorkingSets = 0;
  let unmappedWorkingSets = 0;

  for (const entry of entries) {
    if (!isWorkingStrengthSet(entry)) continue;

    const workout = validWorkouts.get(entry.workoutId);
    if (!workout) continue;

    const exercise = findExercise(entry, exerciseById, exerciseByName);
    const muscles = getUniqueMuscles(exercise?.muscleGroups);
    const workoutDate = workout.completedAt ?? workout.startedAt;

    if (muscles.length > 0 && workoutDate >= recoveryLookbackStart) {
      for (const muscle of muscles) {
        const existing = recoveryStats.get(muscle.key);
        if (!existing || workoutDate > existing.lastTrainedAt) {
          recoveryStats.set(muscle.key, {
            label: muscle.label,
            lastTrainedAt: workoutDate,
          });
        }
      }
    }

    const isCurrentWeek = workoutDate >= weekStart && workoutDate <= now;
    if (!isCurrentWeek) continue;

    totalWorkingSets++;

    if (muscles.length === 0) {
      unmappedWorkingSets++;
      const existing = splitStats.get(UNMAPPED_MUSCLE) ?? {
        label: "Unmapped",
        sets: 0,
        isUnmapped: true,
      };
      existing.sets++;
      splitStats.set(UNMAPPED_MUSCLE, existing);
      continue;
    }

    for (const muscle of muscles) {
      const existing = splitStats.get(muscle.key) ?? {
        label: muscle.label,
        sets: 0,
        isUnmapped: false,
      };
      existing.sets++;
      splitStats.set(muscle.key, existing);
    }
  }

  const totalMuscleSetContributions = Array.from(splitStats.values()).reduce(
    (sum, item) => sum + item.sets,
    0
  );

  const split = Array.from(splitStats.entries())
    .map(([muscle, stats]) => ({
      muscle,
      label: stats.label,
      sets: stats.sets,
      percentage:
        totalMuscleSetContributions > 0
          ? Math.round((stats.sets / totalMuscleSetContributions) * 100)
          : 0,
      isUnmapped: stats.isUnmapped,
    }))
    .sort(sortBySetsThenLabel);

  const recovery = Array.from(recoveryStats.entries())
    .map(([muscle, stats]) => {
      const hoursSinceLastTrained = Math.max(0, (now - stats.lastTrainedAt) / HOUR_MS);
      return {
        muscle,
        label: stats.label,
        recoveryPercent: Math.min(
          100,
          Math.round((hoursSinceLastTrained / (MUSCLE_RECOVERY_WINDOW_MS / HOUR_MS)) * 100)
        ),
        hoursSinceLastTrained: Math.round(hoursSinceLastTrained * 10) / 10,
        lastTrainedAt: stats.lastTrainedAt,
        lastTrainedDate: new Date(stats.lastTrainedAt).toISOString().split("T")[0],
      };
    })
    .sort((a, b) => {
      if (a.recoveryPercent !== b.recoveryPercent) {
        return a.recoveryPercent - b.recoveryPercent;
      }
      return b.lastTrainedAt - a.lastTrainedAt || a.label.localeCompare(b.label);
    });

  const workloadKeys = new Set<string>([
    ...Array.from(splitStats.keys()),
    ...Array.from(recoveryStats.keys()),
  ]);
  const workload = Array.from(workloadKeys)
    .map((muscle): MuscleWorkloadDatum => {
      const splitStatsForMuscle = splitStats.get(muscle);
      const recoveryStatsForMuscle = recoveryStats.get(muscle);
      const isUnmapped = muscle === UNMAPPED_MUSCLE || splitStatsForMuscle?.isUnmapped === true;
      const lastTrainedAt = isUnmapped ? null : recoveryStatsForMuscle?.lastTrainedAt ?? null;

      return {
        muscle,
        label:
          splitStatsForMuscle?.label ??
          recoveryStatsForMuscle?.label ??
          formatMuscleLabel(muscle),
        setsThisWeek: splitStatsForMuscle?.sets ?? 0,
        lastTrainedAt,
        lastTrainedDate:
          lastTrainedAt === null ? null : new Date(lastTrainedAt).toISOString().split("T")[0],
        isUnmapped,
      };
    })
    .sort(sortWorkloadRows);

  return {
    generatedAt: now,
    weekStart,
    weekEnd: now,
    recoveryWindowHours: MUSCLE_RECOVERY_WINDOW_MS / HOUR_MS,
    recoveryLookbackDays: MUSCLE_RECOVERY_LOOKBACK_MS / DAY_MS,
    totalWorkingSets,
    totalMuscleSetContributions,
    unmappedWorkingSets,
    split,
    recovery,
    workload,
  };
}

function isUsableCompletedWorkout(workout: MuscleAnalyticsWorkout, now: number): boolean {
  if (workout.status !== "completed") return false;
  if (!Number.isFinite(workout.startedAt) || workout.startedAt > now) return false;

  if (workout.completedAt === undefined) return true;
  if (!Number.isFinite(workout.completedAt)) return false;
  if (workout.completedAt > now) return false;
  if (workout.completedAt < workout.startedAt) return false;

  return true;
}

function isWorkingStrengthSet(entry: MuscleAnalyticsEntry): boolean {
  return entry.kind === "lifting" && !!entry.lifting && entry.lifting.isWarmup !== true;
}

function findExercise(
  entry: MuscleAnalyticsEntry,
  exerciseById: Map<string, MuscleAnalyticsExercise>,
  exerciseByName: Map<string, MuscleAnalyticsExercise>
): MuscleAnalyticsExercise | undefined {
  const byId = entry.exerciseId ? exerciseById.get(entry.exerciseId) : undefined;
  if (getUniqueMuscles(byId?.muscleGroups).length > 0) {
    return byId;
  }

  return exerciseByName.get(normalizeKey(entry.exerciseName)) ?? byId;
}

function getUniqueMuscles(muscleGroups: string[] | undefined): Array<{ key: string; label: string }> {
  const muscles = new Map<string, string>();
  for (const muscleGroup of muscleGroups ?? []) {
    const key = normalizeKey(muscleGroup);
    if (!key) continue;
    muscles.set(key, formatMuscleLabel(key));
  }
  return Array.from(muscles.entries()).map(([key, label]) => ({ key, label }));
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatMuscleLabel(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sortBySetsThenLabel(a: MuscleSplitDatum, b: MuscleSplitDatum): number {
  return b.sets - a.sets || a.label.localeCompare(b.label);
}

function sortWorkloadRows(a: MuscleWorkloadDatum, b: MuscleWorkloadDatum): number {
  if (a.setsThisWeek !== b.setsThisWeek) {
    return b.setsThisWeek - a.setsThisWeek;
  }

  const aLastTrainedAt = a.lastTrainedAt ?? Number.NEGATIVE_INFINITY;
  const bLastTrainedAt = b.lastTrainedAt ?? Number.NEGATIVE_INFINITY;
  if (aLastTrainedAt !== bLastTrainedAt) {
    return bLastTrainedAt - aLastTrainedAt;
  }

  if (a.isUnmapped !== b.isUnmapped) {
    return a.isUnmapped ? 1 : -1;
  }

  return a.label.localeCompare(b.label);
}
