import {
  parseRepRange,
  type GhostSetData,
  type ProgressionSuggestion,
} from "./progression";
import { stepWeight } from "./weight-step";
import type { WeightUnit } from "./units";

type RoutineWithDays = {
  _id: string;
  updatedAt?: number;
  days: readonly unknown[];
};

type CompletedWorkout = {
  routineId?: string;
  routineDayIndex?: number;
  startedAt: number;
};

export type NextRoutineDay<R extends RoutineWithDays> = {
  routine: R;
  dayIndex: number;
};

/**
 * The day the lifter should train next. It follows the routine of the most
 * recent completed routine workout: the day after the one they did, wrapped to
 * the routine's current length. With no routine history, it is day 1 of the
 * most recently updated routine. Returns null when no routine has a day.
 */
export function getNextRoutineDay<R extends RoutineWithDays>(
  routines: readonly R[],
  completedWorkouts: readonly CompletedWorkout[],
): NextRoutineDay<R> | null {
  const usable = routines.filter((routine) => routine.days.length > 0);
  if (usable.length === 0) return null;

  const newestFirst = [...completedWorkouts].sort(
    (a, b) => b.startedAt - a.startedAt,
  );
  for (const workout of newestFirst) {
    if (workout.routineDayIndex === undefined) continue;
    const routine = usable.find((r) => r._id === workout.routineId);
    if (!routine) continue;
    const last = Math.trunc(workout.routineDayIndex);
    const dayIndex = last >= 0 ? (last + 1) % routine.days.length : 0;
    return { routine, dayIndex };
  }

  const newestRoutine = usable.reduce((newest, routine) =>
    (routine.updatedAt ?? 0) > (newest.updatedAt ?? 0) ? routine : newest,
  );
  return { routine: newestRoutine, dayIndex: 0 };
}

/** "Day 2 · Lower", or "Day 2" when the name adds nothing. */
export function routineDayLabel(dayIndex: number, dayName: string): string {
  const number = `Day ${dayIndex + 1}`;
  const name = dayName.trim();
  if (!name || name.toLowerCase() === number.toLowerCase()) return number;
  return `${number} · ${name}`;
}

type RoutineExercise = {
  exerciseName: string;
  kind: string;
  measurementType?: string;
  targetReps?: string;
};

/** The first rep-based lift of a routine day; progression applies only to these. */
export function firstLiftOfDay<E extends RoutineExercise>(day: {
  exercises: readonly E[];
}): E | undefined {
  return day.exercises.find(
    (exercise) =>
      exercise.kind === "lifting" && exercise.measurementType !== "duration",
  );
}

/** "315 lb × 5", or "12 reps" for a bodyweight set. */
export function formatSetTarget(
  weight: number,
  reps: number,
  unit: WeightUnit,
): string {
  if (weight <= 0) return `${reps} reps`;
  return `${weight} ${unit} × ${reps}`;
}

type ProgressionResult = {
  lastSession: GhostSetData;
  suggestion: ProgressionSuggestion;
};

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * One short line on what the progression rules changed for next session, and
 * the set to aim for. Example: { change: "+5 lb", target: "230 lb × 5" }.
 */
export function describeNextSessionChange(
  { lastSession, suggestion }: ProgressionResult,
  targetReps?: string,
): { change: string; target: string } {
  const unit = lastSession.unit;
  const targetWeight = suggestion.targetWeight ?? lastSession.weight;
  const nextReps = suggestion.targetReps ?? lastSession.reps;
  const target = formatSetTarget(targetWeight, nextReps, unit);
  // stepWeight(a, -b) is a - b without floating-point noise.
  const weightDelta = stepWeight(targetWeight, -lastSession.weight);
  const repsDelta = nextReps - lastSession.reps;

  if (suggestion.type === "increase_weight" && weightDelta > 0) {
    return { change: `+${weightDelta} ${unit}`, target };
  }
  if (suggestion.type === "increase_reps" && repsDelta > 0) {
    return { change: `+${plural(repsDelta, "rep")}`, target };
  }
  if (suggestion.type === "deload" && weightDelta < 0) {
    return { change: `Deload −${-weightDelta} ${unit}`, target };
  }

  const range = parseRepRange(targetReps);
  const repsShort = range ? range.min - lastSession.reps : 0;
  return {
    change: repsShort > 0 ? `Hold, ${plural(repsShort, "rep")} short` : "Hold",
    target,
  };
}
