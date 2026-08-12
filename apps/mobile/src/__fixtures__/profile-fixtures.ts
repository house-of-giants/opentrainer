import type { Doc, Id } from "@opentrainer/backend";

// Shared fixtures for the profile lane tests.
export const profileUser = {
  _id: "user_1" as Id<"users">,
  _creationTime: 1_700_000_000_000,
  clerkId: "user_clerk",
  email: "dom@example.com",
  name: "Dom Trainer",
  tier: "free",
  goals: ["strength", "hypertrophy"],
  experienceLevel: "intermediate",
  equipment: ["barbell", "dumbbells", "power_rack"],
  weeklyAvailability: 4,
  sessionDuration: 60,
  preferredUnits: "lb",
  bodyweight: 185,
  bodyweightUnit: "lb",
  onboardingCompletedAt: 1_700_000_000_000,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
} as unknown as Doc<"users">;

export const profileWorkouts = [
  {
    _id: "workout_1",
    status: "completed",
    summary: { totalSets: 18, totalVolume: 12_450 },
  },
  {
    _id: "workout_2",
    status: "completed",
    summary: { totalSets: 12, totalVolume: 8_000 },
  },
  {
    _id: "workout_3",
    status: "cancelled",
    summary: { totalSets: 3, totalVolume: 500 },
  },
];
