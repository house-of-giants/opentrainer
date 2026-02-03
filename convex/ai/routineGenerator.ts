"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { callGemini } from "./gemini";
import { ROUTINE_GENERATOR_PROMPT, ROUTINE_SWAP_SYSTEM_PROMPT } from "./prompts";
import type { Doc } from "../_generated/dataModel";
import { createConvexLogger, truncateId } from "../lib/logger";

export interface RoutineSwapAlternative {
  exercise: string;
  reasoning: string;
  equipmentNeeded: string[];
  difficultyAdjustment: "easier" | "similar" | "harder";
}

export interface RoutineSwapResponse {
  alternatives: RoutineSwapAlternative[];
}

const MAX_ADDITIONAL_NOTES_LENGTH = 200;

export interface GeneratedRoutineDay {
  name: string;
  focus: string;
  exercises: Array<{
    exerciseName: string;
    kind: "lifting" | "cardio" | "mobility";
    targetSets: number;
    targetReps: string;
    notes?: string;
  }>;
}

export interface GeneratedRoutine {
  name: string;
  description: string;
  days: GeneratedRoutineDay[];
  weeklyStructure: string;
  rationale: string;
}

interface RoutineGeneratorPayload {
  profile: {
    goals: string[];
    experience: string;
    equipment: string[];
    daysPerWeek: number;
    sessionMinutes: number;
    bodyweight?: number;
    unit?: string;
  };
  request: {
    splitType: "ppl" | "upper_lower" | "full_body" | "bro_split" | "ai_decide";
    primaryGoal: "strength" | "hypertrophy" | "both";
    additionalNotes?: string;
  };
}

export const generateRoutine = action({
  args: {
    splitType: v.union(
      v.literal("ppl"),
      v.literal("upper_lower"),
      v.literal("full_body"),
      v.literal("bro_split"),
      v.literal("ai_decide")
    ),
    primaryGoal: v.union(
      v.literal("strength"),
      v.literal("hypertrophy"),
      v.literal("both")
    ),
    daysPerWeek: v.optional(v.number()),
    additionalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GeneratedRoutine> => {
    const logger = createConvexLogger("ai.generateRoutine");
    logger.set({
      ai: { action: "routineGeneration", model: "gemini" },
      request: { splitType: args.splitType, primaryGoal: args.primaryGoal },
    });

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      logger.fail(new Error("Unauthorized"));
      throw new Error("Unauthorized");
    }

    const user = (await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    })) as Doc<"users"> | null;
    if (!user) {
      logger.fail(new Error("User not found"));
      throw new Error("User not found");
    }

    logger.set({
      user: {
        id: truncateId(user._id),
        tier: user.tier,
        experienceLevel: user.experienceLevel,
      },
    });

    if (user.tier !== "pro") {
      logger.fail(new Error("Pro subscription required"));
      throw new Error("Pro subscription required");
    }

    const rateLimitCheck = await ctx.runQuery(internal.ai.rateLimitQueries.checkAIRateLimit, {
      userId: user._id,
      actionType: "routineGeneration",
    }) as { allowed: boolean; remaining: number };

    logger.set({ ai: { rateLimitRemaining: rateLimitCheck.remaining } });

    if (!rateLimitCheck.allowed) {
      logger.rateLimited("routineGeneration", rateLimitCheck.remaining);
      throw new Error(
        `Rate limit exceeded. You've used all 10 routine generation requests for today. Try again tomorrow.`
      );
    }

    const sanitizedNotes = args.additionalNotes
      ?.slice(0, MAX_ADDITIONAL_NOTES_LENGTH)
      .trim();

    const payload: RoutineGeneratorPayload = {
      profile: {
        goals: user.goals ?? ["general_fitness"],
        experience: user.experienceLevel ?? "intermediate",
        equipment: user.equipment ?? [],
        daysPerWeek: args.daysPerWeek ?? user.weeklyAvailability ?? 4,
        sessionMinutes: user.sessionDuration ?? 60,
        bodyweight: user.bodyweight,
        unit: user.bodyweightUnit ?? user.preferredUnits ?? "lb",
      },
      request: {
        splitType: args.splitType,
        primaryGoal: args.primaryGoal,
        additionalNotes: sanitizedNotes || undefined,
      },
    };

    const startTime = Date.now();
    const response = await callGemini({
      systemPrompt: ROUTINE_GENERATOR_PROMPT,
      userMessage: JSON.stringify(payload),
      responseFormat: "json",
      maxTokens: 2048,
    });
    const latencyMs = Date.now() - startTime;

    logger.set({
      ai: {
        latencyMs,
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
    });

    const result = JSON.parse(response.text) as GeneratedRoutine;

    if (!result.name || typeof result.name !== "string") {
      logger.fail(new Error("Invalid routine: missing name"));
      throw new Error("Invalid routine: missing name");
    }
    if (!Array.isArray(result.days) || result.days.length === 0) {
      logger.fail(new Error("Invalid routine: missing days"));
      throw new Error("Invalid routine: missing days");
    }

    for (const day of result.days) {
      if (!day.name || !Array.isArray(day.exercises)) {
        logger.fail(new Error("Invalid routine: malformed day structure"));
        throw new Error("Invalid routine: malformed day structure");
      }
      for (const exercise of day.exercises) {
        if (
          !exercise.exerciseName ||
          exercise.exerciseName.length > 100 ||
          /[<>{}\\]/.test(exercise.exerciseName)
        ) {
          logger.fail(new Error("Invalid routine: malformed exercise name"));
          throw new Error("Invalid routine: malformed exercise name");
        }
        if (!["lifting", "cardio", "mobility"].includes(exercise.kind)) {
          exercise.kind = "lifting";
        }
        if (
          typeof exercise.targetSets !== "number" ||
          exercise.targetSets < 1 ||
          exercise.targetSets > 10
        ) {
          exercise.targetSets = 3;
        }
        if (typeof exercise.targetReps !== "string") {
          exercise.targetReps = "8-12";
        }
      }
    }

    logger.success({
      routine: {
        name: result.name,
        daysCount: result.days.length,
        exerciseCount: result.days.reduce((sum, d) => sum + d.exercises.length, 0),
      },
    });

    return result;
  },
});

export const getRoutineSwapAlternatives = action({
  args: {
    exerciseName: v.string(),
    reason: v.union(
      v.literal("equipment"),
      v.literal("discomfort"),
      v.literal("preference")
    ),
    dayContext: v.optional(v.array(v.string())),
    userNotes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<RoutineSwapResponse> => {
    const logger = createConvexLogger("ai.getRoutineSwapAlternatives");
    logger.set({
      ai: { action: "routineSwap", model: "gemini" },
      request: { exercise: args.exerciseName, reason: args.reason },
    });

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      logger.fail(new Error("Unauthorized"));
      throw new Error("Unauthorized");
    }

    const user = (await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    })) as Doc<"users"> | null;
    if (!user) {
      logger.fail(new Error("User not found"));
      throw new Error("User not found");
    }

    logger.set({ user: { id: truncateId(user._id), tier: user.tier } });

    if (user.tier !== "pro") {
      logger.fail(new Error("Pro subscription required"));
      throw new Error("Pro subscription required");
    }

    const rateLimitCheck = await ctx.runQuery(internal.ai.rateLimitQueries.checkAIRateLimit, {
      userId: user._id,
      actionType: "routineGeneration",
    }) as { allowed: boolean; remaining: number };

    logger.set({ ai: { rateLimitRemaining: rateLimitCheck.remaining } });

    if (!rateLimitCheck.allowed) {
      logger.rateLimited("routineSwap", rateLimitCheck.remaining);
      throw new Error(
        `Rate limit exceeded. You've used all 10 routine swap requests for today. Try again tomorrow.`
      );
    }

    const sanitizedNotes = args.userNotes?.slice(0, 200).trim();

    const payload = {
      exercise: args.exerciseName,
      reason: args.reason,
      equipment: user.equipment ?? [],
      dayExercises: args.dayContext ?? [],
      userNotes: sanitizedNotes,
    };

    const startTime = Date.now();
    const response = await callGemini({
      systemPrompt: ROUTINE_SWAP_SYSTEM_PROMPT,
      userMessage: JSON.stringify(payload),
      responseFormat: "json",
      maxTokens: 512,
    });
    const latencyMs = Date.now() - startTime;

    logger.set({
      ai: {
        latencyMs,
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
    });

    const result = JSON.parse(response.text) as RoutineSwapResponse;

    if (!Array.isArray(result.alternatives)) {
      logger.fail(new Error("Invalid swap response"));
      throw new Error("Invalid swap response");
    }

    for (const alt of result.alternatives) {
      if (
        !alt.exercise ||
        alt.exercise.length > 100 ||
        /[<>{}\\]/.test(alt.exercise)
      ) {
        logger.fail(new Error("Invalid alternative exercise name"));
        throw new Error("Invalid alternative exercise name");
      }
    }

    logger.success({
      swap: {
        originalExercise: args.exerciseName,
        alternativesCount: result.alternatives.length,
      },
    });

    return result;
  },
});
