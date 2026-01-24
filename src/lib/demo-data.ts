// Today is Friday, Jan 23, 2026
// Weekly workouts: Mon (Jan 19), Wed (Jan 21), Fri (Jan 23 - today)
// Recent list should show (most recent first): Fri (today), Wed, Mon
export const MOCK_WORKOUTS = [
  {
    id: "1",
    title: "Heavy Pull Day",
    startedAt: Date.now() - 0.5 * 60 * 60 * 1000, // Today (Fri, Jan 23) - 30 minutes ago
    totalDurationMinutes: 68,
    totalSets: 18,
    exerciseCount: 5,
    totalVolume: 12420,
  },
  {
    id: "2",
    title: "Push Day A",
    startedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // Wed, Jan 21
    totalDurationMinutes: 52,
    totalSets: 16,
    exerciseCount: 4,
    totalVolume: 9840,
  },
  {
    id: "3",
    title: "Leg Day",
    startedAt: Date.now() - 4 * 24 * 60 * 60 * 1000, // Mon, Jan 19
    totalDurationMinutes: 72,
    totalSets: 20,
    exerciseCount: 6,
    totalVolume: 15680,
  },
];

export const MOCK_DASHBOARD_STATS = {
  weeklyGoal: 4,
  weeklyWorkoutCount: 3,
  weeklyTotalSets: 54,
  weeklyTotalVolume: 37940,
  weeklyTotalDuration: 192,
  preferredUnits: "lb" as const,
  currentWeek: [
    { date: "2026-01-19", dayName: "Mon", hasWorkout: true },
    { date: "2026-01-20", dayName: "Tue", hasWorkout: false },
    { date: "2026-01-21", dayName: "Wed", hasWorkout: true },
    { date: "2026-01-22", dayName: "Thu", hasWorkout: false },
    { date: "2026-01-23", dayName: "Fri", hasWorkout: true },
    { date: "2026-01-24", dayName: "Sat", hasWorkout: false },
    { date: "2026-01-25", dayName: "Sun", hasWorkout: false },
  ],
};

export const MOCK_TRAINING_LAB_INSIGHTS = {
  summary: "Strong progress on upper body lifts with good recovery indicators. Volume is trending upward sustainably.",
  insights: [
    {
      category: "Volume Trend",
      observation: "Your total weekly volume has increased by 12% over the last 3 weeks",
      recommendation: "Maintain this rate of progression for 2 more weeks before increasing",
      priority: "medium" as const,
    },
    {
      category: "Muscle Balance",
      observation: "Pull-to-push ratio is optimal at 1.2:1",
      recommendation: "Continue current split distribution",
      priority: "low" as const,
    },
    {
      category: "Recovery",
      observation: "Average rest between sessions is 48 hours - ideal for hypertrophy",
      recommendation: "No changes needed",
      priority: "low" as const,
    },
    {
      category: "Intensity",
      observation: "Your squat volume has plateaued for 2 weeks",
      recommendation: "Consider adding a fourth set or increasing load by 5%",
      priority: "high" as const,
    },
  ],
  scores: {
    overallProgress: 82,
    volumeAdherence: 88,
    intensityManagement: 76,
    muscleBalance: 92,
    recoveryBalance: 85,
  },
  volumeByMuscle: [
    { muscle: "chest", sets: 12 },
    { muscle: "back", sets: 14 },
    { muscle: "shoulders", sets: 9 },
    { muscle: "legs", sets: 20 },
    { muscle: "arms", sets: 8 },
    { muscle: "core", sets: 6 },
  ],
  alerts: [
    { message: "Your squat volume has dropped 25% compared to last week. Consider checking your recovery or form." },
    { message: "Upper body push/pull ratio is slightly imbalanced (0.8:1). Add 2-3 more pull sets this week." },
  ],
};
