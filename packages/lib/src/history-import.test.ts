import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildImportKey,
  buildImportPlan,
  chunkWorkouts,
  guessColumnMapping,
  matchExerciseName,
  parseDurationText,
  parseImportDate,
  parseImportNumber,
  unitFromHeader,
} from "./history-import";

function localParts(ms: number | undefined) {
  assert.notEqual(ms, undefined);
  const d = new Date(ms!);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];
}

describe("parseImportDate", () => {
  test("reads a zone-less date and time as local time", () => {
    assert.deepEqual(localParts(parseImportDate("2023-01-15 08:03:21")), [2023, 1, 15, 8, 3, 21]);
    assert.deepEqual(localParts(parseImportDate("2023-01-15T08:03")), [2023, 1, 15, 8, 3, 0]);
    assert.deepEqual(localParts(parseImportDate("2023-01-15")), [2023, 1, 15, 0, 0, 0]);
  });

  test("reads Hevy's day-month-year format as local time", () => {
    assert.deepEqual(localParts(parseImportDate("15 Jan 2023, 08:03")), [2023, 1, 15, 8, 3, 0]);
    assert.deepEqual(localParts(parseImportDate("3 Sept 2024, 18:45")), [2024, 9, 3, 18, 45, 0]);
  });

  test("keeps the exact instant of an ISO date with a zone", () => {
    assert.equal(parseImportDate("2024-03-18T07:30:00.123Z"), Date.UTC(2024, 2, 18, 7, 30, 0, 123));
    assert.equal(parseImportDate("2024-03-18T09:30:00+02:00"), Date.UTC(2024, 2, 18, 7, 30));
  });

  test("rejects dates it can't read without guessing", () => {
    assert.equal(parseImportDate(""), undefined);
    assert.equal(parseImportDate("03/04/2024"), undefined);
    assert.equal(parseImportDate("2024-02-30"), undefined);
    assert.equal(parseImportDate("yesterday"), undefined);
  });
});

describe("cell parsing", () => {
  test("parses workout lengths", () => {
    assert.equal(parseDurationText("1h 5m"), 3900);
    assert.equal(parseDurationText("45m"), 2700);
    assert.equal(parseDurationText("30s"), 30);
    assert.equal(parseDurationText("01:05:00"), 3900);
    assert.equal(parseDurationText("3900"), 3900);
    assert.equal(parseDurationText("about an hour"), undefined);
  });

  test("parses decimal commas and thousands separators", () => {
    assert.equal(parseImportNumber("102,5"), 102.5);
    assert.equal(parseImportNumber("1,000"), 1000);
    assert.equal(parseImportNumber("102.5"), 102.5);
    assert.equal(parseImportNumber(""), undefined);
    assert.equal(parseImportNumber("heavy"), undefined);
  });

  test("reads the unit from a weight header", () => {
    assert.equal(unitFromHeader("weight_kg"), "kg");
    assert.equal(unitFromHeader("weight_lbs"), "lb");
    assert.equal(unitFromHeader("Weight (lb)"), "lb");
    assert.equal(unitFromHeader("Weight"), undefined);
  });
});

describe("guessColumnMapping", () => {
  test("maps a plain spreadsheet header by name", () => {
    assert.deepEqual(guessColumnMapping(["Date", "Exercise", "Weight", "Reps", "RPE", "Notes"]), {
      date: 0,
      exercise: 1,
      weight: 2,
      reps: 3,
      rpe: 4,
      notes: 5,
    });
  });
});

describe("buildImportPlan", () => {
  const now = Date.UTC(2030, 0, 1);
  const mapping = { date: 0, workoutTitle: 1, exercise: 2, setNumber: 3, weight: 4, unit: 5, reps: 6, durationSeconds: 7, rpe: 8, notes: 9, distance: 10 };

  test("groups rows into workouts by date and name and counts sets per exercise", () => {
    const plan = buildImportPlan(
      [
        ["2024-03-18 07:30:00", "Legs", "Squat", "W", "60", "kg", "5", "", "", "", ""],
        ["2024-03-18 07:30:00", "Legs", "Squat", "1", "100", "kg", "5", "", "8", "belt", ""],
        ["2024-03-18 07:30:00", "Legs", "Plank", "1", "0", "", "0", "60", "", "", ""],
        ["2024-03-20 18:00:00", "Push", "bench press", "1", "225", "lb", "5", "", "", "", ""],
        ["2024-03-20 18:00:00", "Push", "Bench Press", "2", "225", "lbs", "4", "", "11", "", ""],
      ],
      { mapping, defaultUnit: "kg" },
      { now }
    );

    assert.equal(plan.workouts.length, 2);
    assert.equal(plan.setCount, 5);
    assert.deepEqual(plan.skipped, []);
    const [legs, push] = plan.workouts;
    assert.equal(legs.title, "Legs");
    assert.deepEqual(legs.sets[0], { exerciseName: "Squat", unit: "kg", reps: 5, weight: 60, isWarmup: true });
    assert.deepEqual(legs.sets[1], { exerciseName: "Squat", unit: "kg", reps: 5, weight: 100, rpe: 8, notes: "belt" });
    // Zero reps with a time is a timed set; zero weight is no weight.
    assert.deepEqual(legs.sets[2], { exerciseName: "Plank", unit: "kg", durationSeconds: 60 });
    // An RPE outside 1 to 10 is dropped, the set is kept.
    assert.equal(push.sets[1].rpe, undefined);
    assert.deepEqual(
      push.sets.map((s) => [s.weight, s.unit, s.reps]),
      [
        [225, "lb", 5],
        [225, "lb", 4],
      ]
    );
    assert.deepEqual(plan.exerciseNames, [
      { name: "bench press", setCount: 2, timed: false },
      { name: "Plank", setCount: 1, timed: true },
      { name: "Squat", setCount: 2, timed: false },
    ]);
  });

  test("lists every row it can't import with its row number and reason", () => {
    const plan = buildImportPlan(
      [
        ["not a date", "Legs", "Squat", "1", "100", "kg", "5", "", "", "", ""],
        ["2024-03-18", "Legs", "", "1", "100", "kg", "5", "", "", "", ""],
        ["2024-03-18", "Legs", "Running", "1", "", "", "", "1800", "", "", "5"],
        ["2024-03-18", "Legs", "Squat", "Rest Timer", "", "", "", "90", "", "", ""],
        ["2024-03-18", "Legs", "Squat", "1", "100", "kg", "", "", "", "", ""],
        ["2031-01-01", "Legs", "Squat", "1", "100", "kg", "5", "", "", "", ""],
      ],
      { mapping, defaultUnit: "kg" },
      { now }
    );

    assert.equal(plan.workouts.length, 0);
    assert.deepEqual(plan.skipped, [
      { row: 2, reason: "no_date" },
      { row: 3, reason: "no_exercise" },
      { row: 4, reason: "cardio" },
      { row: 5, reason: "rest_timer" },
      { row: 6, reason: "no_reps_or_time" },
      { row: 7, reason: "future_date" },
    ]);
  });

  test("keeps a note on every set that has one", () => {
    const plan = buildImportPlan(
      [
        ["2024-03-18", "Squat", "5", "paused"],
        ["2024-03-18", "Squat", "5", "paused"],
      ],
      { mapping: { date: 0, exercise: 1, reps: 2, notes: 3 }, defaultUnit: "lb" },
      { now }
    );

    assert.deepEqual(plan.workouts[0].sets.map((s) => s.notes), ["paused", "paused"]);
  });

  test("ends a workout at its end time or after its length", () => {
    const start = "2024-03-18 07:30:00";
    const withEnd = buildImportPlan(
      [[start, "Squat", "5", "2024-03-18 08:35:00"]],
      { mapping: { date: 0, exercise: 1, reps: 2, workoutEnd: 3 }, defaultUnit: "lb" },
      { now }
    );
    const withLength = buildImportPlan(
      [[start, "Squat", "5", "1h 5m"]],
      { mapping: { date: 0, exercise: 1, reps: 2, workoutDuration: 3 }, defaultUnit: "lb" },
      { now }
    );

    for (const plan of [withEnd, withLength]) {
      const [workout] = plan.workouts;
      assert.equal(workout.completedAt! - workout.startedAt, 65 * 60_000);
    }
  });
});

describe("matchExerciseName", () => {
  const exercises = [
    { _id: "bench", name: "Bench Press", aliases: ["Barbell Bench Press"], equipment: ["barbell", "bench"] },
    { _id: "db-bench", name: "Dumbbell Bench Press", equipment: ["dumbbell", "bench"] },
    { _id: "db-curl", name: "Dumbbell Curl", aliases: ["Bicep Curl"], equipment: ["dumbbell"] },
    { _id: "pulldown", name: "Lat Pulldown", equipment: ["cable"] },
  ];

  test("matches a name or alias exactly, ignoring case and spacing", () => {
    assert.deepEqual(matchExerciseName("bench  press", exercises), { exerciseId: "bench", kind: "exact" });
    assert.deepEqual(matchExerciseName("Bicep Curl", exercises), { exerciseId: "db-curl", kind: "exact" });
  });

  test("suggests a match for an equipment suffix", () => {
    assert.deepEqual(matchExerciseName("Bench Press (Dumbbell)", exercises), { exerciseId: "db-bench", kind: "suggested" });
    assert.deepEqual(matchExerciseName("Bench Press (Barbell)", exercises), { exerciseId: "bench", kind: "suggested" });
    assert.deepEqual(matchExerciseName("Lat Pulldown (Cable)", exercises), { exerciseId: "pulldown", kind: "suggested" });
  });

  test("does not suggest an exercise that uses other equipment", () => {
    assert.equal(matchExerciseName("Bicep Curl (Barbell)", exercises), null);
    assert.equal(matchExerciseName("Zercher Squat", exercises), null);
  });
});

describe("batches", () => {
  test("splits workouts so no batch passes the workout or set limit", () => {
    const workouts = [3, 3, 3, 1, 1].map((n) => ({ sets: Array.from({ length: n }) }));

    const batches = chunkWorkouts(workouts, { workouts: 2, sets: 6 });

    assert.deepEqual(
      batches.map((b) => b.map((w) => w.sets.length)),
      [[3, 3], [3, 1], [1]]
    );
  });

  test("builds the same import key for the same start time and name", () => {
    assert.equal(buildImportKey(1, "Push Day"), buildImportKey(1, " push  day "));
    assert.notEqual(buildImportKey(1, "Push Day"), buildImportKey(2, "Push Day"));
  });
});
