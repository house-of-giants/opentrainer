import { displayWeight, type WeightUnit } from "./units";

type ExerciseSession = {
  workoutId: string;
  date: string;
  sets: Array<{
    setNumber: number;
    weight: number;
    reps: number;
    rpe: number | null;
    unit: "kg" | "lb";
  }>;
  bestSet: {
    weight: number;
    reps: number;
    rpe: number | null;
    unit: "kg" | "lb";
  };
};

function convertSessionToUnit(
  session: ExerciseSession,
  unit: WeightUnit
): ExerciseSession {
  const sets = session.sets.map((set) => ({
    ...set,
    weight: displayWeight(set.weight, set.unit, unit),
    unit,
  }));
  const workingSets = sets.filter((set) => set.reps > 0);
  const bestSet = (workingSets.length > 0 ? workingSets : sets).reduce(
    (best, current) => (current.weight > best.weight ? current : best),
    {
      ...session.bestSet,
      weight: displayWeight(
        session.bestSet.weight,
        session.bestSet.unit,
        unit
      ),
      unit,
    }
  );

  return { ...session, sets, bestSet };
}

export type ProgressionSuggestion = {
  type: "increase_weight" | "increase_reps" | "hold" | "deload";
  targetWeight: number | null;
  targetReps: number | null;
  reasoning: string | null;
};

export type GhostSetData = {
  weight: number;
  reps: number;
  rpe: number | null;
  date: string;
  unit: "lb" | "kg";
};

function roundWeight(weight: number, unit: "kg" | "lb"): number {
  const increment = unit === "kg" ? 1 : 2.5;
  return Math.round(weight / increment) * increment;
}

function parseRepRange(repRange: string | undefined): { min: number; max: number } | null {
  if (!repRange) return null;
  const match = repRange.match(/(\d+)\s*-\s*(\d+)/);
  if (match) {
    return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
  }
  const single = repRange.match(/(\d+)/);
  if (single) {
    const val = parseInt(single[1], 10);
    return { min: val, max: val };
  }
  return null;
}

function sessionHitTopOfRepRange(
  session: ExerciseSession,
  repRange: { min: number; max: number } | null
): boolean {
  if (!repRange) return false;
  const workingSets = session.sets.filter((s) => s.reps > 0);
  if (workingSets.length === 0) return false;
  return workingSets.every((set) => set.reps >= repRange.max);
}

function sessionsAtSameWeight(sessions: ExerciseSession[]): ExerciseSession[] {
  if (sessions.length === 0) return [];
  const targetWeight = sessions[0].bestSet.weight;
  const consecutive: ExerciseSession[] = [];
  for (const session of sessions) {
    if (session.bestSet.weight === targetWeight) {
      consecutive.push(session);
    } else {
      break;
    }
  }
  return consecutive;
}

function sessionsAtSameWeightAndReps(sessions: ExerciseSession[]): ExerciseSession[] {
  if (sessions.length === 0) return [];
  const targetWeight = sessions[0].bestSet.weight;
  const targetReps = sessions[0].bestSet.reps;
  const consecutive: ExerciseSession[] = [];
  for (const session of sessions) {
    if (session.bestSet.weight === targetWeight && session.bestSet.reps >= targetReps) {
      consecutive.push(session);
    } else {
      break;
    }
  }
  return consecutive;
}

function getAvgRpe(sessions: ExerciseSession[]): number | null {
  const rpes = sessions
    .map((s) => s.bestSet.rpe)
    .filter((rpe): rpe is number => rpe !== null);
  if (rpes.length === 0) return null;
  return rpes.reduce((a, b) => a + b, 0) / rpes.length;
}

export function calculateProgressionSuggestion(
  sessions: ExerciseSession[],
  targetRepRange?: string,
  preferredUnit?: WeightUnit
): { lastSession: GhostSetData; suggestion: ProgressionSuggestion } | null {
  if (sessions.length === 0) return null;

  const normalizedSessions = preferredUnit
    ? sessions.map((session) => convertSessionToUnit(session, preferredUnit))
    : sessions;

  const lastSession = normalizedSessions[0];
  const { bestSet } = lastSession;
  const repRange = parseRepRange(targetRepRange);

  const sessionsAtWeight = sessionsAtSameWeight(normalizedSessions);
  const consecutiveSessionsAtWeight = sessionsAtWeight.length;

  const sessionsHittingTarget = repRange
    ? sessionsAtWeight.filter((s) => sessionHitTopOfRepRange(s, repRange))
    : [];
  const consecutiveTargetHits = sessionsHittingTarget.length;

  const sessionsAtWeightAndReps = sessionsAtSameWeightAndReps(normalizedSessions);
  const consecutiveAtWeightAndReps = sessionsAtWeightAndReps.length;

  const avgRpe = getAvgRpe(sessionsAtWeight.slice(0, 3));
  const lastRpe = bestSet.rpe;
  const hasAnyRpeData = avgRpe !== null || lastRpe !== null;

  const recentRpes = normalizedSessions
    .slice(0, 3)
    .map((s) => s.bestSet.rpe)
    .filter((rpe): rpe is number => rpe !== null);
  const hasMaxRpe = recentRpes.length >= 2 && recentRpes.filter((rpe) => rpe === 10).length >= 2;
  const hasHighRpe = recentRpes.some((rpe) => rpe >= 9);

  let suggestionType: ProgressionSuggestion["type"];
  let targetWeight: number | null = null;
  let targetReps: number | null = null;
  let reasoning: string | null = null;

  if (hasMaxRpe) {
    suggestionType = "deload";
    targetWeight = roundWeight(bestSet.weight * 0.9, bestSet.unit);
    targetReps = repRange?.min ?? bestSet.reps;
    reasoning = "RPE at 10 for multiple sessions. Reduce weight 10% to recover.";
  } else if (consecutiveTargetHits >= 2 && (!avgRpe || avgRpe <= 8)) {
    suggestionType = "increase_weight";
    const increase = bestSet.unit === "kg" ? 2.5 : 5;
    targetWeight = bestSet.weight + increase;
    targetReps = repRange?.min ?? bestSet.reps;
    reasoning = `Hit ${repRange?.max} reps for ${consecutiveTargetHits} sessions. Ready to add weight.`;
  } else if (consecutiveSessionsAtWeight >= 2 && avgRpe !== null && avgRpe <= 6) {
    suggestionType = "increase_weight";
    const increase = bestSet.unit === "kg" ? 2.5 : 5;
    targetWeight = bestSet.weight + increase;
    targetReps = repRange?.min ?? bestSet.reps;
    reasoning = `Average RPE ${avgRpe.toFixed(1)} — too easy. Add weight.`;
  } else if (!hasAnyRpeData && consecutiveAtWeightAndReps >= 2) {
    suggestionType = "increase_weight";
    const increase = bestSet.unit === "kg" ? 2.5 : 5;
    targetWeight = bestSet.weight + increase;
    targetReps = bestSet.reps;
    reasoning = `Completed ${bestSet.reps} reps for ${consecutiveAtWeightAndReps} sessions. Try adding weight.`;
  } else if (hasHighRpe) {
    suggestionType = "hold";
    targetWeight = bestSet.weight;
    targetReps = bestSet.reps;
    reasoning = "High RPE detected. Focus on form and recovery.";
  } else if (repRange && bestSet.reps < repRange.max) {
    suggestionType = "increase_reps";
    targetWeight = bestSet.weight;
    targetReps = Math.min(bestSet.reps + 1, repRange.max);
    reasoning = `Work toward ${repRange.max} reps before adding weight.`;
  } else if (consecutiveSessionsAtWeight >= 2) {
    suggestionType = "increase_reps";
    targetWeight = bestSet.weight;
    targetReps = bestSet.reps + 1;
    const rpeNote = avgRpe ? ` (avg RPE ${avgRpe.toFixed(1)})` : "";
    reasoning = `${consecutiveSessionsAtWeight} sessions at this weight${rpeNote}. Push for more reps.`;
  } else {
    suggestionType = "hold";
    targetWeight = bestSet.weight;
    targetReps = bestSet.reps;
    reasoning = lastRpe
      ? `Last session RPE ${lastRpe}. Build consistency at this weight.`
      : "Build consistency at this weight.";
  }

  return {
    lastSession: {
      weight: bestSet.weight,
      reps: bestSet.reps,
      rpe: bestSet.rpe,
      date: lastSession.date,
      unit: bestSet.unit,
    },
    suggestion: {
      type: suggestionType,
      targetWeight,
      targetReps,
      reasoning,
    },
  };
}
