import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./auth";
import { createConvexLogger, truncateId } from "./lib/logger";

export const createWorkout = mutation({
  args: {
    title: v.optional(v.string()),
    routineId: v.optional(v.id("routines")),
    routineDayIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logger = createConvexLogger("workouts.createWorkout");

    const user = await getCurrentUser(ctx);
    if (!user) {
      logger.fail(new Error("User not found"));
      throw new Error("User not found");
    }

    logger.set({ user: { id: truncateId(user._id), tier: user.tier } });

    const existingWorkout = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .first();

    if (existingWorkout) {
      logger.fail(new Error("Active workout exists"), {
        existingWorkoutId: truncateId(existingWorkout._id),
      });
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

    logger.success({
      workout: {
        id: truncateId(workoutId),
        status: "in_progress",
      },
    });

    return workoutId;
  },
});

export const getActiveWorkout = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
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
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) {
      return null;
    }

    const workout = await ctx.db.get(args.workoutId);

    if (!workout || workout.userId !== user._id) {
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
    const logger = createConvexLogger("workouts.completeWorkout");

    const user = await getCurrentUser(ctx);
    if (!user) {
      logger.fail(new Error("User not found"));
      throw new Error("User not found");
    }

    logger.set({ user: { id: truncateId(user._id), tier: user.tier } });

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      logger.fail(new Error("Workout not found"));
      throw new Error("Workout not found");
    }

    if (workout.userId !== user._id) {
      logger.fail(new Error("Not authorized"));
      throw new Error("Not authorized");
    }

    if (workout.status !== "in_progress") {
      logger.fail(new Error("Workout is not in progress"), {
        workout: { id: truncateId(args.workoutId), status: workout.status },
      });
      throw new Error("Workout is not in progress");
    }

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_workout", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    let totalVolume = 0;
    let totalSets = 0;
    let totalCardioDurationSeconds = 0;
    let totalDistanceKm = 0;
    let hasCardio = false;
    let hasMobility = false;
    const exerciseNames = new Set<string>();

    for (const entry of entries) {
      exerciseNames.add(entry.exerciseName);
      if (entry.kind === "lifting" && entry.lifting) {
        totalSets++;
        if (entry.lifting.weight && entry.lifting.reps) {
          totalVolume += entry.lifting.weight * entry.lifting.reps;
        }
      } else if (entry.kind === "cardio" && entry.cardio) {
        hasCardio = true;
        totalCardioDurationSeconds += entry.cardio.durationSeconds;
        if (entry.cardio.distance && entry.cardio.distanceUnit) {
          const distanceKm = entry.cardio.distanceUnit === "km" 
            ? entry.cardio.distance 
            : entry.cardio.distanceUnit === "mi" 
              ? entry.cardio.distance * 1.60934 
              : entry.cardio.distance / 1000;
          totalDistanceKm += distanceKm;
        }
      } else if (entry.kind === "mobility") {
        hasMobility = true;
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
        totalCardioDurationSeconds: hasCardio ? totalCardioDurationSeconds : undefined,
        totalDistanceKm: totalDistanceKm > 0 ? totalDistanceKm : undefined,
        hasCardio: hasCardio || undefined,
        hasMobility: hasMobility || undefined,
      },
    });

    logger.success({
      workout: {
        id: truncateId(args.workoutId),
        status: "completed",
        exerciseCount: exerciseNames.size,
        totalSets,
        totalVolume,
        durationMinutes: totalDurationMinutes,
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
    const logger = createConvexLogger("workouts.cancelWorkout");

    const user = await getCurrentUser(ctx);
    if (!user) {
      logger.fail(new Error("User not found"));
      throw new Error("User not found");
    }

    logger.set({ user: { id: truncateId(user._id), tier: user.tier } });

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      logger.fail(new Error("Workout not found"));
      throw new Error("Workout not found");
    }

    if (workout.userId !== user._id) {
      logger.fail(new Error("Not authorized"));
      throw new Error("Not authorized");
    }

    if (workout.status !== "in_progress") {
      logger.fail(new Error("Workout is not in progress"), {
        workout: { id: truncateId(args.workoutId), status: workout.status },
      });
      throw new Error("Workout is not in progress");
    }

    await ctx.db.patch(args.workoutId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    logger.success({
      workout: { id: truncateId(args.workoutId), status: "cancelled" },
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
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) {
      return [];
    }

    const limit = args.limit ?? 50;
    const statusFilter = args.status ?? "completed";

    let query = ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .order("desc");

    if (statusFilter !== "all") {
      query = query.filter((q) => q.eq(q.field("status"), statusFilter));
    } else {
      query = query.filter((q) => q.neq(q.field("status"), "in_progress"));
    }

    const workouts = await query.take(limit);

    return workouts;
  },
});

export const getWorkoutWithEntries = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
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

    // Compute cardio stats on-the-fly if not present in summary (for legacy workouts)
    let summary = workout.summary;
    if (summary && summary.totalCardioDurationSeconds === undefined) {
      let totalCardioDurationSeconds = 0;
      let totalDistanceKm = 0;
      let hasCardio = false;
      let hasMobility = false;

      for (const entry of entries) {
        if (entry.kind === "cardio" && entry.cardio) {
          hasCardio = true;
          totalCardioDurationSeconds += entry.cardio.durationSeconds;
          if (entry.cardio.distance && entry.cardio.distanceUnit) {
            const distanceKm = entry.cardio.distanceUnit === "km"
              ? entry.cardio.distance
              : entry.cardio.distanceUnit === "mi"
                ? entry.cardio.distance * 1.60934
                : entry.cardio.distance / 1000;
            totalDistanceKm += distanceKm;
          }
        } else if (entry.kind === "mobility") {
          hasMobility = true;
        }
      }

      summary = {
        ...summary,
        totalCardioDurationSeconds: hasCardio ? totalCardioDurationSeconds : undefined,
        totalDistanceKm: totalDistanceKm > 0 ? totalDistanceKm : undefined,
        hasCardio: hasCardio || undefined,
        hasMobility: hasMobility || undefined,
      };
    }

    return {
      ...workout,
      summary,
      entries,
    };
  },
});

export const getRoutineExercisesForWorkout = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
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

    const exercises = routine.days[workout.routineDayIndex].exercises;

    const exercisesWithEquipment = await Promise.all(
      exercises.map(async (ex) => {
        if (ex.exerciseId) {
          const exerciseData = await ctx.db.get(ex.exerciseId);
          return {
            ...ex,
            equipment: exerciseData?.equipment,
          };
        }
        return ex;
      })
    );

    return exercisesWithEquipment;
  },
});

export const updateWorkoutTitle = mutation({
  args: {
    workoutId: v.id("workouts"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

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

export const updateExerciseNote = mutation({
  args: {
    workoutId: v.id("workouts"),
    exerciseName: v.string(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    if (workout.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const existingNotes = workout.exerciseNotes ?? [];
    const noteIndex = existingNotes.findIndex(
      (n) => n.exerciseName === args.exerciseName
    );

    let updatedNotes;
    if (args.note.trim() === "") {
      updatedNotes = existingNotes.filter(
        (n) => n.exerciseName !== args.exerciseName
      );
    } else if (noteIndex >= 0) {
      updatedNotes = existingNotes.map((n, i) =>
        i === noteIndex ? { exerciseName: args.exerciseName, note: args.note } : n
      );
    } else {
      updatedNotes = [...existingNotes, { exerciseName: args.exerciseName, note: args.note }];
    }

    await ctx.db.patch(args.workoutId, {
      exerciseNotes: updatedNotes,
    });

    return args.workoutId;
  },
});

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) {
      return null;
    }

    // Calculate start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    // We want Monday as day 0, so we adjust: (dayOfWeek + 6) % 7 gives us days since Monday
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const mondayOfThisWeek = new Date(now);
    mondayOfThisWeek.setDate(now.getDate() - daysSinceMonday);
    mondayOfThisWeek.setHours(0, 0, 0, 0);

    // Get current week (Monday through Sunday) for activity dots
    const currentWeek: { date: string; dayName: string; hasWorkout: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayOfThisWeek);
      date.setDate(mondayOfThisWeek.getDate() + i);
      currentWeek.push({
        date: date.toISOString().split("T")[0],
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        hasWorkout: false,
      });
    }

    // Get workouts from the current week
    const recentWorkouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("startedAt"), mondayOfThisWeek.getTime())
        )
      )
      .collect();

    // Mark days with workouts
    for (const workout of recentWorkouts) {
      const workoutDate = new Date(workout.startedAt).toISOString().split("T")[0];
      const dayEntry = currentWeek.find((d) => d.date === workoutDate);
      if (dayEntry) {
        dayEntry.hasWorkout = true;
      }
    }

    // Calculate this week's stats
    const thisWeekWorkouts = recentWorkouts.filter(
      (w) => w.startedAt >= mondayOfThisWeek.getTime()
    );

    const weeklyWorkoutCount = thisWeekWorkouts.length;
    let weeklyTotalSets = 0;
    let weeklyTotalVolume = 0;
    let weeklyTotalDuration = 0;

    for (const workout of thisWeekWorkouts) {
      weeklyTotalSets += workout.summary?.totalSets ?? 0;
      weeklyTotalVolume += workout.summary?.totalVolume ?? 0;
      weeklyTotalDuration += workout.summary?.totalDurationMinutes ?? 0;
    }

    // Get weekly trend data (last 4 weeks)
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28);
    fourWeeksAgo.setHours(0, 0, 0, 0);

    const trendWorkouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("startedAt"), fourWeeksAgo.getTime())
        )
      )
      .collect();

    // Group by week for trend chart
    const weeklyTrend: { week: string; volume: number; workouts: number; duration: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7 + dayOfWeek));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const weekWorkouts = trendWorkouts.filter(
        (w) => w.startedAt >= weekStart.getTime() && w.startedAt < weekEnd.getTime()
      );

      let volume = 0;
      let duration = 0;
      for (const w of weekWorkouts) {
        volume += w.summary?.totalVolume ?? 0;
        duration += w.summary?.totalDurationMinutes ?? 0;
      }

      weeklyTrend.push({
        week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        volume,
        workouts: weekWorkouts.length,
        duration,
      });
    }

    return {
      weeklyGoal: user.weeklyAvailability ?? 4,
      weeklyWorkoutCount,
      weeklyTotalSets,
      weeklyTotalVolume,
      weeklyTotalDuration,
      currentWeek,
      weeklyTrend,
      preferredUnits: user.preferredUnits ?? "lb",
    };
  },
});

export const updateWeeklyGoal = mutation({
  args: {
    weeklyGoal: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      weeklyAvailability: args.weeklyGoal,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

export const exportWorkoutAsJson = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    if (user.tier !== "pro") {
      throw new Error("Export is a Pro feature");
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== user._id) {
      throw new Error("Workout not found");
    }

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_workout_created", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    // Group entries by exercise name, preserving order
    const exerciseGroups: Record<string, { kind: "lifting" | "cardio" | "mobility"; entries: typeof entries }> = {};
    const exerciseOrder: string[] = [];

    for (const entry of entries) {
      if (!exerciseGroups[entry.exerciseName]) {
        exerciseGroups[entry.exerciseName] = { kind: entry.kind, entries: [] };
        exerciseOrder.push(entry.exerciseName);
      }
      exerciseGroups[entry.exerciseName].entries.push(entry);
    }

    // Transform to detailed export format with actual set data
    const exercises = exerciseOrder.map((name) => {
      const group = exerciseGroups[name];
      const entryList = group.entries;

      if (group.kind === "lifting") {
        // Include all sets with their actual data
        const sets = entryList
          .filter((e) => e.kind === "lifting" && e.lifting)
          .sort((a, b) => {
            const aSet = a.kind === "lifting" ? a.lifting?.setNumber ?? 0 : 0;
            const bSet = b.kind === "lifting" ? b.lifting?.setNumber ?? 0 : 0;
            return aSet - bSet;
          })
          .map((e) => {
            if (e.kind !== "lifting" || !e.lifting) return null;
            const set: {
              setNumber: number;
              weight?: number;
              reps?: number;
              unit: "kg" | "lb";
              rpe?: number;
              isWarmup?: boolean;
              isBodyweight?: boolean;
            } = {
              setNumber: e.lifting.setNumber,
              unit: e.lifting.unit,
            };
            if (e.lifting.weight !== undefined) set.weight = e.lifting.weight;
            if (e.lifting.reps !== undefined) set.reps = e.lifting.reps;
            if (e.lifting.rpe !== undefined) set.rpe = e.lifting.rpe;
            if (e.lifting.isWarmup) set.isWarmup = true;
            if (e.lifting.isBodyweight) set.isBodyweight = true;
            return set;
          })
          .filter((s) => s !== null);

        return {
          name,
          kind: "lifting" as const,
          sets,
        };
      } else {
        // Cardio exercise - include all cardio entries
        const cardioData = entryList
          .filter((e) => e.kind === "cardio" && e.cardio)
          .map((e) => {
            if (e.kind !== "cardio" || !e.cardio) return null;
            const cardio: {
              mode: "steady" | "intervals";
              durationSeconds: number;
              distance?: number;
              distanceUnit?: "m" | "km" | "mi";
              intensity?: number;
              incline?: number;
              rpe?: number;
            } = {
              mode: e.cardio.mode,
              durationSeconds: e.cardio.durationSeconds,
            };
            if (e.cardio.distance !== undefined) cardio.distance = e.cardio.distance;
            if (e.cardio.distanceUnit) cardio.distanceUnit = e.cardio.distanceUnit;
            if (e.cardio.intensity !== undefined) cardio.intensity = e.cardio.intensity;
            if (e.cardio.incline !== undefined) cardio.incline = e.cardio.incline;
            if (e.cardio.rpe !== undefined) cardio.rpe = e.cardio.rpe;
            return cardio;
          })
          .filter((c) => c !== null);

        return {
          name,
          kind: "cardio" as const,
          cardio: cardioData.length === 1 ? cardioData[0] : cardioData,
        };
      }
    });

    // Format workout date for name
    const workoutDate = new Date(workout.startedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const exportData = {
      version: 1,
      exportType: "workout",
      name: workout.title ? `${workout.title} - ${workoutDate}` : `Workout - ${workoutDate}`,
      workout: {
        title: workout.title ?? "Workout",
        date: new Date(workout.startedAt).toISOString(),
        completedAt: workout.completedAt ? new Date(workout.completedAt).toISOString() : undefined,
        durationMinutes: workout.summary?.totalDurationMinutes,
        totalVolume: workout.summary?.totalVolume,
        totalSets: workout.summary?.totalSets,
        notes: workout.notes,
        exercises,
      },
    };

    return {
      json: JSON.stringify(exportData, null, 2),
      workoutTitle: workout.title ?? "Workout",
    };
  },
});
