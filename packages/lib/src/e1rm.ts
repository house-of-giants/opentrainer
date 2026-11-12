import { isWorkSet } from "./progression";
import { displayWeight, roundWeight, type WeightUnit } from "./units";

/**
 * Estimated one-rep max with the Epley formula: weight × (1 + reps / 30).
 * A single is its own max. RPE does not adjust the estimate.
 */
export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (!(weight > 0) || !(reps > 0)) return null;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

type HistorySetInput = {
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  unit: WeightUnit;
  isWarmup?: boolean;
  durationSeconds?: number;
};

type HistorySessionInput = {
  workoutId: string;
  date: string;
  sets: HistorySetInput[];
};

/** "e1rm": best estimated max so far. "reps": most reps so far at this weight or heavier. */
export type PersonalRecordKind = "e1rm" | "reps";

export type ExerciseHistorySet = {
  setNumber: number;
  /** In the display unit, rounded for display. */
  weight: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
  /** Null for warm-ups, zero-rep sets, timed sets, and unloaded sets. */
  e1rm: number | null;
  pr: PersonalRecordKind | null;
};

export type ExerciseHistorySession = {
  workoutId: string;
  date: string;
  sets: ExerciseHistorySet[];
  bestE1rm: number | null;
};

export type ExerciseHistoryRecord = {
  e1rm: number;
  weight: number;
  reps: number;
  date: string;
  workoutId: string;
};

/** Weight 0 is a bodyweight set: it has rep records but no e1RM. */
export type RepBest = Omit<ExerciseHistoryRecord, "e1rm">;

export type ExerciseHistory = {
  unit: WeightUnit;
  /** Newest first. */
  sessions: ExerciseHistorySession[];
  /** Oldest first, one point for each session with a loaded work set. */
  e1rmTrend: Array<{ workoutId: string; date: string; e1rm: number }>;
  /** Heaviest work set for each rep count, by reps ascending. */
  repBests: RepBest[];
  best: ExerciseHistoryRecord | null;
};

type LoadedSet = ExerciseHistorySet & { e1rm: number };

type Load = { weight: number; reps: number };

/** True when `a` moved at least as much weight for at least as many reps. */
function beats(a: Load, b: Load): boolean {
  return a.weight >= b.weight && a.reps >= b.reps;
}

/**
 * Builds the per-exercise history view: e1RM per set and session, PRs, and
 * best set for each rep count. PRs compare each session with earlier
 * sessions only, so the first session sets the baseline.
 */
export function buildExerciseHistory(
  sessions: HistorySessionInput[],
  unit: WeightUnit
): ExerciseHistory {
  const chronological = sessions
    .map((session, index) => ({ session, index, time: Date.parse(session.date) }))
    .sort((a, b) => a.time - b.time || b.index - a.index)
    .map(({ session }) => session);

  // Heaviest weight seen at each exact rep count, from earlier sessions.
  const bestByReps = new Map<number, RepBest>();
  let best: ExerciseHistoryRecord | null = null;
  const built: ExerciseHistorySession[] = [];
  const e1rmTrend: ExerciseHistory["e1rmTrend"] = [];

  for (const session of chronological) {
    const work: ExerciseHistorySet[] = [];
    const sets: ExerciseHistorySet[] = [...session.sets]
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((set) => {
        const weight = displayWeight(set.weight, set.unit, unit);
        const estimate = isWorkSet(set) ? estimateOneRepMax(weight, set.reps) : null;
        const view: ExerciseHistorySet = {
          setNumber: set.setNumber,
          weight,
          reps: set.reps,
          rpe: set.rpe,
          isWarmup: set.isWarmup === true,
          e1rm: estimate === null ? null : roundWeight(estimate, unit),
          pr: null,
        };
        if (isWorkSet(set)) work.push(view);
        return view;
      });
    const loaded = work.filter((set): set is LoadedSet => set.e1rm !== null);

    const top = loaded.reduce<LoadedSet | null>(
      (current, set) => (current === null || set.e1rm > current.e1rm ? set : current),
      null
    );

    if (bestByReps.size > 0) {
      const previousBests = [...bestByReps.values()];
      work.forEach((set, index) => {
        const beatenEarlier = previousBests.some((record) => beats(record, set));
        const beatenToday = work.some(
          (other, otherIndex) =>
            otherIndex !== index &&
            beats(other, set) &&
            (other.weight > set.weight || other.reps > set.reps || otherIndex < index)
        );
        if (!beatenEarlier && !beatenToday) set.pr = "reps";
      });
      if (top && best !== null && top.e1rm > best.e1rm) top.pr = "e1rm";
    }

    for (const set of work) {
      const record = {
        weight: set.weight,
        reps: set.reps,
        date: session.date,
        workoutId: session.workoutId,
      };
      const current = bestByReps.get(set.reps);
      if (!current || set.weight > current.weight) bestByReps.set(set.reps, record);
      if (set.e1rm !== null && (best === null || set.e1rm > best.e1rm)) {
        best = { ...record, e1rm: set.e1rm };
      }
    }

    built.push({
      workoutId: session.workoutId,
      date: session.date,
      sets,
      bestE1rm: top?.e1rm ?? null,
    });
    if (top) {
      e1rmTrend.push({ workoutId: session.workoutId, date: session.date, e1rm: top.e1rm });
    }
  }

  return {
    unit,
    sessions: built.reverse(),
    e1rmTrend,
    repBests: [...bestByReps.values()].sort((a, b) => a.reps - b.reps),
    best,
  };
}
