import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./auth";

const routineExerciseValidator = v.object({
  exerciseId: v.optional(v.id("exercises")),
  exerciseName: v.string(),
  kind: v.union(v.literal("lifting"), v.literal("cardio"), v.literal("mobility")),
  targetSets: v.optional(v.number()),
  targetReps: v.optional(v.string()),
  targetRpe: v.optional(v.number()),
  targetDuration: v.optional(v.number()),
  targetIntensity: v.optional(v.number()),
  targetHoldSeconds: v.optional(v.number()),
  perSide: v.optional(v.boolean()),
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

    const exerciseMap = new Map<string, { kind: "lifting" | "cardio" | "mobility"; sets: number }>();
    
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
      targetSets: data.kind === "lifting" ? data.sets : (data.kind === "mobility" ? data.sets : undefined),
      targetReps: data.kind === "lifting" ? "8-12" : undefined,
      targetDuration: data.kind === "cardio" ? 15 : undefined,
      targetHoldSeconds: data.kind === "mobility" ? 30 : undefined,
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
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      throw new Error(
        `Invalid JSON format. Please check your JSON is valid.\n\nError details: ${errorMsg}\n\nTip: Copy the entire JSON from the export dialog, or use the example format.`
      );
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid input: Expected a JSON object, but got something else. Make sure you're pasting valid JSON.");
    }

    const data = parsed as {
      version?: number;
      exportType?: string;
      name?: string;
      description?: string;
      workout?: {
        title?: string;
        exercises?: Array<{
          name?: string;
          kind?: string;
          sets?: Array<{
            weight?: number;
            reps?: number;
            rpe?: number;
            isWarmup?: boolean;
          }>;
          cardio?: unknown;
        }>;
      };
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
          targetHoldSeconds?: number;
          perSide?: boolean;
          notes?: string;
        }>;
      }>;
    };

    // Handle workout export format by converting to routine format
    if (data.exportType === "workout" && data.workout?.exercises) {
      const workoutExercises = data.workout.exercises.map((ex) => {
        if (!ex.name || typeof ex.name !== "string") {
          throw new Error(
            "Workout export contains an exercise without a name. This might be corrupted. Try exporting the workout again."
          );
        }

        const kind = ex.kind === "cardio" ? "cardio" : (ex.kind === "mobility" ? "mobility" : "lifting");
        
        const exercise: {
          name: string;
          kind: string;
          targetSets?: number;
          targetReps?: string;
          targetRpe?: number;
          targetDuration?: number;
        } = {
          name: ex.name,
          kind,
        };

        if (kind === "lifting" && ex.sets && Array.isArray(ex.sets)) {
          // Calculate averages from actual sets (excluding warmups)
          const workingSets = ex.sets.filter((s) => !s.isWarmup);
          if (workingSets.length > 0) {
            exercise.targetSets = workingSets.length;
            const avgReps = Math.round(
              workingSets.reduce((sum, s) => sum + (s.reps ?? 0), 0) / workingSets.length
            );
            exercise.targetReps = avgReps > 0 ? `${avgReps}` : "8-12";
            const rpes = workingSets.map((s) => s.rpe).filter((r) => r !== undefined);
            if (rpes.length > 0) {
              exercise.targetRpe = Math.round(
                rpes.reduce((sum, r) => sum + (r ?? 0), 0) / rpes.length
              );
            }
          } else {
            exercise.targetSets = ex.sets.length;
            exercise.targetReps = "8-12";
          }
        } else if (kind === "cardio") {
          exercise.targetDuration = 15; // Default cardio duration
        }

        return exercise;
      });

      // Convert workout to single-day routine
      data.days = [
        {
          name: data.workout.title ?? data.name ?? "Workout Day",
          exercises: workoutExercises,
        },
      ];
    }

    if (!data.name || typeof data.name !== "string") {
      throw new Error(
        `Missing routine name. Your JSON must include a "name" field.\n\nExample:\n{\n  "name": "My Routine",\n  "days": [...]\n}`
      );
    }

    if (!data.days || !Array.isArray(data.days)) {
      throw new Error(
        `Missing or invalid "days" field. Your routine must have a "days" array.\n\nExample:\n{\n  "name": "My Routine",\n  "days": [\n    { "name": "Day 1", "exercises": [...] }\n  ]\n}`
      );
    }

    if (data.days.length === 0) {
      throw new Error("Routine must have at least one day. Add at least one day with exercises to your routine.");
    }

    const days = data.days.map((day, dayIdx) => {
      if (!day.name || typeof day.name !== "string") {
        throw new Error(
          `Day ${dayIdx + 1} is missing a name. Each day must have a "name" field.\n\nExample:\n{ "name": "Push Day", "exercises": [...] }`
        );
      }

      if (!day.exercises || !Array.isArray(day.exercises)) {
        throw new Error(
          `Day "${day.name}" must have an "exercises" array.\n\nExample:\n{\n  "name": "${day.name}",\n  "exercises": [\n    { "name": "Bench Press", "kind": "lifting", "targetSets": 4, "targetReps": "8-10" }\n  ]\n}`
        );
      }

      if (day.exercises.length === 0) {
        throw new Error(`Day "${day.name}" has no exercises. Each day must have at least one exercise.`);
      }

      const exercises = day.exercises.map((ex, exIdx) => {
        if (!ex.name || typeof ex.name !== "string") {
          throw new Error(
            `Exercise ${exIdx + 1} in "${day.name}" is missing a name.\n\nEach exercise must have a "name" field.\n\nExample: { "name": "Bench Press", "kind": "lifting", "targetSets": 4 }`
          );
        }

        const kind = ex.kind === "cardio" ? "cardio" : (ex.kind === "mobility" ? "mobility" : "lifting");

        return {
          exerciseName: ex.name,
          kind: kind as "lifting" | "cardio" | "mobility",
          targetSets: typeof ex.targetSets === "number" ? ex.targetSets : undefined,
          targetReps: typeof ex.targetReps === "string" ? ex.targetReps : undefined,
          targetRpe: typeof ex.targetRpe === "number" ? ex.targetRpe : undefined,
          targetDuration: typeof ex.targetDuration === "number" ? ex.targetDuration : undefined,
          targetIntensity: typeof ex.targetIntensity === "number" ? ex.targetIntensity : undefined,
          targetHoldSeconds: typeof ex.targetHoldSeconds === "number" ? ex.targetHoldSeconds : undefined,
          perSide: typeof ex.perSide === "boolean" ? ex.perSide : undefined,
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
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      throw new Error(
        `Invalid JSON format. Please check your JSON is valid.\n\nError details: ${errorMsg}\n\nTip: Copy the entire JSON from the export dialog, or use the example format.`
      );
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid input: Expected a JSON object, but got something else. Make sure you're pasting valid JSON.");
    }

    const data = parsed as {
      exportType?: string;
      name?: string;
      workout?: {
        title?: string;
        exercises?: Array<{
          name?: string;
          kind?: string;
          sets?: Array<{
            weight?: number;
            reps?: number;
            rpe?: number;
            isWarmup?: boolean;
          }>;
          cardio?: unknown;
        }>;
      };
      exercises?: Array<{
        name?: string;
        kind?: string;
        targetSets?: number;
        targetReps?: string;
        targetRpe?: number;
        targetDuration?: number;
        targetIntensity?: number;
        targetHoldSeconds?: number;
        perSide?: boolean;
        notes?: string;
      }>;
    };

    if (data.exportType === "workout" && data.workout?.exercises) {
      const workoutExercises = data.workout.exercises.map((ex) => {
        if (!ex.name || typeof ex.name !== "string") {
          throw new Error(
            "Workout export contains an exercise without a name. This might be corrupted. Try exporting the workout again."
          );
        }

        const kind = ex.kind === "cardio" ? "cardio" : (ex.kind === "mobility" ? "mobility" : "lifting");

        const exercise: {
          name: string;
          kind: string;
          targetSets?: number;
          targetReps?: string;
          targetRpe?: number;
          targetDuration?: number;
        } = {
          name: ex.name,
          kind,
        };

        if (kind === "lifting" && ex.sets && Array.isArray(ex.sets)) {
          const workingSets = ex.sets.filter((s) => !s.isWarmup);
          if (workingSets.length > 0) {
            exercise.targetSets = workingSets.length;
            const avgReps = Math.round(
              workingSets.reduce((sum, s) => sum + (s.reps ?? 0), 0) / workingSets.length
            );
            exercise.targetReps = avgReps > 0 ? `${avgReps}` : "8-12";
            const rpes = workingSets.map((s) => s.rpe).filter((r) => r !== undefined);
            if (rpes.length > 0) {
              exercise.targetRpe = Math.round(
                rpes.reduce((sum, r) => sum + (r ?? 0), 0) / rpes.length
              );
            }
          } else {
            exercise.targetSets = ex.sets.length;
            exercise.targetReps = "8-12";
          }
        } else if (kind === "cardio") {
          exercise.targetDuration = 15;
        }

        return exercise;
      });

      data.exercises = workoutExercises;
      data.name = data.workout.title ?? data.name ?? "Imported Workout";
    }

    if (!data.name || typeof data.name !== "string") {
      throw new Error(
        `Missing day name. Your JSON must include a "name" field.\n\nExample:\n{\n  "name": "Push Day",\n  "exercises": [...]\n}`
      );
    }

    if (!data.exercises || !Array.isArray(data.exercises)) {
      throw new Error(
        `Missing or invalid "exercises" field. Your day must have an "exercises" array.\n\nExample:\n{\n  "name": "Push Day",\n  "exercises": [\n    { "name": "Bench Press", "kind": "lifting", "targetSets": 4, "targetReps": "8-10" }\n  ]\n}`
      );
    }

    if (data.exercises.length === 0) {
      throw new Error("Day must have at least one exercise. Add at least one exercise to your day.");
    }

    const exercises = data.exercises.map((ex, exIdx) => {
      if (!ex.name || typeof ex.name !== "string") {
        throw new Error(
          `Exercise ${exIdx + 1} is missing a name.\n\nEach exercise must have a "name" field.\n\nExample: { "name": "Bench Press", "kind": "lifting", "targetSets": 4 }`
        );
      }

      const kind = ex.kind === "cardio" ? "cardio" : (ex.kind === "mobility" ? "mobility" : "lifting");

      return {
        exerciseName: ex.name,
        kind: kind as "lifting" | "cardio" | "mobility",
        targetSets: typeof ex.targetSets === "number" ? ex.targetSets : undefined,
        targetReps: typeof ex.targetReps === "string" ? ex.targetReps : undefined,
        targetRpe: typeof ex.targetRpe === "number" ? ex.targetRpe : undefined,
        targetDuration: typeof ex.targetDuration === "number" ? ex.targetDuration : undefined,
        targetIntensity: typeof ex.targetIntensity === "number" ? ex.targetIntensity : undefined,
        targetHoldSeconds: typeof ex.targetHoldSeconds === "number" ? ex.targetHoldSeconds : undefined,
        perSide: typeof ex.perSide === "boolean" ? ex.perSide : undefined,
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
