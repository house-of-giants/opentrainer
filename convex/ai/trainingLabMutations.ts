import { v } from "convex/values";
import { query, internalMutation } from "../_generated/server";
import { getCurrentUser } from "../auth";
import type { TrainingLabReport, TrainingSnapshot, TrainingLabCTAState, TrainingLabDashboardStats } from "./trainingLabTypes";

export const storeAssessment = internalMutation({
  args: {
    userId: v.id("users"),
    subjectType: v.literal("weekly_review"),
    subjectSubtype: v.union(v.literal("snapshot"), v.literal("full")),
    model: v.string(),
    summary: v.string(),
    scores: v.optional(
      v.object({
        volumeAdherence: v.number(),
        intensityManagement: v.number(),
        muscleBalance: v.number(),
        recoverySignals: v.number(),
      })
    ),
    insights: v.optional(
      v.array(
        v.object({
          category: v.string(),
          observation: v.string(),
          recommendation: v.optional(v.string()),
          priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
        })
      )
    ),
    report: v.any(),
    tokenUsage: v.object({
      input: v.number(),
      output: v.number(),
    }),
    latencyMs: v.number(),
  },
  handler: async (ctx, args) => {
    const assessmentId = await ctx.db.insert("assessments", {
      userId: args.userId,
      subjectType: args.subjectType,
      model: args.model,
      promptVersion: "1.0",
      status: "success",
      summary: args.summary,
      scores: args.scores
        ? {
            volumeAdherence: args.scores.volumeAdherence,
            intensityManagement: args.scores.intensityManagement,
            recoveryBalance: args.scores.recoverySignals,
          }
        : undefined,
      insights: args.insights,
      tokenUsage: {
        input: args.tokenUsage.input,
        output: args.tokenUsage.output,
      },
      createdAt: Date.now(),
    });

    await ctx.db.insert("assessmentDetails", {
      assessmentId,
      userId: args.userId,
      contentMarkdown: JSON.stringify(args.report),
      createdAt: Date.now(),
    });

    return assessmentId;
  },
});

export const getCtaState = query({
  args: {},
  handler: async (ctx): Promise<TrainingLabCTAState | null> => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) return null;

    const allWorkouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const totalWorkouts = allWorkouts.length;
    
    const now = Date.now();
    const oldestWorkout = allWorkouts.length > 0 
      ? Math.min(...allWorkouts.map(w => w.startedAt))
      : now;
    const dataRangeDays = Math.floor((now - oldestWorkout) / (24 * 60 * 60 * 1000));

    if (user.tier !== "pro") {
      return {
        show: true,
        isPro: false,
        workoutsSinceLastReport: 0,
        totalWorkouts,
        hasReport: false,
        canGenerate: false,
        message: "Unlock AI-powered training insights",
        dataRangeDays,
      };
    }

    const lastAssessment = await ctx.db
      .query("assessments")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("subjectType"), "weekly_review"))
      .order("desc")
      .first();

    const hasReport = !!lastAssessment;
    const lastAssessmentDate = lastAssessment?.createdAt ?? 0;

    const workoutsSince = allWorkouts.filter((w) => w.startedAt > lastAssessmentDate);
    const count = workoutsSince.length;

    const canGenerate = hasReport ? count > 0 : totalWorkouts > 0;

    let message: string;
    if (totalWorkouts === 0) {
      message = "Complete your first workout to unlock insights";
    } else if (!hasReport) {
      message = totalWorkouts === 1
        ? "Your first analysis is ready"
        : `${totalWorkouts} workouts logged. Generate your analysis`;
    } else if (count === 0) {
      message = "Log a workout to refresh your analysis";
    } else {
      message = count === 1
        ? "1 new workout. Refresh your analysis"
        : `${count} new workouts. Refresh your analysis`;
    }

    return {
      show: true,
      isPro: true,
      workoutsSinceLastReport: count,
      totalWorkouts,
      hasReport,
      canGenerate,
      message,
      dataRangeDays,
    };
  },
});

export const getLatestReport = query({
  args: {},
  handler: async (ctx): Promise<TrainingLabReport | TrainingSnapshot | null> => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) return null;

    const latestAssessment = await ctx.db
      .query("assessments")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("subjectType"), "weekly_review"))
      .order("desc")
      .first();

    if (!latestAssessment) return null;

    const details = await ctx.db
      .query("assessmentDetails")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", latestAssessment._id))
      .first();

    if (!details) return null;

    try {
      return JSON.parse(details.contentMarkdown);
    } catch {
      return null;
    }
  },
});

function getWeekStart(timestamp: number): string {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay();
  date.setDate(date.getDate() - dayOfWeek);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split("T")[0];
}

export const getDashboardStats = query({
  args: {},
  handler: async (ctx): Promise<TrainingLabDashboardStats | null> => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) return null;

    const now = Date.now();
    const weekStart = new Date(getWeekStart(now)).getTime();
    const twoWeeksAgo = weekStart - 7 * 24 * 60 * 60 * 1000;
    const fourWeeksAgo = weekStart - 28 * 24 * 60 * 60 * 1000;

    const recentWorkouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("startedAt"), fourWeeksAgo)
        )
      )
      .collect();

    const thisWeekWorkouts = recentWorkouts.filter((w) => w.startedAt >= weekStart);
    const lastWeekWorkouts = recentWorkouts.filter(
      (w) => w.startedAt >= twoWeeksAgo && w.startedAt < weekStart
    );
    const fourWeekWorkouts = recentWorkouts.filter((w) => w.startedAt >= fourWeeksAgo);

    const allEntries: Array<{
      workoutId: string;
      kind: "lifting" | "cardio" | "mobility";
      lifting?: { rpe?: number; weight?: number };
      cardio?: { durationSeconds: number; rpe?: number; intensity?: number; distance?: number; distanceUnit?: string };
      exerciseName: string;
    }> = [];

    for (const workout of recentWorkouts) {
      const entries = await ctx.db
        .query("entries")
        .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
        .collect();
      for (const e of entries) {
        allEntries.push({
          workoutId: workout._id.toString(),
          kind: e.kind,
          lifting: e.lifting ? { rpe: e.lifting.rpe, weight: e.lifting.weight } : undefined,
          cardio: e.cardio ? {
            durationSeconds: e.cardio.durationSeconds,
            rpe: e.cardio.rpe,
            intensity: e.cardio.intensity,
            distance: e.cardio.distance,
            distanceUnit: e.cardio.distanceUnit,
          } : undefined,
          exerciseName: e.exerciseName,
        });
      }
    }

    const thisWeekEntries = allEntries.filter((e) => 
      thisWeekWorkouts.some((w) => w._id.toString() === e.workoutId)
    );
    const lastWeekEntries = allEntries.filter((e) =>
      lastWeekWorkouts.some((w) => w._id.toString() === e.workoutId)
    );
    const fourWeekEntries = allEntries.filter((e) =>
      fourWeekWorkouts.some((w) => w._id.toString() === e.workoutId)
    );

    const thisWeekSets = thisWeekEntries.filter((e) => e.kind === "lifting").length;
    const lastWeekSets = lastWeekEntries.filter((e) => e.kind === "lifting").length;

    const volumeChangePercent =
      lastWeekSets > 0
        ? Math.round(((thisWeekSets - lastWeekSets) / lastWeekSets) * 100)
        : null;

    const allWorkouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("asc")
      .collect();

    const weeklyWorkouts = new Map<string, number>();
    for (const workout of allWorkouts) {
      const weekKey = getWeekStart(workout.startedAt);
      weeklyWorkouts.set(weekKey, (weeklyWorkouts.get(weekKey) ?? 0) + 1);
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const currentWeek = getWeekStart(now);
    const lastWeek = getWeekStart(now - 7 * 24 * 60 * 60 * 1000);

    const weeks = Array.from(weeklyWorkouts.keys()).sort().reverse();
    for (const week of weeks) {
      if (weeklyWorkouts.has(week) && weeklyWorkouts.get(week)! > 0) {
        tempStreak++;
        if (week === currentWeek || week === lastWeek) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        if (week !== currentWeek) {
          tempStreak = 0;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    if (currentStreak === 0 && weeklyWorkouts.has(currentWeek)) {
      currentStreak = 1;
    }

    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentPRs: Array<{ exercise: string; weight: number; date: string }> = [];
    const exerciseMaxWeights = new Map<string, { weight: number; date: number }>();
    
    for (const workout of allWorkouts) {
      const entries = await ctx.db
        .query("entries")
        .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
        .filter((q) => q.eq(q.field("kind"), "lifting"))
        .collect();

      for (const entry of entries) {
        if (!entry.lifting?.weight) continue;
        
        const existing = exerciseMaxWeights.get(entry.exerciseName);
        if (!existing || entry.lifting.weight > existing.weight) {
          if (existing && workout.startedAt > thirtyDaysAgo && entry.lifting.weight > existing.weight) {
            recentPRs.push({
              exercise: entry.exerciseName,
              weight: entry.lifting.weight,
              date: new Date(workout.startedAt).toISOString().split("T")[0],
            });
          }
          exerciseMaxWeights.set(entry.exerciseName, {
            weight: entry.lifting.weight,
            date: workout.startedAt,
          });
        }
      }
    }

    const { trainingLoad, trainingProfile } = calculateTrainingLoadStats(
      fourWeekEntries,
      thisWeekEntries,
      lastWeekEntries,
      fourWeekWorkouts,
      thisWeekWorkouts
    );

    const cardioSummary = calculateCardioSummaryStats(thisWeekEntries);

    return {
      workoutsThisWeek: thisWeekWorkouts.length,
      weeklyTarget: user.weeklyAvailability ?? 4,
      totalSetsThisWeek: thisWeekSets,
      currentStreakWeeks: currentStreak,
      longestStreakWeeks: longestStreak,
      volumeChangePercent,
      recentPRs: recentPRs.slice(0, 3),
      trainingProfile,
      trainingLoad,
      cardioSummary,
    };
  },
});

type EntryData = {
  workoutId: string;
  kind: "lifting" | "cardio" | "mobility";
  lifting?: { rpe?: number; weight?: number };
  cardio?: { durationSeconds: number; rpe?: number; intensity?: number; distance?: number; distanceUnit?: string };
  exerciseName: string;
};

type WorkoutData = {
  _id: { toString(): string };
  startedAt: number;
  completedAt?: number;
};

function calculateTrainingLoadStats(
  fourWeekEntries: EntryData[],
  thisWeekEntries: EntryData[],
  lastWeekEntries: EntryData[],
  fourWeekWorkouts: WorkoutData[],
  thisWeekWorkouts: WorkoutData[]
): {
  trainingLoad: TrainingLabDashboardStats["trainingLoad"];
  trainingProfile: TrainingLabDashboardStats["trainingProfile"];
} {
  const calcLoad = (entries: EntryData[], workouts: WorkoutData[]) => {
    let liftingLoad = 0;
    let cardioLoad = 0;

    const workoutDurations = new Map<string, number>();
    for (const w of workouts) {
      const duration = (w.completedAt ?? w.startedAt + 3600000) - w.startedAt;
      workoutDurations.set(w._id.toString(), duration / 60000);
    }

    const workoutLiftingRpe = new Map<string, { total: number; count: number }>();
    for (const e of entries) {
      if (e.kind === "lifting" && e.lifting?.rpe) {
        const existing = workoutLiftingRpe.get(e.workoutId) ?? { total: 0, count: 0 };
        existing.total += e.lifting.rpe;
        existing.count++;
        workoutLiftingRpe.set(e.workoutId, existing);
      }
    }

    for (const [workoutId, stats] of workoutLiftingRpe) {
      const duration = workoutDurations.get(workoutId) ?? 60;
      const avgRpe = stats.count > 0 ? stats.total / stats.count : 6;
      liftingLoad += Math.round(duration * avgRpe * 0.8);
    }

    for (const e of entries) {
      if (e.kind === "cardio" && e.cardio) {
        const durationMin = e.cardio.durationSeconds / 60;
        const rpe = e.cardio.rpe ?? e.cardio.intensity ?? 5;
        cardioLoad += Math.round(durationMin * rpe);
      }
    }

    return { liftingLoad, cardioLoad, total: liftingLoad + cardioLoad };
  };

  const fourWeekLoad = calcLoad(fourWeekEntries, fourWeekWorkouts);
  const thisWeekLoad = calcLoad(thisWeekEntries, thisWeekWorkouts);
  const lastWeekLoad = calcLoad(lastWeekEntries, []);

  const total = fourWeekLoad.total;
  const liftingPercent = total > 0 ? Math.round((fourWeekLoad.liftingLoad / total) * 100) : 0;
  const cardioPercent = total > 0 ? Math.round((fourWeekLoad.cardioLoad / total) * 100) : 0;

  let trainingProfile: TrainingLabDashboardStats["trainingProfile"];
  if (total < 100) {
    trainingProfile = "general_fitness";
  } else if (liftingPercent >= 70) {
    trainingProfile = "strength_focused";
  } else if (cardioPercent >= 70) {
    trainingProfile = "cardio_focused";
  } else {
    trainingProfile = "hybrid";
  }

  const changePercent = lastWeekLoad.total > 0
    ? Math.round(((thisWeekLoad.total - lastWeekLoad.total) / lastWeekLoad.total) * 100)
    : null;

  return {
    trainingLoad: {
      total: thisWeekLoad.total,
      liftingLoad: thisWeekLoad.liftingLoad,
      cardioLoad: thisWeekLoad.cardioLoad,
      liftingPercent,
      cardioPercent,
      changePercent,
    },
    trainingProfile,
  };
}

function calculateCardioSummaryStats(
  entries: EntryData[]
): TrainingLabDashboardStats["cardioSummary"] {
  const cardioEntries = entries.filter((e) => e.kind === "cardio" && e.cardio);
  if (cardioEntries.length === 0) return null;

  let totalMinutes = 0;
  let totalDistance = 0;
  let totalRpe = 0;
  let rpeCount = 0;
  const modalityMinutes = new Map<string, number>();

  for (const e of cardioEntries) {
    const c = e.cardio!;
    const minutes = c.durationSeconds / 60;
    totalMinutes += minutes;

    if (c.distance && c.distanceUnit) {
      let distKm = c.distance;
      if (c.distanceUnit === "m") distKm = c.distance / 1000;
      if (c.distanceUnit === "mi") distKm = c.distance * 1.60934;
      totalDistance += distKm;
    }

    const rpe = c.rpe ?? c.intensity;
    if (rpe) {
      totalRpe += rpe;
      rpeCount++;
    }

    const modality = e.exerciseName.toLowerCase();
    modalityMinutes.set(modality, (modalityMinutes.get(modality) ?? 0) + minutes);
  }

  let topModality: string | null = null;
  let topMinutes = 0;
  for (const [mod, mins] of modalityMinutes) {
    if (mins > topMinutes) {
      topMinutes = mins;
      topModality = mod;
    }
  }

  return {
    totalMinutes: Math.round(totalMinutes),
    totalDistance: Math.round(totalDistance * 10) / 10,
    distanceUnit: "km",
    avgRpe: rpeCount > 0 ? Math.round((totalRpe / rpeCount) * 10) / 10 : 0,
    topModality,
  };
}
