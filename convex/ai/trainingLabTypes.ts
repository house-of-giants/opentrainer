export interface TrainingLabReport {
  type: "full";
  summary: string;
  scores: {
    volumeAdherence: number;
    intensityManagement: number;
    muscleBalance: number;
    recoverySignals: number;
  };
  insights: Array<{
    category: "volume" | "intensity" | "balance" | "recovery" | "progression" | "technique";
    observation: string;
    recommendation: string;
    priority: "high" | "medium" | "low";
  }>;
  alerts: Array<{
    type: "plateau" | "overtraining" | "imbalance" | "swap_pattern" | "insufficient_data";
    exercise?: string;
    message: string;
  }>;
  chartData: {
    volumeByMuscle: Array<{ muscle: string; week: string; sets: number }>;
    rpeByWorkout: Array<{ date: string; avgRpe: number }>;
    exerciseTrends: Array<{
      exercise: string;
      sessions: number;
      trend: "up" | "down" | "flat";
      topWeight: number;
      avgRpe: number;
    }>;
  };
}

export interface TrainingSnapshot {
  type: "snapshot";
  summary: string;
  weeklyHighlights: {
    strongestArea: string;
    totalSets: number;
    avgSetsPerWorkout: number;
    standoutExercise: string | null;
  };
  historicalContext: {
    trainingAge: string;
    totalWorkouts: number;
    consistencyRating: "excellent" | "good" | "moderate" | "developing";
    primaryFocus: string;
  };
  progressIndicators: Array<{
    type: "milestone" | "trend" | "streak" | "pr_potential";
    title: string;
    message: string;
  }>;
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    area: string;
    suggestion: string;
  }>;
  lookingAhead: string;
  chartData: {
    volumeByMuscle: Array<{ muscle: string; sets: number }>;
  };
}

export interface TrainingLabCTAState {
  show: boolean;
  isPro: boolean;
  workoutsSinceLastReport: number;
  reportType: "none" | "snapshot" | "full";
  message: string;
}
