import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./auth";

const routineExerciseValidator = v.object({
  exerciseId: v.optional(v.id("exercises")),
  exerciseName: v.string(),
  kind: v.union(v.literal("lifting"), v.literal("cardio")),
  targetSets: v.optional(v.number()),
  targetReps: v.optional(v.string()),
  targetRpe: v.optional(v.number()),
  targetDuration: v.optional(v.number()),
  targetIntensity: v.optional(v.number()),
  notes: v.optional(v.string()),
});

const routineDayValidator = v.object({
  name: v.string(),
  exercises: v.array(routineExerciseValidator),
});

export const createRoutine = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    source: v.union(v.literal("manual"), v.literal("ai_generated"), v.literal("imported")),
    days: v.array(routineDayValidator),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const now = Date.now();

    const routineId = await ctx.db.insert("routines", {
      userId: user._id,
      name: args.name,
      description: args.description,
      source: args.source,
      days: args.days,
      tags: args.tags,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return routineId;
  },
});

export const createRoutineFromWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
    name: v.string(),
    dayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== user._id) {
      throw new Error("Workout not found or not authorized");
    }

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_workout", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    const exerciseMap = new Map<string, { kind: "lifting" | "cardio"; sets: number }>();
    
    for (const entry of entries) {
      const existing = exerciseMap.get(entry.exerciseName);
      if (!existing) {
        exerciseMap.set(entry.exerciseName, { kind: entry.kind, sets: 1 });
      } else {
        exerciseMap.set(entry.exerciseName, { ...existing, sets: existing.sets + 1 });
      }
    }

    const exercises = Array.from(exerciseMap.entries()).map(([name, data]) => ({
      exerciseName: name,
      kind: data.kind,
      targetSets: data.kind === "lifting" ? data.sets : undefined,
      targetReps: data.kind === "lifting" ? "8-12" : undefined,
      targetDuration: data.kind === "cardio" ? 15 : undefined,
    }));

    const now = Date.now();

    const routineId = await ctx.db.insert("routines", {
      userId: user._id,
      name: args.name,
      source: "manual",
      days: [
        {
          name: args.dayName ?? args.name,
          exercises,
        },
      ],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return routineId;
  },
});

export const getRoutines = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) {
      return [];
    }

    if (args.activeOnly) {
      return await ctx.db
        .query("routines")
        .withIndex("by_user_active", (q) => q.eq("userId", user._id).eq("isActive", true))
        .collect();
    }

    return await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getRoutine = query({
  args: { routineId: v.id("routines") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) {
      return null;
    }

    const routine = await ctx.db.get(args.routineId);
    if (!routine || routine.userId !== user._id) {
      return null;
    }

    return routine;
  },
});

export const updateRoutine = mutation({
  args: {
    routineId: v.id("routines"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    days: v.optional(v.array(routineDayValidator)),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const routine = await ctx.db.get(args.routineId);
    if (!routine || routine.userId !== user._id) {
      throw new Error("Routine not found or not authorized");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.days !== undefined) updates.days = args.days;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.routineId, updates);

    return args.routineId;
  },
});

export const importRoutineFromJson = mutation({
  args: {
    json: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    let parsed: unknown;
    try {
      parsed = JSON.parse(args.json);
    } catch {
      throw new Error("Invalid JSON format");
    }

    const data = parsed as {
      version?: number;
      name?: string;
      description?: string;
      days?: Array<{
        name?: string;
        exercises?: Array<{
          name?: string;
          kind?: string;
          targetSets?: number;
          targetReps?: string;
          targetRpe?: number;
          targetDuration?: number;
          targetIntensity?: number;
          notes?: string;
        }>;
      }>;
    };

    if (!data.name || typeof data.name !== "string") {
      throw new Error("Missing or invalid routine name");
    }

    if (!data.days || !Array.isArray(data.days) || data.days.length === 0) {
      throw new Error("Routine must have at least one day");
    }

    const days = data.days.map((day, dayIdx) => {
      if (!day.name || typeof day.name !== "string") {
        throw new Error(`Day ${dayIdx + 1} is missing a name`);
      }

      if (!day.exercises || !Array.isArray(day.exercises)) {
        throw new Error(`Day "${day.name}" must have exercises array`);
      }

      const exercises = day.exercises.map((ex, exIdx) => {
        if (!ex.name || typeof ex.name !== "string") {
          throw new Error(`Exercise ${exIdx + 1} in "${day.name}" is missing a name`);
        }

        const kind = ex.kind === "cardio" ? "cardio" : "lifting";

        return {
          exerciseName: ex.name,
          kind: kind as "lifting" | "cardio",
          targetSets: typeof ex.targetSets === "number" ? ex.targetSets : undefined,
          targetReps: typeof ex.targetReps === "string" ? ex.targetReps : undefined,
          targetRpe: typeof ex.targetRpe === "number" ? ex.targetRpe : undefined,
          targetDuration: typeof ex.targetDuration === "number" ? ex.targetDuration : undefined,
          targetIntensity: typeof ex.targetIntensity === "number" ? ex.targetIntensity : undefined,
          notes: typeof ex.notes === "string" ? ex.notes : undefined,
        };
      });

      return {
        name: day.name,
        exercises,
      };
    });

    const now = Date.now();

    const routineId = await ctx.db.insert("routines", {
      userId: user._id,
      name: data.name,
      description: data.description,
      source: "imported",
      days,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return routineId;
  },
});

export const deleteRoutine = mutation({
  args: { routineId: v.id("routines") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const routine = await ctx.db.get(args.routineId);
    if (!routine || routine.userId !== user._id) {
      throw new Error("Routine not found or not authorized");
    }

    await ctx.db.delete(args.routineId);

    return args.routineId;
  },
});

export const importDayToRoutine = mutation({
  args: {
    routineId: v.id("routines"),
    json: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const routine = await ctx.db.get(args.routineId);
    if (!routine || routine.userId !== user._id) {
      throw new Error("Routine not found or not authorized");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(args.json);
    } catch {
      throw new Error("Invalid JSON format");
    }

    const data = parsed as {
      name?: string;
      exercises?: Array<{
        name?: string;
        kind?: string;
        targetSets?: number;
        targetReps?: string;
        targetRpe?: number;
        targetDuration?: number;
        targetIntensity?: number;
        notes?: string;
      }>;
    };

    if (!data.name || typeof data.name !== "string") {
      throw new Error("Missing or invalid day name");
    }

    if (!data.exercises || !Array.isArray(data.exercises) || data.exercises.length === 0) {
      throw new Error("Day must have at least one exercise");
    }

    const exercises = data.exercises.map((ex, exIdx) => {
      if (!ex.name || typeof ex.name !== "string") {
        throw new Error(`Exercise ${exIdx + 1} is missing a name`);
      }

      const kind = ex.kind === "cardio" ? "cardio" : "lifting";

      return {
        exerciseName: ex.name,
        kind: kind as "lifting" | "cardio",
        targetSets: typeof ex.targetSets === "number" ? ex.targetSets : undefined,
        targetReps: typeof ex.targetReps === "string" ? ex.targetReps : undefined,
        targetRpe: typeof ex.targetRpe === "number" ? ex.targetRpe : undefined,
        targetDuration: typeof ex.targetDuration === "number" ? ex.targetDuration : undefined,
        targetIntensity: typeof ex.targetIntensity === "number" ? ex.targetIntensity : undefined,
        notes: typeof ex.notes === "string" ? ex.notes : undefined,
      };
    });

    const newDay = {
      name: data.name,
      exercises,
    };

    const updatedDays = [...routine.days, newDay];

    await ctx.db.patch(args.routineId, {
      days: updatedDays,
      updatedAt: Date.now(),
    });

    return { routineId: args.routineId, dayIndex: updatedDays.length - 1 };
  },
});
