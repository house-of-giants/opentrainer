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
  repRange: { min: number; max: number }
): boolean {
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

function calculateRuleBasedProgression(
  sessions: ExerciseSession[],
  exerciseName: string,
  targetRepRange?: string
): ProgressionSuggestion | null {
  if (sessions.length === 0) return null;

  const lastSession = sessions[0];
  const { bestSet } = lastSession;
  const repRange = parseRepRange(targetRepRange);

  const sessionsAtWeight = sessionsAtSameWeight(sessions);
  const consecutiveSessionsAtWeight = sessionsAtWeight.length;

  const sessionsHittingTarget = repRange
    ? sessionsAtWeight.filter((s) => sessionHitTopOfRepRange(s, repRange))
    : [];
  const consecutiveTargetHits = sessionsHittingTarget.length;

  const sessionsAtWeightAndReps = sessionsAtSameWeightAndReps(sessions);
  const consecutiveAtWeightAndReps = sessionsAtWeightAndReps.length;

  const avgRpe = getAvgRpe(sessionsAtWeight.slice(0, 3));
  const lastRpe = bestSet.rpe;
  const hasAnyRpeData = avgRpe !== null || lastRpe !== null;

  const recentRpes = sessions
    .slice(0, 3)
    .map((s) => s.bestSet.rpe)
    .filter((rpe): rpe is number => rpe !== null);
  const hasMaxRpe = recentRpes.length >= 2 && recentRpes.filter((rpe) => rpe === 10).length >= 2;
  const hasHighRpe = recentRpes.some((rpe) => rpe >= 9);

  let suggestionType: "increase_weight" | "increase_reps" | "hold" | "deload";
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
    targetRepRange: v.optional(v.string()),
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
      return calculateRuleBasedProgression(sessions, args.exerciseName, args.targetRepRange);
    }

    const rateLimitCheck = await ctx.runQuery(internal.ai.rateLimitQueries.checkAIRateLimit, {
      userId: user._id,
      actionType: "progression",
    }) as { allowed: boolean; remaining: number };
    if (!rateLimitCheck.allowed) {
      return calculateRuleBasedProgression(sessions, args.exerciseName, args.targetRepRange);
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
      targetRepRange: args.targetRepRange,
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
      return calculateRuleBasedProgression(sessions, args.exerciseName, args.targetRepRange);
    }
  },
});
