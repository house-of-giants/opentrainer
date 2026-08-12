import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  calculateMuscleAnalytics,
  MUSCLE_RECOVERY_LOOKBACK_MS,
  MUSCLE_RECOVERY_WINDOW_MS,
  type MuscleAnalyticsEntry,
  type MuscleAnalyticsExercise,
  type MuscleAnalyticsWorkout,
} from "./muscleAnalytics";
import { getMondayWeekStartUtc } from "./week";

const NOW = Date.parse("2026-08-12T12:00:00.000Z");
const WEEK_START = getMondayWeekStartUtc(NOW);
const HOUR_MS = 60 * 60 * 1000;

function workout(
  id: string,
  startedAt: number,
  completedAt = startedAt + 60 * 60 * 1000,
  status: MuscleAnalyticsWorkout["status"] = "completed"
): MuscleAnalyticsWorkout {
  return { id, status, startedAt, completedAt };
}

function entry(
  workoutId: string,
  exerciseId: string,
  lifting: MuscleAnalyticsEntry["lifting"] = { reps: 8 }
): MuscleAnalyticsEntry {
  return {
    workoutId,
    exerciseId,
    exerciseName: exerciseId,
    kind: "lifting",
    lifting,
  };
}

function exercise(id: string, muscleGroups?: string[]): MuscleAnalyticsExercise {
  return { id, name: id, muscleGroups };
}

describe("calculateMuscleAnalytics", () => {
  test("returns empty analytics when there is no usable data", () => {
    const result = calculateMuscleAnalytics({
      now: NOW,
      weekStart: WEEK_START,
      workouts: [],
      entries: [],
      exercises: [],
    });

    assert.equal(result.totalWorkingSets, 0);
    assert.equal(result.totalMuscleSetContributions, 0);
    assert.deepEqual(result.split, []);
    assert.deepEqual(result.recovery, []);
  });

  test("aggregates multiple exercises that share a muscle", () => {
    const result = calculateMuscleAnalytics({
      now: NOW,
      weekStart: WEEK_START,
      workouts: [workout("w1", NOW - 2 * 60 * 60 * 1000)],
      entries: [
        entry("w1", "bench"),
        entry("w1", "pushup"),
        entry("w1", "row"),
      ],
      exercises: [
        exercise("bench", ["chest", "triceps"]),
        exercise("pushup", ["chest", "triceps"]),
        exercise("row", ["back"]),
      ],
    });

    assert.deepEqual(
      result.split.map(({ muscle, sets }) => ({ muscle, sets })),
      [
        { muscle: "chest", sets: 2 },
        { muscle: "triceps", sets: 2 },
        { muscle: "back", sets: 1 },
      ]
    );
    assert.equal(result.totalWorkingSets, 3);
    assert.equal(result.totalMuscleSetContributions, 5);
  });

  test("deduplicates repeated muscles on one exercise before counting a set", () => {
    const result = calculateMuscleAnalytics({
      now: NOW,
      weekStart: WEEK_START,
      workouts: [workout("w1", NOW - 2 * 60 * 60 * 1000)],
      entries: [entry("w1", "bench")],
      exercises: [exercise("bench", ["chest", "Chest", " chest ", "triceps"])],
    });

    assert.deepEqual(
      result.split.map(({ muscle, sets }) => ({ muscle, sets })),
      [
        { muscle: "chest", sets: 1 },
        { muscle: "triceps", sets: 1 },
      ]
    );
  });

  test("counts a workout that starts before Monday and completes after Monday in this week's split", () => {
    const completedAfterWeekStart = WEEK_START + HOUR_MS / 2;
    const result = calculateMuscleAnalytics({
      now: NOW,
      weekStart: WEEK_START,
      workouts: [
        workout("cross-monday", WEEK_START - HOUR_MS / 2, completedAfterWeekStart),
      ],
      entries: [entry("cross-monday", "bench")],
      exercises: [exercise("bench", ["chest"])],
    });

    assert.equal(result.totalWorkingSets, 1);
    assert.deepEqual(
      result.split.map(({ muscle, sets }) => ({ muscle, sets })),
      [{ muscle: "chest", sets: 1 }]
    );
    assert.equal(result.recovery[0]?.lastTrainedAt, completedAfterWeekStart);
  });

  test("calculates estimated recovery at 0, 24, and 48+ hour boundaries", () => {
    const result = calculateMuscleAnalytics({
      now: NOW,
      weekStart: WEEK_START,
      workouts: [
        workout("w0", NOW - 60 * 60 * 1000, NOW),
        workout("w24", NOW - 25 * 60 * 60 * 1000, NOW - 24 * 60 * 60 * 1000),
        workout("w48", NOW - 49 * 60 * 60 * 1000, NOW - MUSCLE_RECOVERY_WINDOW_MS),
        workout("w72", NOW - 73 * 60 * 60 * 1000, NOW - 72 * 60 * 60 * 1000),
      ],
      entries: [
        entry("w0", "chest"),
        entry("w24", "back"),
        entry("w48", "legs"),
        entry("w72", "shoulders"),
      ],
      exercises: [
        exercise("chest", ["chest"]),
        exercise("back", ["back"]),
        exercise("legs", ["legs"]),
        exercise("shoulders", ["shoulders"]),
      ],
    });

    const recoveryByMuscle = new Map(
      result.recovery.map((item) => [item.muscle, item.recoveryPercent])
    );

    assert.equal(recoveryByMuscle.get("chest"), 0);
    assert.equal(recoveryByMuscle.get("back"), 50);
    assert.equal(recoveryByMuscle.get("legs"), 100);
    assert.equal(recoveryByMuscle.get("shoulders"), 100);
  });

  test("excludes muscles outside the 14-day recovery lookback when given wider workout data", () => {
    const oldCompletedAt = NOW - MUSCLE_RECOVERY_LOOKBACK_MS - HOUR_MS;
    const result = calculateMuscleAnalytics({
      now: NOW,
      weekStart: WEEK_START,
      workouts: [
        workout("old", oldCompletedAt - HOUR_MS, oldCompletedAt),
        workout("recent", NOW - 2 * HOUR_MS, NOW - HOUR_MS),
      ],
      entries: [
        entry("old", "deadlift"),
        entry("recent", "bench"),
      ],
      exercises: [
        exercise("deadlift", ["hamstrings"]),
        exercise("bench", ["chest"]),
      ],
    });

    assert.deepEqual(result.recovery.map(({ muscle }) => muscle), ["chest"]);
  });

  test("uses completed working sets, skips warmups and future workouts, and counts timed strength sets", () => {
    const future = NOW + 60 * 60 * 1000;
    const result = calculateMuscleAnalytics({
      now: NOW,
      weekStart: WEEK_START,
      workouts: [
        workout("done", NOW - 2 * 60 * 60 * 1000),
        workout("active", NOW - 2 * 60 * 60 * 1000, undefined, "in_progress"),
        workout("future", future, future + 60 * 60 * 1000),
      ],
      entries: [
        entry("done", "plank", { durationSeconds: 45, unit: "lb" }),
        entry("done", "bench", { reps: 5, isWarmup: true }),
        entry("done", "unknown"),
        entry("active", "bench"),
        entry("future", "bench"),
      ],
      exercises: [
        exercise("plank", ["core"]),
        exercise("bench", ["chest"]),
      ],
    });

    assert.equal(result.totalWorkingSets, 2);
    assert.equal(result.unmappedWorkingSets, 1);
    assert.deepEqual(
      result.split.map(({ muscle, sets, isUnmapped }) => ({ muscle, sets, isUnmapped })),
      [
        { muscle: "core", sets: 1, isUnmapped: false },
        { muscle: "unmapped", sets: 1, isUnmapped: true },
      ]
    );
    assert.deepEqual(result.recovery.map(({ muscle }) => muscle), ["core"]);
  });
});
