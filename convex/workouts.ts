import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export const createWorkout = mutation({
  args: {
    title: v.optional(v.string()),
    routineId: v.optional(v.id("routines")),
    routineDayIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found. Please complete signup first.");
    }

    const existingWorkout = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .first();

    if (existingWorkout) {
      throw new Error("You already have an active workout. Complete or cancel it first.");
    }

    const workoutId = await ctx.db.insert("workouts", {
      userId: user._id,
      title: args.title,
      routineId: args.routineId,
      routineDayIndex: args.routineDayIndex,
      status: "in_progress",
      startedAt: Date.now(),
    });

    return workoutId;
  },
});

export const getActiveWorkout = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    const workout = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .first();

    return workout;
  },
});

export const getWorkout = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const workout = await ctx.db.get(args.workoutId);

    if (!workout) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || workout.userId !== user._id) {
      return null;
    }

    return workout;
  },
});

export const completeWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    if (workout.userId !== user._id) {
      throw new Error("Not authorized");
    }

    if (workout.status !== "in_progress") {
      throw new Error("Workout is not in progress");
    }

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_workout", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    let totalVolume = 0;
    let totalSets = 0;
    const exerciseNames = new Set<string>();

    for (const entry of entries) {
      exerciseNames.add(entry.exerciseName);
      if (entry.kind === "lifting" && entry.lifting) {
        totalSets++;
        if (entry.lifting.weight && entry.lifting.reps) {
          totalVolume += entry.lifting.weight * entry.lifting.reps;
        }
      }
    }

    const completedAt = Date.now();
    const totalDurationMinutes = Math.round((completedAt - workout.startedAt) / 60000);

    await ctx.db.patch(args.workoutId, {
      status: "completed",
      completedAt,
      notes: args.notes,
      summary: {
        totalVolume,
        totalSets,
        totalDurationMinutes,
        exerciseCount: exerciseNames.size,
      },
    });

    return args.workoutId;
  },
});

export const cancelWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    if (workout.userId !== user._id) {
      throw new Error("Not authorized");
    }

    if (workout.status !== "in_progress") {
      throw new Error("Workout is not in progress");
    }

    await ctx.db.patch(args.workoutId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    return args.workoutId;
  },
});

export const getWorkoutHistory = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.union(v.literal("completed"), v.literal("cancelled"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    const limit = args.limit ?? 50;
    const statusFilter = args.status ?? "completed";

    let workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    if (statusFilter !== "all") {
      workouts = workouts.filter((w) => w.status === statusFilter);
    } else {
      workouts = workouts.filter((w) => w.status !== "in_progress");
    }

    return workouts;
  },
});

export const getWorkoutWithEntries = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== user._id) {
      return null;
    }

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_workout_created", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    return {
      ...workout,
      entries,
    };
  },
});

export const getRoutineExercisesForWorkout = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== user._id) {
      return null;
    }

    if (!workout.routineId || workout.routineDayIndex === undefined) {
      return null;
    }

    const routine = await ctx.db.get(workout.routineId);
    if (!routine || workout.routineDayIndex >= routine.days.length) {
      return null;
    }

    return routine.days[workout.routineDayIndex].exercises;
  },
});

export const updateWorkoutTitle = mutation({
  args: {
    workoutId: v.id("workouts"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    if (workout.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.workoutId, {
      title: args.title,
    });

    return args.workoutId;
  },
});
