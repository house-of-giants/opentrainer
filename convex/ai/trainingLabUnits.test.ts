import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { aggregateExerciseTrends, computePersonalRecords } from "./aggregators";
import { buildTrainingLabPayload } from "./trainingLab";
import { findRecentPersonalRecords } from "./trainingLabMutations";

const DAY_MS = 24 * 60 * 60 * 1000;
const START = Date.parse("2026-08-03T12:00:00.000Z");

function workout(id: string, offsetDays: number) {
  return {
    _id: id,
    startedAt: START + offsetDays * DAY_MS,
    completedAt: START + offsetDays * DAY_MS + 60 * 60 * 1000,
  };
}

function liftingEntry(
  workoutId: string,
  exerciseName: string,
  weight: number,
  unit: "kg" | "lb",
  rpe = 8
) {
  return {
    workoutId,
    exerciseName,
    kind: "lifting" as const,
    lifting: {
      setNumber: 1,
      reps: 5,
      weight,
      unit,
      rpe,
    },
  };
}

describe("Training Lab preferred weight units", () => {
  test("recent PRs compare mixed source units and display the user's kg preference", () => {
    const prs = findRecentPersonalRecords(
      [
        {
          workoutId: "w1",
          exercise: "Bench Press",
          weight: 225,
          unit: "lb" as const,
          workoutDate: START,
        },
        {
          workoutId: "w2",
          exercise: "Bench Press",
          weight: 100,
          unit: "kg" as const,
          workoutDate: START + DAY_MS,
        },
        {
          workoutId: "w3",
          exercise: "Bench Press",
          weight: 230,
          unit: "lb" as const,
          workoutDate: START + 2 * DAY_MS,
        },
      ],
      "kg",
      START - DAY_MS
    );

    assert.deepEqual(prs, [
      {
        exercise: "Bench Press",
        weight: 104.3,
        unit: "kg",
        date: "2026-08-05",
      },
    ]);
  });

  test("first workout progressive sets do not emit recent PRs", () => {
    const prs = findRecentPersonalRecords(
      [
        { workoutId: "w1", exercise: "Squat", weight: 185, unit: "lb", workoutDate: START },
        { workoutId: "w1", exercise: "Squat", weight: 205, unit: "lb", workoutDate: START },
        { workoutId: "w1", exercise: "Squat", weight: 225, unit: "lb", workoutDate: START },
      ],
      "lb",
      START - DAY_MS
    );

    assert.deepEqual(prs, []);
  });

  test("later progressive workout emits one PR at the session maximum", () => {
    const prs = findRecentPersonalRecords(
      [
        { workoutId: "w1", exercise: "Squat", weight: 225, unit: "lb", workoutDate: START },
        {
          workoutId: "w2",
          exercise: "Squat",
          weight: 230,
          unit: "lb",
          workoutDate: START + DAY_MS,
        },
        {
          workoutId: "w2",
          exercise: "Squat",
          weight: 245,
          unit: "lb",
          workoutDate: START + DAY_MS,
        },
        {
          workoutId: "w2",
          exercise: "Squat",
          weight: 255,
          unit: "lb",
          workoutDate: START + DAY_MS,
        },
      ],
      "lb",
      START - DAY_MS
    );

    assert.deepEqual(prs, [
      {
        exercise: "Squat",
        weight: 255,
        unit: "lb",
        date: "2026-08-04",
      },
    ]);
  });

  test("recent PR session maximum stays correct with mixed kg and lb sets", () => {
    const prs = findRecentPersonalRecords(
      [
        { workoutId: "w1", exercise: "Deadlift", weight: 315, unit: "lb", workoutDate: START },
        {
          workoutId: "w2",
          exercise: "Deadlift",
          weight: 140,
          unit: "kg",
          workoutDate: START + DAY_MS,
        },
        {
          workoutId: "w2",
          exercise: "Deadlift",
          weight: 330,
          unit: "lb",
          workoutDate: START + DAY_MS,
        },
      ],
      "kg",
      START - DAY_MS
    );

    assert.deepEqual(prs, [
      {
        exercise: "Deadlift",
        weight: 149.7,
        unit: "kg",
        date: "2026-08-04",
      },
    ]);
  });

  test("exercise trends normalize top weight and trend comparisons to preferred kg", () => {
    const workouts = [workout("w1", 0), workout("w2", 1), workout("w3", 2), workout("w4", 3)];
    const entries = [
      liftingEntry("w1", "Deadlift", 225, "lb"),
      liftingEntry("w2", "Deadlift", 100, "kg"),
      liftingEntry("w3", "Deadlift", 230, "lb"),
      liftingEntry("w4", "Deadlift", 112, "kg"),
    ];

    const trends = aggregateExerciseTrends(entries, workouts, "kg");
    const deadlift = trends.find((item) => item.exercise === "Deadlift");

    assert.equal(deadlift?.topWeight, 112);
    assert.equal(deadlift?.weightUnit, "kg");
    assert.equal(deadlift?.trend, "up");
  });

  test("historical PRs normalize top weights and carry the report unit", () => {
    const workouts = [workout("w1", 0), workout("w2", 1)];
    const entries = [
      liftingEntry("w1", "Bench Press", 225, "lb"),
      liftingEntry("w2", "Bench Press", 100, "kg"),
    ];

    const prs = computePersonalRecords(entries, workouts, "kg");

    assert.deepEqual(prs, [
      {
        exercise: "Bench Press",
        topWeight: 102.1,
        topWeightUnit: "kg",
        topWeightDate: "2026-08-03",
        totalSessions: 2,
      },
    ]);
  });

  test("AI payload declares normalized weight units for trends and historical PRs", () => {
    const payload = buildTrainingLabPayload(
      {
        goals: ["strength"],
        experienceLevel: "intermediate",
        equipment: ["barbell"],
        weeklyAvailability: 4,
      },
      {
        weightUnit: "kg",
        period: { start: "2026-08-03", end: "2026-08-10", workouts: 2, totalSets: 8 },
        volumeByMuscle: [],
        volumeByMuscleOverTime: [],
        exerciseTrends: [
          {
            exercise: "Bench Press",
            kind: "lifting",
            sessions: 2,
            totalSets: 6,
            topWeight: 102.1,
            weightUnit: "kg",
            avgRpe: 8,
            trend: "flat",
          },
        ],
        rpeByWorkout: [],
        swapSummary: [],
        exerciseNotes: [],
        historicalContext: {
          totalWorkouts: 2,
          totalSets: 8,
          trainingAgeDays: 7,
          firstWorkoutDate: "2026-08-03",
          monthlyFrequency: [],
          consistency: {
            avgWorkoutsPerWeek: 2,
            currentStreakWeeks: 1,
            longestStreakWeeks: 1,
          },
          personalRecords: [
            {
              exercise: "Bench Press",
              topWeight: 102.1,
              topWeightUnit: "kg",
              topWeightDate: "2026-08-03",
              totalSessions: 2,
            },
          ],
          muscleDistribution: [],
        },
      }
    );

    assert.equal(payload.units.wt, "kg");
    assert.equal(payload.trends[0].w, 102.1);
    assert.equal(payload.trends[0].wu, "kg");
    assert.equal(payload.hist?.prs[0].wt, 102.1);
    assert.equal(payload.hist?.prs[0].unit, "kg");
  });
});
