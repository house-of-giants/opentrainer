export type WorkoutExerciseForRoutine = {
  name?: string;
  kind?: string;
  sets?: Array<{
    weight?: number;
    reps?: number;
    durationSeconds?: number;
    rpe?: number;
    isWarmup?: boolean;
  }>;
  cardio?: unknown;
};

export type ConvertedRoutineExercise = {
  name: string;
  kind: string;
  targetSets?: number;
  targetReps?: string;
  targetRpe?: number;
  targetDuration?: number;
  measurementType?: "reps" | "duration";
  targetHoldSeconds?: number;
};

export type WorkoutEntryForRoutine<TExerciseId = string> = {
  exerciseId?: TExerciseId;
  exerciseName: string;
  kind: "lifting" | "cardio" | "mobility";
  lifting?: {
    durationSeconds?: number;
  };
};

export type StoredRoutineExercise<TExerciseId = string> = {
  exerciseId?: TExerciseId;
  exerciseName: string;
  kind: "lifting" | "cardio" | "mobility";
  targetSets?: number;
  targetReps?: string;
  measurementType?: "duration";
  targetDuration?: number;
  targetHoldSeconds?: number;
};

type WorkoutSet = NonNullable<WorkoutExerciseForRoutine["sets"]>[number];

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function averageRpe(sets: WorkoutSet[]): number | undefined {
  return average(
    sets.flatMap((set) => (set.rpe === undefined ? [] : [set.rpe]))
  );
}

function convertLiftingSets(name: string, sets: WorkoutSet[]): ConvertedRoutineExercise[] {
  const workingSets = sets.filter((set) => !set.isWarmup);

  if (workingSets.length === 0) {
    return [{
      name,
      kind: "lifting",
      targetSets: sets.length,
      targetReps: "8-12",
    }];
  }

  const timedSets = workingSets.filter((set) => (set.durationSeconds ?? 0) > 0);
  const repSets = workingSets.filter((set) => (set.durationSeconds ?? 0) <= 0);
  const converted: ConvertedRoutineExercise[] = [];

  // Keep the source ordering when a workout contains both measurement modes.
  // Each routine row still has exactly one logger, preserving the existing model.
  const firstTimedIndex = workingSets.findIndex((set) => (set.durationSeconds ?? 0) > 0);
  const firstRepIndex = workingSets.findIndex((set) => (set.durationSeconds ?? 0) <= 0);
  const modes = [
    { mode: "reps" as const, index: firstRepIndex },
    { mode: "duration" as const, index: firstTimedIndex },
  ].filter(({ index }) => index >= 0).sort((a, b) => a.index - b.index);

  for (const { mode } of modes) {
    if (mode === "duration") {
      const targetRpe = averageRpe(timedSets);
      converted.push({
        name,
        kind: "lifting",
        targetSets: timedSets.length,
        ...(targetRpe === undefined ? {} : { targetRpe }),
        measurementType: "duration",
        targetHoldSeconds: average(
          timedSets.map((set) => set.durationSeconds ?? 0)
        ),
      });
      continue;
    }

    const averageReps = average(repSets.map((set) => set.reps ?? 0)) ?? 0;
    const targetRpe = averageRpe(repSets);
    converted.push({
      name,
      kind: "lifting",
      targetSets: repSets.length,
      targetReps: averageReps > 0 ? `${averageReps}` : "8-12",
      ...(targetRpe === undefined ? {} : { targetRpe }),
    });
  }

  return converted;
}

export function convertWorkoutExercisesToRoutineFormat(
  exercises: WorkoutExerciseForRoutine[]
): ConvertedRoutineExercise[] {
  return exercises.flatMap((exercise) => {
    if (!exercise.name || typeof exercise.name !== "string") {
      throw new Error(
        "Workout export contains an exercise without a name. This might be corrupted. Try exporting the workout again."
      );
    }

    const kind = exercise.kind === "cardio"
      ? "cardio"
      : exercise.kind === "mobility"
        ? "mobility"
        : "lifting";

    if (kind === "lifting" && Array.isArray(exercise.sets)) {
      return convertLiftingSets(exercise.name, exercise.sets);
    }

    return [{
      name: exercise.name,
      kind,
      targetDuration: kind === "cardio" ? 15 : undefined,
    }];
  });
}

export function convertWorkoutEntriesToRoutineFormat<TExerciseId>(
  entries: WorkoutEntryForRoutine<TExerciseId>[]
): StoredRoutineExercise<TExerciseId>[] {
  const exerciseMap = new Map<string, {
    exerciseId?: TExerciseId;
    exerciseName: string;
    kind: "lifting" | "cardio" | "mobility";
    sets: number;
    durations: number[];
  }>();

  for (const entry of entries) {
    const measurementType = entry.kind === "lifting" && entry.lifting?.durationSeconds !== undefined
      ? "duration"
      : "reps";
    const key = JSON.stringify([entry.exerciseName, entry.kind, measurementType]);
    const existing = exerciseMap.get(key);

    if (!existing) {
      exerciseMap.set(key, {
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        kind: entry.kind,
        sets: 1,
        durations: entry.lifting?.durationSeconds !== undefined
          ? [entry.lifting.durationSeconds]
          : [],
      });
      continue;
    }

    exerciseMap.set(key, {
      ...existing,
      sets: existing.sets + 1,
      durations: entry.lifting?.durationSeconds !== undefined
        ? [...existing.durations, entry.lifting.durationSeconds]
        : existing.durations,
    });
  }

  return Array.from(exerciseMap.values()).map((data) => {
    const isTimedStrength = data.kind === "lifting" && data.durations.length > 0;
    return {
      exerciseId: data.exerciseId,
      exerciseName: data.exerciseName,
      kind: data.kind,
      targetSets: data.kind === "lifting" || data.kind === "mobility" ? data.sets : undefined,
      targetReps: data.kind === "lifting" && !isTimedStrength ? "8-12" : undefined,
      measurementType: isTimedStrength ? "duration" as const : undefined,
      targetDuration: data.kind === "cardio" ? 15 : undefined,
      targetHoldSeconds: isTimedStrength
        ? average(data.durations)
        : data.kind === "mobility" ? 30 : undefined,
    };
  });
}
