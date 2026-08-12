import type { MuscleAnalyticsResult } from "@opentrainer/backend/convex/lib/muscleAnalytics";

// Fixtures for the Training Lab screen and component tests. The muscle
// analytics fixture mirrors apps/web/src/components/training-lab/
// muscle-analytics-section.test.tsx so mobile transforms are verified against
// web-identical data.
export const GENERATED_AT = Date.parse("2026-08-11T18:00:00.000Z");

export const muscleAnalyticsFixture: MuscleAnalyticsResult = {
  generatedAt: GENERATED_AT,
  weekStart: Date.parse("2026-08-10T00:00:00.000Z"),
  weekEnd: Date.parse("2026-08-16T23:59:59.999Z"),
  recoveryWindowHours: 48,
  recoveryLookbackDays: 14,
  totalWorkingSets: 18,
  totalMuscleSetContributions: 24,
  unmappedWorkingSets: 2,
  split: [],
  recovery: [],
  workload: [
    {
      muscle: "core",
      label: "Core",
      setsThisWeek: 6,
      lastTrainedAt: Date.parse("2026-08-11T16:00:00.000Z"),
      lastTrainedDate: "2026-08-11",
      isUnmapped: false,
    },
    {
      muscle: "back",
      label: "Back",
      setsThisWeek: 5,
      lastTrainedAt: Date.parse("2026-08-10T17:00:00.000Z"),
      lastTrainedDate: "2026-08-10",
      isUnmapped: false,
    },
    {
      muscle: "chest",
      label: "Chest",
      setsThisWeek: 4,
      lastTrainedAt: Date.parse("2026-08-11T15:00:00.000Z"),
      lastTrainedDate: "2026-08-11",
      isUnmapped: false,
    },
    {
      muscle: "quads",
      label: "Quads",
      setsThisWeek: 0,
      lastTrainedAt: Date.parse("2026-08-07T18:00:00.000Z"),
      lastTrainedDate: "2026-08-07",
      isUnmapped: false,
    },
    {
      muscle: "unmapped",
      label: "Unmapped",
      setsThisWeek: 2,
      lastTrainedAt: null,
      lastTrainedDate: null,
      isUnmapped: true,
    },
  ],
};

export const ctaStateFixture = {
  show: true,
  isPro: true,
  workoutsSinceLastReport: 2,
  totalWorkouts: 12,
  hasReport: true,
  canGenerate: true,
  message: "New workouts logged since your last analysis.",
  dataRangeDays: 7,
};

export const fullReportFixture = {
  type: "full" as const,
  summary: "Strong week with balanced pushing and pulling volume.",
  scores: {
    volumeAdherence: 82,
    intensityManagement: 74,
    muscleBalance: 68,
    recoveryBalance: 90,
  },
  insights: [
    {
      category: "volume" as const,
      observation: "Chest volume increased 20% over the period.",
      recommendation: "Hold chest volume steady next week.",
      priority: "high" as const,
    },
    {
      category: "recovery" as const,
      observation: "Rest days were well spaced.",
      recommendation: "Keep the current split.",
      priority: "low" as const,
    },
  ],
  alerts: [
    {
      type: "imbalance" as const,
      message: "Pulling volume lags pushing volume this period.",
    },
  ],
  chartData: {
    weightUnit: "lb" as const,
    volumeByMuscle: [
      { muscle: "chest", week: "2026-08-03", sets: 6 },
      { muscle: "chest", week: "2026-08-10", sets: 4 },
      { muscle: "back", week: "2026-08-10", sets: 8 },
    ],
    rpeByWorkout: [
      { date: "2026-08-04", avgRpe: 7.2 },
      { date: "2026-08-07", avgRpe: 7.8 },
      { date: "2026-08-10", avgRpe: 8.1 },
    ],
    exerciseTrends: [
      {
        exercise: "Bench Press",
        sessions: 3,
        trend: "up" as const,
        topWeight: 185,
        weightUnit: "lb" as const,
        avgRpe: 7.5,
      },
    ],
  },
};

export const dashboardStatsFixture = {
  preferredUnits: "lb" as const,
  workoutsThisWeek: 3,
  weeklyTarget: 4,
  totalSetsThisWeek: 42,
  currentStreakWeeks: 5,
  longestStreakWeeks: 8,
  volumeChangePercent: 12,
  recentPRs: [
    { exercise: "Bench Press", weight: 185, unit: "lb" as const, date: "2026-08-10" },
  ],
  trainingProfile: "strength_focused" as const,
  trainingLoad: {
    total: 1240,
    liftingLoad: 980,
    cardioLoad: 260,
    liftingPercent: 79,
    cardioPercent: 21,
    changePercent: 8,
  },
  cardioSummary: {
    totalMinutes: 85,
    totalDistance: 12.4,
    distanceUnit: "km" as const,
    avgRpe: 6.5,
    topModality: "running",
  },
  muscleAnalytics: muscleAnalyticsFixture,
};
