import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";

const MODALITY_METS: Record<string, number> = {
  run: 9.8,
  treadmill: 9.0,
  bike: 8.0,
  stationary_bike: 7.0,
  row: 7.0,
  stairs: 9.0,
  elliptical: 5.0,
  jump_rope: 12.3,
  swim: 8.0,
  walk: 3.5,
  incline_walk: 6.0,
  hiit: 8.0,
};

const DEFAULT_BODYWEIGHT_KG = 70;

function calculateCardioLoad(
  durationMinutes: number,
  rpe: number | undefined,
  modality: string | undefined,
  bodyweightKg: number,
  vestWeightKg: number
): number {
  const baseMET = MODALITY_METS[modality ?? ""] ?? 6.0;
  const effectiveRpe = rpe ?? 5;
  const adjustedMET = baseMET * (effectiveRpe / 5);
  const effectiveBodyweight = bodyweightKg + vestWeightKg;
  return Math.round(adjustedMET * effectiveBodyweight * (durationMinutes / 60));
}

function convertToKg(weight: number, unit: "kg" | "lb" | undefined): number {
  if (unit === "lb") return weight * 0.453592;
  return weight;
}

function convertToKm(distance: number, unit: "m" | "km" | "mi" | undefined): number {
  if (unit === "m") return distance / 1000;
  if (unit === "mi") return distance * 1.60934;
  return distance;
}

export interface CardioSummary {
  totalMinutes: number;
  totalLoad: number;
  totalDistance: number;
  distanceUnit: "km" | "mi";
  byModality: Array<{
    modality: string;
    minutes: number;
    load: number;
    distance: number;
    sessions: number;
  }>;
  vestedMinutes: number;
  avgRpe: number;
}

export interface HistoricalContext {
  totalWorkouts: number;
  totalSets: number;
  trainingAgeDays: number;
  firstWorkoutDate: string;
  
  monthlyFrequency: Array<{
    month: string;
    workouts: number;
    avgSetsPerWorkout: number;
  }>;
  
  consistency: {
    avgWorkoutsPerWeek: number;
    currentStreakWeeks: number;
    longestStreakWeeks: number;
  };
  
  personalRecords: Array<{
    exercise: string;
    topWeight: number;
    topWeightDate: string;
    totalSessions: number;
  }>;
  
  muscleDistribution: Array<{
    muscle: string;
    percentage: number;
  }>;
}

export interface ExerciseNote {
  exercise: string;
  note: string;
  date: string;
}

export interface AggregatedWorkoutData {
  period: {
    start: string;
    end: string;
    workouts: number;
    totalSets: number;
  };
  volumeByMuscle: Array<{
    muscle: string;
    sets: number;
    avgRpe: number;
  }>;
  volumeByMuscleOverTime: Array<{
    muscle: string;
    week: string;
    sets: number;
  }>;
  exerciseTrends: Array<{
    exercise: string;
    kind: "lifting" | "cardio" | "mobility";
    sessions: number;
    totalSets: number;
    topWeight?: number;
    avgRpe?: number;
    trend: "up" | "down" | "flat";
  }>;
  rpeByWorkout: Array<{
    date: string;
    avgRpe: number;
  }>;
  swapSummary: Array<{
    exercise: string;
    reason: string;
    count: number;
  }>;
  exerciseNotes: ExerciseNote[];
  cardioSummary?: CardioSummary;
  historicalContext?: HistoricalContext;
}

export const aggregateWorkoutData = internalQuery({
  args: {
    userId: v.id("users"),
    days: v.number(),
    includeHistoricalContext: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<AggregatedWorkoutData> => {
    const now = Date.now();
    const periodStart = now - args.days * 24 * 60 * 60 * 1000;

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("startedAt"), periodStart)
        )
      )
      .collect();

    const workoutIds = workouts.map((w) => w._id);
    
    const entries: Doc<"entries">[] = [];
    for (const workoutId of workoutIds) {
      const workoutEntries = await ctx.db
        .query("entries")
        .withIndex("by_workout", (q) => q.eq("workoutId", workoutId))
        .collect();
      entries.push(...workoutEntries);
    }

    const exercises = await ctx.db.query("exercises").collect();
    const exerciseMap = new Map(exercises.map((e) => [e.name, e]));

    const volumeByMuscle = aggregateVolumeByMuscle(entries, exerciseMap);
    const volumeByMuscleOverTime = aggregateVolumeByMuscleOverTime(entries, workouts, exerciseMap);
    const exerciseTrends = aggregateExerciseTrends(entries, workouts);
    const rpeByWorkout = aggregateRpeByWorkout(entries, workouts);

    const swaps = await ctx.db
      .query("exerciseSwaps")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), periodStart))
      .collect();
    
    const swapSummary = aggregateSwapSummary(swaps);

    let totalSets = 0;
    for (const entry of entries) {
      if (entry.kind === "lifting") {
        totalSets++;
      }
    }

    const user = await ctx.db.get(args.userId);
    const userBodyweightKg = user?.bodyweight
      ? convertToKg(user.bodyweight, user.bodyweightUnit)
      : DEFAULT_BODYWEIGHT_KG;
    
    const cardioSummary = aggregateCardioSummary(entries, exerciseMap, userBodyweightKg);

    const exerciseNotes: ExerciseNote[] = [];
    for (const workout of workouts) {
      if (workout.exerciseNotes) {
        const workoutDate = new Date(workout.startedAt).toISOString().split("T")[0];
        for (const note of workout.exerciseNotes) {
          exerciseNotes.push({
            exercise: note.exerciseName,
            note: note.note,
            date: workoutDate,
          });
        }
      }
    }

    let historicalContext: HistoricalContext | undefined;
    if (args.includeHistoricalContext) {
      const allWorkouts = await ctx.db
        .query("workouts")
        .withIndex("by_user_started", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("status"), "completed"))
        .order("asc")
        .collect();

      if (allWorkouts.length > 0) {
        const firstWorkout = allWorkouts[0];
        const trainingAgeDays = Math.floor((now - firstWorkout.startedAt) / (24 * 60 * 60 * 1000));

        const allEntries: Doc<"entries">[] = [];
        for (const workout of allWorkouts) {
          const workoutEntries = await ctx.db
            .query("entries")
            .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
            .collect();
          allEntries.push(...workoutEntries);
        }

        let allTimeSets = 0;
        for (const entry of allEntries) {
          if (entry.kind === "lifting") {
            allTimeSets++;
          }
        }

        historicalContext = {
          totalWorkouts: allWorkouts.length,
          totalSets: allTimeSets,
          trainingAgeDays,
          firstWorkoutDate: new Date(firstWorkout.startedAt).toISOString().split("T")[0],
          monthlyFrequency: computeMonthlyFrequency(allWorkouts, allEntries),
          consistency: computeConsistency(allWorkouts),
          personalRecords: computePersonalRecords(allEntries, allWorkouts),
          muscleDistribution: computeMuscleDistribution(allEntries, exerciseMap, allTimeSets),
        };
      } else {
        historicalContext = {
          totalWorkouts: 0,
          totalSets: 0,
          trainingAgeDays: 0,
          firstWorkoutDate: new Date().toISOString().split("T")[0],
          monthlyFrequency: [],
          consistency: { avgWorkoutsPerWeek: 0, currentStreakWeeks: 0, longestStreakWeeks: 0 },
          personalRecords: [],
          muscleDistribution: [],
        };
      }
    }

    return {
      period: {
        start: new Date(periodStart).toISOString().split("T")[0],
        end: new Date(now).toISOString().split("T")[0],
        workouts: workouts.length,
        totalSets,
      },
      volumeByMuscle,
      volumeByMuscleOverTime,
      exerciseTrends,
      rpeByWorkout,
      swapSummary,
      exerciseNotes,
      cardioSummary,
      historicalContext,
    };
  },
});

function computeMonthlyFrequency(
  workouts: Doc<"workouts">[],
  entries: Doc<"entries">[]
): Array<{ month: string; workouts: number; avgSetsPerWorkout: number }> {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  
  const monthlyData = new Map<string, { workouts: number; sets: number }>();
  
  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyData.set(key, { workouts: 0, sets: 0 });
  }

  const workoutSets = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind === "lifting") {
      const workoutId = entry.workoutId.toString();
      workoutSets.set(workoutId, (workoutSets.get(workoutId) ?? 0) + 1);
    }
  }

  for (const workout of workouts) {
    if (workout.startedAt < threeMonthsAgo.getTime()) continue;
    
    const date = new Date(workout.startedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyData.get(key);
    if (existing) {
      existing.workouts++;
      existing.sets += workoutSets.get(workout._id.toString()) ?? 0;
    }
  }

  return Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month,
      workouts: data.workouts,
      avgSetsPerWorkout: data.workouts > 0 ? Math.round(data.sets / data.workouts) : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function computeConsistency(
  workouts: Doc<"workouts">[]
): { avgWorkoutsPerWeek: number; currentStreakWeeks: number; longestStreakWeeks: number } {
  if (workouts.length === 0) {
    return { avgWorkoutsPerWeek: 0, currentStreakWeeks: 0, longestStreakWeeks: 0 };
  }

  const weeklyWorkouts = new Map<string, number>();
  for (const workout of workouts) {
    const weekKey = getWeekStart(workout.startedAt);
    weeklyWorkouts.set(weekKey, (weeklyWorkouts.get(weekKey) ?? 0) + 1);
  }

  const weeks = Array.from(weeklyWorkouts.keys()).sort();
  const totalWeeks = weeks.length;
  const totalWorkouts = workouts.length;
  const avgWorkoutsPerWeek = totalWeeks > 0 ? Math.round((totalWorkouts / totalWeeks) * 10) / 10 : 0;

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const now = new Date();
  const currentWeek = getWeekStart(now.getTime());
  const lastWeek = getWeekStart(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const allWeeks: string[] = [];
  if (weeks.length > 0) {
    const startDate = new Date(weeks[0]);
    const endDate = new Date(currentWeek);
    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 7)) {
      allWeeks.push(getWeekStart(d.getTime()));
    }
  }

  for (let i = allWeeks.length - 1; i >= 0; i--) {
    if (weeklyWorkouts.has(allWeeks[i])) {
      tempStreak++;
    } else {
      if (currentStreak === 0 && (allWeeks[i] === currentWeek || allWeeks[i] === lastWeek)) {
        continue;
      }
      if (currentStreak === 0) currentStreak = tempStreak;
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
    }
  }
  if (currentStreak === 0) currentStreak = tempStreak;
  longestStreak = Math.max(longestStreak, tempStreak);

  return { avgWorkoutsPerWeek, currentStreakWeeks: currentStreak, longestStreakWeeks: longestStreak };
}

function computePersonalRecords(
  entries: Doc<"entries">[],
  workouts: Doc<"workouts">[]
): Array<{ exercise: string; topWeight: number; topWeightDate: string; totalSessions: number }> {
  const workoutDateMap = new Map(workouts.map((w) => [w._id.toString(), w.startedAt]));
  const exerciseStats = new Map<string, {
    topWeight: number;
    topWeightDate: number;
    sessions: Set<string>;
  }>();

  for (const entry of entries) {
    if (entry.kind !== "lifting" || !entry.lifting?.weight) continue;

    const existing = exerciseStats.get(entry.exerciseName) ?? {
      topWeight: 0,
      topWeightDate: 0,
      sessions: new Set(),
    };

    existing.sessions.add(entry.workoutId.toString());

    if (entry.lifting.weight > existing.topWeight) {
      existing.topWeight = entry.lifting.weight;
      existing.topWeightDate = workoutDateMap.get(entry.workoutId.toString()) ?? 0;
    }

    exerciseStats.set(entry.exerciseName, existing);
  }

  return Array.from(exerciseStats.entries())
    .filter(([, stats]) => stats.topWeight > 0)
    .sort((a, b) => b[1].sessions.size - a[1].sessions.size)
    .slice(0, 5)
    .map(([exercise, stats]) => ({
      exercise,
      topWeight: stats.topWeight,
      topWeightDate: new Date(stats.topWeightDate).toISOString().split("T")[0],
      totalSessions: stats.sessions.size,
    }));
}

function computeMuscleDistribution(
  entries: Doc<"entries">[],
  exerciseMap: Map<string, Doc<"exercises">>,
  totalSets: number
): Array<{ muscle: string; percentage: number }> {
  if (totalSets === 0) return [];

  const muscleVolume = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind !== "lifting") continue;
    
    const exercise = exerciseMap.get(entry.exerciseName);
    const muscles = exercise?.muscleGroups ?? ["other"];
    
    for (const muscle of muscles) {
      muscleVolume.set(muscle, (muscleVolume.get(muscle) ?? 0) + 1);
    }
  }

  return Array.from(muscleVolume.entries())
    .map(([muscle, sets]) => ({
      muscle,
      percentage: Math.round((sets / totalSets) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 6);
}

function aggregateVolumeByMuscle(
  entries: Doc<"entries">[],
  exerciseMap: Map<string, Doc<"exercises">>
): Array<{ muscle: string; sets: number; avgRpe: number }> {
  const muscleStats = new Map<string, { sets: number; totalRpe: number; rpeCount: number }>();

  for (const entry of entries) {
    if (entry.kind !== "lifting") continue;

    const exercise = exerciseMap.get(entry.exerciseName);
    const muscleGroups = exercise?.muscleGroups ?? ["other"];

    for (const muscle of muscleGroups) {
      const existing = muscleStats.get(muscle) ?? { sets: 0, totalRpe: 0, rpeCount: 0 };
      existing.sets++;
      if (entry.lifting?.rpe) {
        existing.totalRpe += entry.lifting.rpe;
        existing.rpeCount++;
      }
      muscleStats.set(muscle, existing);
    }
  }

  return Array.from(muscleStats.entries())
    .map(([muscle, stats]) => ({
      muscle,
      sets: stats.sets,
      avgRpe: stats.rpeCount > 0 ? Math.round((stats.totalRpe / stats.rpeCount) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.sets - a.sets);
}

function aggregateVolumeByMuscleOverTime(
  entries: Doc<"entries">[],
  workouts: Doc<"workouts">[],
  exerciseMap: Map<string, Doc<"exercises">>
): Array<{ muscle: string; week: string; sets: number }> {
  const workoutDateMap = new Map(workouts.map((w) => [w._id, w.startedAt]));
  const weeklyMuscleVolume = new Map<string, Map<string, number>>();

  for (const entry of entries) {
    if (entry.kind !== "lifting") continue;

    const workoutDate = workoutDateMap.get(entry.workoutId);
    if (!workoutDate) continue;

    const weekStart = getWeekStart(workoutDate);
    const exercise = exerciseMap.get(entry.exerciseName);
    const muscleGroups = exercise?.muscleGroups ?? ["other"];

    for (const muscle of muscleGroups) {
      if (!weeklyMuscleVolume.has(weekStart)) {
        weeklyMuscleVolume.set(weekStart, new Map());
      }
      const weekData = weeklyMuscleVolume.get(weekStart)!;
      weekData.set(muscle, (weekData.get(muscle) ?? 0) + 1);
    }
  }

  const result: Array<{ muscle: string; week: string; sets: number }> = [];
  for (const [week, muscles] of weeklyMuscleVolume) {
    for (const [muscle, sets] of muscles) {
      result.push({ muscle, week, sets });
    }
  }

  return result.sort((a, b) => a.week.localeCompare(b.week));
}

function aggregateExerciseTrends(
  entries: Doc<"entries">[],
  workouts: Doc<"workouts">[]
): Array<{
  exercise: string;
  kind: "lifting" | "cardio" | "mobility";
  sessions: number;
  totalSets: number;
  topWeight?: number;
  avgRpe?: number;
  trend: "up" | "down" | "flat";
}> {
  const workoutDateMap = new Map(workouts.map((w) => [w._id, w.startedAt]));
  const exerciseStats = new Map<
    string,
    {
      kind: "lifting" | "cardio" | "mobility";
      sessions: Set<Id<"workouts">>;
      totalSets: number;
      topWeight: number;
      totalRpe: number;
      rpeCount: number;
      weightHistory: Array<{ date: number; weight: number }>;
    }
  >();

  for (const entry of entries) {
    const existing = exerciseStats.get(entry.exerciseName) ?? {
      kind: entry.kind,
      sessions: new Set(),
      totalSets: 0,
      topWeight: 0,
      totalRpe: 0,
      rpeCount: 0,
      weightHistory: [],
    };

    existing.sessions.add(entry.workoutId);
    
    if (entry.kind === "lifting" && entry.lifting) {
      existing.totalSets++;
      if (entry.lifting.weight && entry.lifting.weight > existing.topWeight) {
        existing.topWeight = entry.lifting.weight;
      }
      if (entry.lifting.rpe) {
        existing.totalRpe += entry.lifting.rpe;
        existing.rpeCount++;
      }
      if (entry.lifting.weight) {
        const workoutDate = workoutDateMap.get(entry.workoutId);
        if (workoutDate) {
          existing.weightHistory.push({ date: workoutDate, weight: entry.lifting.weight });
        }
      }
    }

    exerciseStats.set(entry.exerciseName, existing);
  }

  return Array.from(exerciseStats.entries())
    .map(([exercise, stats]) => ({
      exercise,
      kind: stats.kind,
      sessions: stats.sessions.size,
      totalSets: stats.totalSets,
      topWeight: stats.topWeight > 0 ? stats.topWeight : undefined,
      avgRpe: stats.rpeCount > 0 ? Math.round((stats.totalRpe / stats.rpeCount) * 10) / 10 : undefined,
      trend: calculateTrend(stats.weightHistory),
    }))
    .filter((e) => e.sessions >= 2)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);
}

function aggregateRpeByWorkout(
  entries: Doc<"entries">[],
  workouts: Doc<"workouts">[]
): Array<{ date: string; avgRpe: number }> {
  const workoutRpe = new Map<Id<"workouts">, { totalRpe: number; count: number; date: number }>();

  for (const workout of workouts) {
    workoutRpe.set(workout._id, { totalRpe: 0, count: 0, date: workout.startedAt });
  }

  for (const entry of entries) {
    if (entry.kind === "lifting" && entry.lifting?.rpe) {
      const workout = workoutRpe.get(entry.workoutId);
      if (workout) {
        workout.totalRpe += entry.lifting.rpe;
        workout.count++;
      }
    }
  }

  return Array.from(workoutRpe.entries())
    .filter(([, stats]) => stats.count > 0)
    .map(([, stats]) => ({
      date: new Date(stats.date).toISOString().split("T")[0],
      avgRpe: Math.round((stats.totalRpe / stats.count) * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateSwapSummary(
  swaps: Doc<"exerciseSwaps">[]
): Array<{ exercise: string; reason: string; count: number }> {
  const swapCounts = new Map<string, { reason: string; count: number }>();

  for (const swap of swaps) {
    const key = `${swap.originalExercise}:${swap.reason}`;
    const existing = swapCounts.get(key) ?? { reason: swap.reason, count: 0 };
    existing.count++;
    swapCounts.set(key, existing);
  }

  return Array.from(swapCounts.entries())
    .map(([key, stats]) => ({
      exercise: key.split(":")[0],
      reason: stats.reason,
      count: stats.count,
    }))
    .filter((s) => s.count >= 2)
    .sort((a, b) => b.count - a.count);
}

function aggregateCardioSummary(
  entries: Doc<"entries">[],
  exerciseMap: Map<string, Doc<"exercises">>,
  userBodyweightKg: number
): CardioSummary | undefined {
  const cardioEntries = entries.filter((e) => e.kind === "cardio" && e.cardio);
  if (cardioEntries.length === 0) return undefined;

  let totalMinutes = 0;
  let totalLoad = 0;
  let totalDistanceKm = 0;
  let vestedMinutes = 0;
  let totalRpe = 0;
  let rpeCount = 0;

  const modalityStats = new Map<string, {
    minutes: number;
    load: number;
    distance: number;
    sessions: Set<string>;
  }>();

  for (const entry of cardioEntries) {
    const cardio = entry.cardio!;
    const exercise = exerciseMap.get(entry.exerciseName);
    const modality = exercise?.modality ?? "other";
    
    const durationMinutes = cardio.durationSeconds / 60;
    totalMinutes += durationMinutes;

    const vestWeightKg = cardio.vestWeight
      ? convertToKg(cardio.vestWeight, cardio.vestWeightUnit)
      : 0;
    
    if (vestWeightKg > 0) {
      vestedMinutes += durationMinutes;
    }

    const rpe = cardio.rpe ?? cardio.intensity;
    if (rpe) {
      totalRpe += rpe;
      rpeCount++;
    }

    const load = calculateCardioLoad(
      durationMinutes,
      rpe,
      modality,
      userBodyweightKg,
      vestWeightKg
    );
    totalLoad += load;

    if (cardio.distance && cardio.distanceUnit) {
      totalDistanceKm += convertToKm(cardio.distance, cardio.distanceUnit);
    }

    const existing = modalityStats.get(modality) ?? {
      minutes: 0,
      load: 0,
      distance: 0,
      sessions: new Set(),
    };
    existing.minutes += durationMinutes;
    existing.load += load;
    if (cardio.distance && cardio.distanceUnit) {
      existing.distance += convertToKm(cardio.distance, cardio.distanceUnit);
    }
    existing.sessions.add(entry.workoutId.toString());
    modalityStats.set(modality, existing);
  }

  return {
    totalMinutes: Math.round(totalMinutes),
    totalLoad: Math.round(totalLoad),
    totalDistance: Math.round(totalDistanceKm * 10) / 10,
    distanceUnit: "km",
    byModality: Array.from(modalityStats.entries())
      .map(([modality, stats]) => ({
        modality,
        minutes: Math.round(stats.minutes),
        load: Math.round(stats.load),
        distance: Math.round(stats.distance * 10) / 10,
        sessions: stats.sessions.size,
      }))
      .sort((a, b) => b.load - a.load),
    vestedMinutes: Math.round(vestedMinutes),
    avgRpe: rpeCount > 0 ? Math.round((totalRpe / rpeCount) * 10) / 10 : 0,
  };
}

function calculateTrend(
  weightHistory: Array<{ date: number; weight: number }>
): "up" | "down" | "flat" {
  if (weightHistory.length < 2) return "flat";

  const sorted = [...weightHistory].sort((a, b) => a.date - b.date);
  const midpoint = Math.floor(sorted.length / 2);
  
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, w) => sum + w.weight, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, w) => sum + w.weight, 0) / secondHalf.length;

  const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (percentChange > 5) return "up";
  if (percentChange < -5) return "down";
  return "flat";
}

function getWeekStart(timestamp: number): string {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay();
  date.setDate(date.getDate() - dayOfWeek);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split("T")[0];
}

export const getLastAssessmentSummary = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<string | undefined> => {
    const lastAssessment = await ctx.db
      .query("assessments")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("subjectType"), "weekly_review"))
      .order("desc")
      .first();

    return lastAssessment?.summary;
  },
});

export const getExerciseContext = internalQuery({
  args: {
    userId: v.id("users"),
    exerciseName: v.string(),
  },
  handler: async (ctx, args) => {
    const exercise = await ctx.db
      .query("exercises")
      .withIndex("by_name", (q) => q.eq("name", args.exerciseName))
      .first();

    const recentEntries = await ctx.db
      .query("entries")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("exerciseName"), args.exerciseName))
      .order("desc")
      .take(9);

    const recentSessions = recentEntries
      .filter((e) => e.kind === "lifting" && e.lifting)
      .slice(0, 3)
      .map((e) => ({
        wt: e.lifting!.weight ?? 0,
        reps: e.lifting!.reps ?? 0,
        rpe: e.lifting!.rpe ?? 0,
      }));

    return {
      muscleGroups: exercise?.muscleGroups ?? [],
      equipment: exercise?.equipment?.[0] ?? "unknown",
      recentSessions,
    };
  },
});

export const getRecentMuscleVolume = internalQuery({
  args: {
    userId: v.id("users"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const periodStart = Date.now() - args.days * 24 * 60 * 60 * 1000;

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("startedAt"), periodStart)
        )
      )
      .collect();

    const entries: Doc<"entries">[] = [];
    for (const workout of workouts) {
      const workoutEntries = await ctx.db
        .query("entries")
        .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
        .collect();
      entries.push(...workoutEntries);
    }

    const exercises = await ctx.db.query("exercises").collect();
    const exerciseMap = new Map(exercises.map((e) => [e.name, e]));

    const muscleVolume = new Map<string, number>();
    for (const entry of entries) {
      if (entry.kind !== "lifting") continue;
      
      const exercise = exerciseMap.get(entry.exerciseName);
      const muscleGroups = exercise?.muscleGroups ?? [];
      
      for (const muscle of muscleGroups) {
        muscleVolume.set(muscle, (muscleVolume.get(muscle) ?? 0) + 1);
      }
    }

    return Array.from(muscleVolume.entries())
      .map(([m, s]) => ({ m, s }))
      .sort((a, b) => b.s - a.s);
  },
});

export const getSwapHistory = internalQuery({
  args: {
    userId: v.id("users"),
    exerciseName: v.string(),
  },
  handler: async (ctx, args) => {
    const swaps = await ctx.db
      .query("exerciseSwaps")
      .withIndex("by_user_exercise", (q) =>
        q.eq("userId", args.userId).eq("originalExercise", args.exerciseName)
      )
      .collect();

    return swaps;
  },
});
