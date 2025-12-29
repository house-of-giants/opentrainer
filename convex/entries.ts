import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./auth";

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
      kind: "lifting",
      lifting: args.lifting,
      notes: args.notes,
      createdAt: Date.now(),
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
      kind: "cardio",
      cardio: args.cardio,
      notes: args.notes,
      createdAt: Date.now(),
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

export const deleteEntry = mutation({
  args: {
    entryId: v.id("entries"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== user._id) {
      throw new Error("Entry not found or not authorized");
    }

    await ctx.db.delete(args.entryId);

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
