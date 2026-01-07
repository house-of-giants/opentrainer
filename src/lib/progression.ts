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

export function calculateProgressionSuggestion(
  sessions: ExerciseSession[]
): { lastSession: GhostSetData; suggestion: ProgressionSuggestion } | null {
  if (sessions.length === 0) return null;

  const lastSession = sessions[0];
  const { bestSet } = lastSession;

  const recentRpes = sessions
    .slice(0, 3)
    .map((s) => s.bestSet.rpe)
    .filter((rpe): rpe is number => rpe !== null);

  const avgRpe = recentRpes.length > 0
    ? recentRpes.reduce((a, b) => a + b, 0) / recentRpes.length
    : null;

  const hasConsistentLowRpe = recentRpes.length >= 2 && recentRpes.every((rpe) => rpe <= 7);
  const hasConsistentMidRpe = recentRpes.length >= 2 && recentRpes.every((rpe) => rpe === 8);
  const hasHighRpe = recentRpes.some((rpe) => rpe >= 9);
  const hasMaxRpe = recentRpes.length >= 2 && recentRpes.filter((rpe) => rpe === 10).length >= 2;

  let suggestionType: ProgressionSuggestion["type"];
  let targetWeight: number | null = null;
  let targetReps: number | null = null;
  let reasoning: string | null = null;

  if (hasMaxRpe) {
    suggestionType = "deload";
    targetWeight = roundWeight(bestSet.weight * 0.9, bestSet.unit);
    targetReps = bestSet.reps;
    reasoning = "RPE consistently at 10. Reduce weight by 10% to recover.";
  } else if (hasHighRpe) {
    suggestionType = "hold";
    targetWeight = bestSet.weight;
    targetReps = bestSet.reps;
    reasoning = "High RPE detected. Maintain current weight and reps.";
  } else if (hasConsistentLowRpe) {
    suggestionType = "increase_weight";
    const increase = bestSet.unit === "kg" ? 1.025 : 1.05;
    targetWeight = roundWeight(bestSet.weight * increase, bestSet.unit);
    targetReps = bestSet.reps;
    reasoning = "RPE ≤7 for recent sessions. Ready to increase weight.";
  } else if (hasConsistentMidRpe) {
    suggestionType = "increase_reps";
    targetWeight = bestSet.weight;
    targetReps = bestSet.reps + 1;
    reasoning = "RPE at 8. Try adding 1-2 reps before increasing weight.";
  } else {
    suggestionType = "hold";
    targetWeight = bestSet.weight;
    targetReps = bestSet.reps;
    reasoning = avgRpe
      ? `Average RPE: ${avgRpe.toFixed(1)}. Continue building consistency.`
      : null;
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
