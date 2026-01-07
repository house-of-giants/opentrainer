"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { callGemini } from "./gemini";
import { PROGRESSION_PROMPT } from "./prompts";
import type { ProgressionSuggestion } from "./trainingLabTypes";
import type { Doc } from "../_generated/dataModel";

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

function roundWeight(weight: number, unit: "kg" | "lb"): number {
  const increment = unit === "kg" ? 1 : 2.5;
  return Math.round(weight / increment) * increment;
}

function calculateRuleBasedProgression(
  sessions: ExerciseSession[],
  exerciseName: string
): ProgressionSuggestion | null {
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

  let suggestionType: "increase_weight" | "increase_reps" | "hold" | "deload";
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
      ? `Average RPE: ${avgRpe.toFixed(1)}. Continue building consistency.` : null;
  }

  return {
    exerciseName,
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

export const getProgressionSuggestion = action({
  args: {
    exerciseName: v.string(),
    useAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<ProgressionSuggestion | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    }) as Doc<"users"> | null;
    if (!user) return null;

    const sessions = await ctx.runQuery(internal.entries.getExerciseHistoryInternal, {
      userId: user._id,
      exerciseName: args.exerciseName,
      sessionCount: 3,
    }) as ExerciseSession[];

    if (sessions.length === 0) return null;

    const useAI = args.useAI && user.tier === "pro";

    if (!useAI) {
      return calculateRuleBasedProgression(sessions, args.exerciseName);
    }

    const payload = {
      exercise: args.exerciseName,
      history: sessions.map((s) => ({
        weight: s.bestSet.weight,
        reps: s.bestSet.reps,
        rpe: s.bestSet.rpe,
        date: s.date,
        unit: s.bestSet.unit,
      })),
      goals: user.goals ?? [],
    };

    try {
      const response = await callGemini({
        systemPrompt: PROGRESSION_PROMPT,
        userMessage: JSON.stringify(payload),
        responseFormat: "json",
        maxTokens: 256,
      });

      const aiSuggestion = JSON.parse(response.text) as {
        suggestion: {
          type: "increase_weight" | "increase_reps" | "hold" | "deload";
          targetWeight: number | null;
          targetReps: number | null;
          reasoning: string;
        };
      };

      const lastSession = sessions[0];
      return {
        exerciseName: args.exerciseName,
        lastSession: {
          weight: lastSession.bestSet.weight,
          reps: lastSession.bestSet.reps,
          rpe: lastSession.bestSet.rpe,
          date: lastSession.date,
          unit: lastSession.bestSet.unit,
        },
        suggestion: aiSuggestion.suggestion,
      };
    } catch {
      return calculateRuleBasedProgression(sessions, args.exerciseName);
    }
  },
});
