import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getCurrentUser } from "./auth";
import type { Id } from "./_generated/dataModel";
import { createConvexLogger, truncateId } from "./lib/logger";

const liftingDataValidator = v.object({
  setNumber: v.number(),
  reps: v.optional(v.number()),
  weight: v.optional(v.number()),
  unit: v.union(v.literal("kg"), v.literal("lb")),
  rpe: v.optional(v.number()),
  rir: v.optional(v.number()),
  isWarmup: v.optional(v.boolean()),
  isBodyweight: v.optional(v.boolean()),
  tempo: v.optional(v.string()),
  restSeconds: v.optional(v.number()),
});

const cardioSetValidator = v.object({
  type: v.union(
    v.literal("warmup"),
    v.literal("work"),
    v.literal("rest"),
    v.literal("cooldown")
  ),
  durationSeconds: v.number(),
  distance: v.optional(v.number()),
  intensity: v.optional(v.number()),
  avgHeartRate: v.optional(v.number()),
});

const cardioDataValidator = v.object({
  mode: v.union(v.literal("steady"), v.literal("intervals")),
  durationSeconds: v.number(),
  distance: v.optional(v.number()),
  distanceUnit: v.optional(v.union(v.literal("m"), v.literal("km"), v.literal("mi"))),
  avgHeartRate: v.optional(v.number()),
  calories: v.optional(v.number()),
  intensity: v.optional(v.number()),
  incline: v.optional(v.number()),
  intervals: v.optional(
    v.array(
      v.object({
        workSeconds: v.number(),
        restSeconds: v.number(),
        rounds: v.number(),
      })
    )
  ),
  primaryMetric: v.optional(v.union(v.literal("duration"), v.literal("distance"))),
  vestWeight: v.optional(v.number()),
  vestWeightUnit: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
  rpe: v.optional(v.number()),
  intervalType: v.optional(v.union(
    v.literal("steady"),
    v.literal("hiit"),
    v.literal("tabata"),
    v.literal("emom"),
    v.literal("custom")
  )),
  sets: v.optional(v.array(cardioSetValidator)),
});

const mobilityDataValidator = v.object({
  reps: v.optional(v.number()),
  holdSeconds: v.optional(v.number()),
  sets: v.optional(v.number()),
  perSide: v.optional(v.boolean()),
});


export const addLiftingEntry = mutation({
  args: {
    workoutId: v.id("workouts"),
    clientId: v.string(),
    exerciseName: v.string(),
    exerciseId: v.optional(v.id("exercises")),
    lifting: liftingDataValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logger = createConvexLogger("entries.addLiftingEntry");

    const user = await getCurrentUser(ctx);
    if (!user) {
      logger.fail(new Error("User not found"));
      throw new Error("User not found");
    }

    logger.set({ user: { id: truncateId(user._id) } });

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== user._id) {
      logger.fail(new Error("Workout not found or not authorized"));
      throw new Error("Workout not found or not authorized");
    }

    if (workout.status !== "in_progress") {
      logger.fail(new Error("Cannot add entries to a completed workout"));
      throw new Error("Cannot add entries to a completed workout");
    }

    const existingEntry = await ctx.db
      .query("entries")
      .withIndex("by_client_id", (q) =>
        q.eq("workoutId", args.workoutId).eq("clientId", args.clientId)
      )
      .first();

    if (existingEntry) {
      logger.success({ deduplicated: true, entryId: truncateId(existingEntry._id) });
      return existingEntry._id;
    }

    const entryId = await ctx.db.insert("entries", {
      workoutId: args.workoutId,
      userId: user._id,
      clientId: args.clientId,
      exerciseId: args.exerciseId,
      exerciseName: args.exerciseName,
      kind: "lifting",
      lifting: args.lifting,
      notes: args.notes,
      createdAt: Date.now(),
    });

    logger.success({
      entry: {
        id: truncateId(entryId),
        kind: "lifting",
        exercise: args.exerciseName,
        setNumber: args.lifting.setNumber,
      },
    });

    return entryId;
  },
});

export const addCardioEntry = mutation({
  args: {
    workoutId: v.id("workouts"),
    clientId: v.string(),
    exerciseName: v.string(),
    exerciseId: v.optional(v.id("exercises")),
    cardio: cardioDataValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logger = createConvexLogger("entries.addCardioEntry");

    const user = await getCurrentUser(ctx);
    if (!user) {
      logger.fail(new Error("User not found"));
      throw new Error("User not found");
    }

    logger.set({ user: { id: truncateId(user._id) } });

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== user._id) {
      logger.fail(new Error("Workout not found or not authorized"));
      throw new Error("Workout not found or not authorized");
    }

    if (workout.status !== "in_progress") {
      logger.fail(new Error("Cannot add entries to a completed workout"));
      throw new Error("Cannot add entries to a completed workout");
    }

    const existingEntry = await ctx.db
      .query("entries")
      .withIndex("by_client_id", (q) =>
        q.eq("workoutId", args.workoutId).eq("clientId", args.clientId)
      )
      .first();

    if (existingEntry) {
      logger.success({ deduplicated: true, entryId: truncateId(existingEntry._id) });
      return existingEntry._id;
    }

    const entryId = await ctx.db.insert("entries", {
      workoutId: args.workoutId,
      userId: user._id,
      clientId: args.clientId,
      exerciseId: args.exerciseId,
      exerciseName: args.exerciseName,
      kind: "cardio",
      cardio: args.cardio,
      notes: args.notes,
      createdAt: Date.now(),
    });

    logger.success({
      entry: {
        id: truncateId(entryId),
        kind: "cardio",
        exercise: args.exerciseName,
        durationSeconds: args.cardio.durationSeconds,
      },
    });

    return entryId;
  },
});

export const updateLiftingEntry = mutation({
  args: {
    entryId: v.id("entries"),
    lifting: v.optional(liftingDataValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== user._id) {
      throw new Error("Entry not found or not authorized");
    }

    if (entry.kind !== "lifting") {
      throw new Error("Entry is not a lifting entry");
    }

    await ctx.db.patch(args.entryId, {
      lifting: args.lifting ?? entry.lifting,
      notes: args.notes ?? entry.notes,
    });

    return args.entryId;
  },
});

export const addMobilityEntry = mutation({
  args: {
    workoutId: v.id("workouts"),
    clientId: v.string(),
    exerciseName: v.string(),
    exerciseId: v.optional(v.id("exercises")),
    mobility: mobilityDataValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== user._id) {
      throw new Error("Workout not found or not authorized");
    }

    if (workout.status !== "in_progress") {
      throw new Error("Cannot add entries to a completed workout");
    }

    const existingEntry = await ctx.db
      .query("entries")
      .withIndex("by_client_id", (q) =>
        q.eq("workoutId", args.workoutId).eq("clientId", args.clientId)
      )
      .first();

    if (existingEntry) {
      return existingEntry._id;
    }

    const entryId = await ctx.db.insert("entries", {
      workoutId: args.workoutId,
      userId: user._id,
      clientId: args.clientId,
      exerciseId: args.exerciseId,
      exerciseName: args.exerciseName,
      kind: "mobility",
      mobility: args.mobility,
      notes: args.notes,
      createdAt: Date.now(),
    });

    return entryId;
  },
});

export const updateMobilityEntry = mutation({
  args: {
    entryId: v.id("entries"),
    mobility: v.optional(mobilityDataValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== user._id) {
      throw new Error("Entry not found or not authorized");
    }

    if (entry.kind !== "mobility") {
      throw new Error("Entry is not a mobility entry");
    }

    await ctx.db.patch(args.entryId, {
      mobility: args.mobility ?? entry.mobility,
      notes: args.notes ?? entry.notes,
    });

    return args.entryId;
  },
});

export const deleteEntry = mutation({
  args: {
    entryId: v.id("entries"),
  },
  handler: async (ctx, args) => {
    const logger = createConvexLogger("entries.deleteEntry");

    const user = await getCurrentUser(ctx);
    if (!user) {
      logger.fail(new Error("User not found"));
      throw new Error("User not found");
    }

    logger.set({ user: { id: truncateId(user._id) } });

    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== user._id) {
      logger.fail(new Error("Entry not found or not authorized"));
      throw new Error("Entry not found or not authorized");
    }

    await ctx.db.delete(args.entryId);

    logger.success({
      entry: { id: truncateId(args.entryId), kind: entry.kind, exercise: entry.exerciseName },
    });

    return args.entryId;
  },
});

export const getEntriesByWorkout = query({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) {
      return [];
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== user._id) {
      return [];
    }

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_workout_created", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    return entries;
  },
});

export const getLastSetForExercise = query({
  args: {
    exerciseName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) {
      return null;
    }

    const entry = await ctx.db
      .query("entries")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .filter((q) => q.eq(q.field("exerciseName"), args.exerciseName))
      .first();

    return entry;
  },
});

export const getExerciseHistory = query({
  args: {
    exerciseName: v.string(),
    sessionCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) {
      return [];
    }

    const limit = args.sessionCount ?? 3;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("exerciseName"), args.exerciseName),
          q.eq(q.field("kind"), "lifting")
        )
      )
      .collect();

    if (entries.length === 0) {
      return [];
    }

    const sessionMap = new Map<Id<"workouts">, (typeof entries)[number][]>();
    for (const entry of entries) {
      const existing = sessionMap.get(entry.workoutId);
      if (existing) {
        existing.push(entry);
      } else {
        sessionMap.set(entry.workoutId, [entry]);
      }
    }

    const workoutIds = Array.from(sessionMap.keys());
    const workouts = await Promise.all(
      workoutIds.map((id) => ctx.db.get(id))
    );

    type ExerciseSession = {
      workoutId: Id<"workouts">;
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

    const sessions: ExerciseSession[] = [];

    for (let i = 0; i < workoutIds.length && sessions.length < limit; i++) {
      const workout = workouts[i];
      if (!workout || workout.status !== "completed") {
        continue;
      }

      const sessionEntries = sessionMap.get(workoutIds[i])!;
      sessionEntries.sort((a, b) => 
        (a.lifting?.setNumber ?? 0) - (b.lifting?.setNumber ?? 0)
      );

      const sets = sessionEntries
        .filter((e) => e.lifting)
        .map((e) => ({
          setNumber: e.lifting!.setNumber,
          weight: e.lifting!.weight ?? 0,
          reps: e.lifting!.reps ?? 0,
          rpe: e.lifting!.rpe ?? null,
          unit: e.lifting!.unit,
        }));

      if (sets.length === 0) continue;

      const workingSets = sets.filter((s) => s.reps > 0);
      const bestSet = workingSets.reduce(
        (best, current) => (current.weight > best.weight ? current : best),
        workingSets[0] ?? sets[0]
      );

      sessions.push({
        workoutId: workoutIds[i],
        date: new Date(workout.completedAt ?? workout.startedAt).toISOString(),
        sets,
        bestSet,
      });
    }

    return sessions;
  },
});

export const getExerciseHistoryInternal = internalQuery({
  args: {
    userId: v.id("users"),
    exerciseName: v.string(),
    sessionCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.sessionCount ?? 3;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("exerciseName"), args.exerciseName),
          q.eq(q.field("kind"), "lifting")
        )
      )
      .collect();

    if (entries.length === 0) {
      return [];
    }

    const sessionMap = new Map<Id<"workouts">, (typeof entries)[number][]>();
    for (const entry of entries) {
      const existing = sessionMap.get(entry.workoutId);
      if (existing) {
        existing.push(entry);
      } else {
        sessionMap.set(entry.workoutId, [entry]);
      }
    }

    const workoutIds = Array.from(sessionMap.keys());
    const workouts = await Promise.all(
      workoutIds.map((id) => ctx.db.get(id))
    );

    type ExerciseSession = {
      workoutId: Id<"workouts">;
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

    const sessions: ExerciseSession[] = [];

    for (let i = 0; i < workoutIds.length && sessions.length < limit; i++) {
      const workout = workouts[i];
      if (!workout || workout.status !== "completed") {
        continue;
      }

      const sessionEntries = sessionMap.get(workoutIds[i])!;
      sessionEntries.sort((a, b) => 
        (a.lifting?.setNumber ?? 0) - (b.lifting?.setNumber ?? 0)
      );

      const sets = sessionEntries
        .filter((e) => e.lifting)
        .map((e) => ({
          setNumber: e.lifting!.setNumber,
          weight: e.lifting!.weight ?? 0,
          reps: e.lifting!.reps ?? 0,
          rpe: e.lifting!.rpe ?? null,
          unit: e.lifting!.unit,
        }));

      if (sets.length === 0) continue;

      const workingSets = sets.filter((s) => s.reps > 0);
      const bestSet = workingSets.reduce(
        (best, current) => (current.weight > best.weight ? current : best),
        workingSets[0] ?? sets[0]
      );

      sessions.push({
        workoutId: workoutIds[i],
        date: new Date(workout.completedAt ?? workout.startedAt).toISOString(),
        sets,
        bestSet,
      });
    }

    return sessions;
  },
});


