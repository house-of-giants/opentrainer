import type { Doc, Id } from "@opentrainer/backend";

// Shared fixture Docs for the workout-detail lane tests.
const WORKOUT_ID = "workout_1" as Id<"workouts">;
const USER_ID = "user_1" as Id<"users">;

type EntryOverrides = Omit<Partial<Doc<"entries">>, "_id"> & { _id: string };

export function makeEntry(overrides: EntryOverrides): Doc<"entries"> {
  const { _id, ...rest } = overrides;
  return {
    _id: _id as Id<"entries">,
    _creationTime: 1_700_000_000_000,
    workoutId: WORKOUT_ID,
    userId: USER_ID,
    exerciseName: "Bench Press",
    kind: "lifting",
    createdAt: 1_700_000_000_000,
    ...rest,
  } as Doc<"entries">;
}

export const liftingEntries: Doc<"entries">[] = [
  makeEntry({
    _id: "entry_1",
    createdAt: 1,
    lifting: { setNumber: 1, reps: 10, weight: 135, unit: "lb", isWarmup: true },
  }),
  makeEntry({
    _id: "entry_2",
    createdAt: 2,
    lifting: { setNumber: 2, reps: 8, weight: 185, unit: "lb", rpe: 8 },
  }),
  makeEntry({
    _id: "entry_3",
    createdAt: 3,
    lifting: { setNumber: 3, durationSeconds: 90, unit: "lb" },
  }),
];

export const cardioEntry = makeEntry({
  _id: "entry_4",
  exerciseName: "Treadmill",
  kind: "cardio",
  createdAt: 4,
  cardio: {
    mode: "steady",
    durationSeconds: 1_530,
    intensity: 6,
    vestWeight: 20,
    vestWeightUnit: "lb",
  },
});

export const mobilityEntry = makeEntry({
  _id: "entry_5",
  exerciseName: "Couch Stretch",
  kind: "mobility",
  createdAt: 5,
  mobility: { sets: 2, holdSeconds: 60, perSide: true },
});

export const workoutDoc = {
  _id: WORKOUT_ID,
  _creationTime: 1_700_000_000_000,
  userId: USER_ID,
  status: "completed" as const,
  title: "Push Day",
  notes: "Felt strong",
  startedAt: Date.UTC(2026, 0, 15, 17, 30),
  completedAt: Date.UTC(2026, 0, 15, 18, 35),
  summary: {
    totalDurationMinutes: 65,
    totalVolume: 12_450,
    totalSets: 3,
    totalCardioDurationSeconds: 1_530,
    totalDistanceKm: 3.2,
  },
  exerciseNotes: [{ exerciseName: "Bench Press", note: "Pause at chest" }],
  createdAt: 1_700_000_000_000,
  entries: [...liftingEntries, cardioEntry, mobilityEntry],
};

export const proUser = {
  _id: USER_ID,
  tier: "pro" as const,
  preferredUnits: "lb" as const,
};
