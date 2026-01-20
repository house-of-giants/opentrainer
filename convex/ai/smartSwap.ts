"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { callGemini } from "./gemini";
import { SMART_SWAP_SYSTEM_PROMPT } from "./prompts";
import type { Doc, Id } from "../_generated/dataModel";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SmartSwapResponse {
  alternatives: Array<{
    exercise: string;
    reasoning: string;
    equipmentNeeded: string[];
    muscleEmphasis: string;
    difficultyAdjustment?: "easier" | "similar" | "harder";
  }>;
  note?: string;
  swapId?: Id<"exerciseSwaps">;
}

interface SmartSwapPayload {
  eq: string[];
  curr: {
    ex: string;
    muscles: string[];
    equip: string;
    recent: Array<{ wt: number; reps: number; rpe: number }>;
  };
  reason: "busy" | "unavail" | "pain" | "variety";
  recentVol?: Array<{ m: string; s: number }>;
  swapCount?: number;
}

export const getAlternatives = action({
  args: {
    workoutId: v.id("workouts"),
    exerciseName: v.string(),
    reason: v.union(
      v.literal("equipment_busy"),
      v.literal("equipment_unavailable"),
      v.literal("discomfort"),
      v.literal("variety")
    ),
  },
  handler: async (ctx, args): Promise<SmartSwapResponse> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    }) as Doc<"users"> | null;
    if (!user) throw new Error("User not found");
    if (user.tier !== "pro") throw new Error("Pro subscription required");

    const rateLimitCheck = await ctx.runQuery(internal.ai.rateLimitQueries.checkAIRateLimit, {
      userId: user._id,
      actionType: "smartSwap",
    }) as { allowed: boolean; remaining: number };
    if (!rateLimitCheck.allowed) {
      throw new Error(
        `Rate limit exceeded. You've used all 30 Smart Swap requests for today. Try again tomorrow.`
      );
    }

    const exerciseContext = await ctx.runQuery(
      internal.ai.aggregators.getExerciseContext,
      {
        userId: user._id,
        exerciseName: args.exerciseName,
      }
    ) as { muscleGroups: string[]; equipment: string; recentSessions: Array<{ wt: number; reps: number; rpe: number }> };

    const recentVolume = await ctx.runQuery(
      internal.ai.aggregators.getRecentMuscleVolume,
      {
        userId: user._id,
        days: 7,
      }
    ) as Array<{ m: string; s: number }>;

    const swapHistory = await ctx.runQuery(
      internal.ai.aggregators.getSwapHistory,
      {
        userId: user._id,
        exerciseName: args.exerciseName,
      }
    ) as Doc<"exerciseSwaps">[];

    const payload: SmartSwapPayload = {
      eq: user.equipment ?? [],
      curr: {
        ex: args.exerciseName,
        muscles: exerciseContext.muscleGroups,
        equip: exerciseContext.equipment,
        recent: exerciseContext.recentSessions,
      },
      reason:
        args.reason === "equipment_busy"
          ? "busy"
          : args.reason === "equipment_unavailable"
            ? "unavail"
            : args.reason === "discomfort"
              ? "pain"
              : "variety",
      recentVol: recentVolume,
    };

    if (swapHistory.length > 0 && args.reason === "discomfort") {
      payload.swapCount = swapHistory.length;
    }

    const response = await callGemini({
      systemPrompt: SMART_SWAP_SYSTEM_PROMPT,
      userMessage: JSON.stringify(payload),
      responseFormat: "json",
    });

    const result = JSON.parse(response.text) as SmartSwapResponse;

    const swapId = await ctx.runMutation((internal.ai as any).swapMutations.recordSwap, {
      userId: user._id,
      workoutId: args.workoutId,
      originalExercise: args.exerciseName,
      reason: args.reason,
      originalMuscleGroups: exerciseContext.muscleGroups,
      originalEquipment: exerciseContext.equipment,
    });

    return {
      ...result,
      swapId,
    };
  },
});
