import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  describeNextSessionChange,
  firstLiftOfDay,
  formatSetTarget,
  getNextRoutineDay,
  routineDayLabel,
} from "./next-session";

const ppl = {
  _id: "ppl",
  updatedAt: 100,
  days: [{ name: "Push" }, { name: "Pull" }, { name: "Legs" }],
};
const upperLower = {
  _id: "ul",
  updatedAt: 200,
  days: [{ name: "Upper" }, { name: "Lower" }],
};

function workout(
  routineId: string | undefined,
  routineDayIndex: number | undefined,
  startedAt: number,
) {
  return { routineId, routineDayIndex, startedAt };
}

describe("getNextRoutineDay", () => {
  test("after day 1, day 2 is next", () => {
    const next = getNextRoutineDay([ppl], [workout("ppl", 0, 10)]);
    assert.equal(next?.routine._id, "ppl");
    assert.equal(next?.dayIndex, 1);
  });

  test("after the last day, day 1 is next", () => {
    const next = getNextRoutineDay([ppl], [workout("ppl", 2, 10)]);
    assert.equal(next?.dayIndex, 0);
  });

  test("uses the most recent routine workout, whatever the input order", () => {
    const next = getNextRoutineDay(
      [ppl],
      [workout("ppl", 0, 10), workout("ppl", 1, 30), workout("ppl", 2, 20)],
    );
    assert.equal(next?.dayIndex, 2);
  });

  test("skips workouts that are not from a routine", () => {
    const next = getNextRoutineDay(
      [ppl],
      [workout(undefined, undefined, 50), workout("ppl", 0, 10)],
    );
    assert.equal(next?.dayIndex, 1);
  });

  test("with no routine history, starts the most recently updated routine at day 1", () => {
    const next = getNextRoutineDay([ppl, upperLower], [workout(undefined, undefined, 10)]);
    assert.equal(next?.routine._id, "ul");
    assert.equal(next?.dayIndex, 0);
  });

  test("follows the routine the lifter used last when they switch routines", () => {
    const next = getNextRoutineDay(
      [ppl, upperLower],
      [workout("ppl", 0, 10), workout("ul", 0, 20)],
    );
    assert.equal(next?.routine._id, "ul");
    assert.equal(next?.dayIndex, 1);
  });

  test("wraps when the routine lost days since the last workout", () => {
    // The lifter did day 3 of 3, then cut the routine to 2 days.
    const shortened = { ...ppl, days: ppl.days.slice(0, 2) };
    const next = getNextRoutineDay([shortened], [workout("ppl", 2, 10)]);
    assert.equal(next?.dayIndex, 1);
  });

  test("ignores history for a routine that no longer exists", () => {
    const next = getNextRoutineDay(
      [upperLower],
      [workout("deleted", 3, 30), workout("ul", 0, 10)],
    );
    assert.equal(next?.routine._id, "ul");
    assert.equal(next?.dayIndex, 1);
  });

  test("returns null with no routine that has days", () => {
    assert.equal(getNextRoutineDay([], [workout("ppl", 0, 10)]), null);
    assert.equal(getNextRoutineDay([{ ...ppl, days: [] }], []), null);
  });
});

describe("routineDayLabel", () => {
  test("numbers the day and keeps its name", () => {
    assert.equal(routineDayLabel(1, "Lower"), "Day 2 · Lower");
  });

  test("does not repeat a name that is already the day number", () => {
    assert.equal(routineDayLabel(1, "Day 2"), "Day 2");
    assert.equal(routineDayLabel(0, "  "), "Day 1");
  });
});

describe("firstLiftOfDay", () => {
  test("skips cardio, mobility, and timed holds", () => {
    const lift = firstLiftOfDay({
      exercises: [
        { exerciseName: "Bike", kind: "cardio" },
        { exerciseName: "Hip Openers", kind: "mobility" },
        { exerciseName: "Plank", kind: "lifting", measurementType: "duration" },
        { exerciseName: "Squat", kind: "lifting", targetReps: "5" },
      ],
    });
    assert.equal(lift?.exerciseName, "Squat");
  });

  test("returns undefined for a day with no lifts", () => {
    assert.equal(
      firstLiftOfDay({ exercises: [{ exerciseName: "Run", kind: "cardio" }] }),
      undefined,
    );
  });
});

describe("formatSetTarget", () => {
  test("shows weight, unit, and reps", () => {
    assert.equal(formatSetTarget(315, 5, "lb"), "315 lb × 5");
    assert.equal(formatSetTarget(61.25, 8, "kg"), "61.25 kg × 8");
  });

  test("shows reps alone for a bodyweight set", () => {
    assert.equal(formatSetTarget(0, 12, "lb"), "12 reps");
  });
});

function result(
  last: { weight: number; reps: number },
  suggestion: {
    type: "increase_weight" | "increase_reps" | "hold" | "deload";
    targetWeight: number | null;
    targetReps: number | null;
  },
  unit: "lb" | "kg" = "lb",
) {
  return {
    lastSession: { ...last, rpe: null, date: "2026-11-10T00:00:00.000Z", unit },
    suggestion: { ...suggestion, reasoning: null },
  };
}

describe("describeNextSessionChange", () => {
  test("names the weight added", () => {
    assert.deepEqual(
      describeNextSessionChange(
        result(
          { weight: 225, reps: 5 },
          { type: "increase_weight", targetWeight: 230, targetReps: 5 },
        ),
      ),
      { change: "+5 lb", target: "230 lb × 5" },
    );
  });

  test("keeps fractional steps exact", () => {
    assert.deepEqual(
      describeNextSessionChange(
        result(
          { weight: 60, reps: 8 },
          { type: "increase_weight", targetWeight: 61.25, targetReps: 8 },
          "kg",
        ),
      ),
      { change: "+1.25 kg", target: "61.25 kg × 8" },
    );
  });

  test("names the reps added", () => {
    assert.deepEqual(
      describeNextSessionChange(
        result(
          { weight: 135, reps: 9 },
          { type: "increase_reps", targetWeight: 135, targetReps: 10 },
        ),
      ),
      { change: "+1 rep", target: "135 lb × 10" },
    );
    assert.equal(
      describeNextSessionChange(
        result(
          { weight: 135, reps: 8 },
          { type: "increase_reps", targetWeight: 135, targetReps: 10 },
        ),
      ).change,
      "+2 reps",
    );
  });

  test("says how many reps short a hold is of the target range", () => {
    assert.deepEqual(
      describeNextSessionChange(
        result(
          { weight: 135, reps: 6 },
          { type: "hold", targetWeight: 135, targetReps: 6 },
        ),
        "8-10",
      ),
      { change: "Hold, 2 reps short", target: "135 lb × 6" },
    );
  });

  test("says hold alone when the reps met the range", () => {
    assert.equal(
      describeNextSessionChange(
        result(
          { weight: 135, reps: 8 },
          { type: "hold", targetWeight: 135, targetReps: 8 },
        ),
        "8-10",
      ).change,
      "Hold",
    );
  });

  test("names the weight taken off for a deload", () => {
    assert.deepEqual(
      describeNextSessionChange(
        result(
          { weight: 200, reps: 5 },
          { type: "deload", targetWeight: 180, targetReps: 5 },
        ),
      ),
      { change: "Deload −20 lb", target: "180 lb × 5" },
    );
  });
});
