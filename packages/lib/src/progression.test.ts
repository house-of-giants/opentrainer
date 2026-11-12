import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calculateProgressionSuggestion } from "./progression";

describe("progression unit normalization", () => {
  test("normalizes mixed history before comparing sessions and suggesting weight", () => {
    const result = calculateProgressionSuggestion(
      [
        {
          workoutId: "latest",
          date: "2026-07-14T00:00:00.000Z",
          sets: [
            { setNumber: 1, weight: 100, reps: 8, rpe: null, unit: "kg" },
          ],
          bestSet: { weight: 100, reps: 8, rpe: null, unit: "kg" },
        },
        {
          workoutId: "previous",
          date: "2026-07-07T00:00:00.000Z",
          sets: [
            {
              setNumber: 1,
              weight: 100 / 0.453592,
              reps: 8,
              rpe: null,
              unit: "lb",
            },
          ],
          bestSet: {
            weight: 100 / 0.453592,
            reps: 8,
            rpe: null,
            unit: "lb",
          },
        },
      ],
      "8",
      "kg"
    );

    assert.deepEqual(result?.lastSession, {
      weight: 100,
      reps: 8,
      rpe: null,
      date: "2026-07-14T00:00:00.000Z",
      unit: "kg",
    });
    assert.deepEqual(result?.suggestion, {
      type: "increase_weight",
      targetWeight: 102.5,
      targetReps: 8,
      reasoning: "Hit 8 reps for 2 sessions. Ready to add weight.",
    });
  });

  test("reselects the heaviest set after converting a mixed-unit session", () => {
    const result = calculateProgressionSuggestion(
      [
        {
          workoutId: "mixed",
          date: "2026-07-14T00:00:00.000Z",
          sets: [
            { setNumber: 1, weight: 100, reps: 8, rpe: 8, unit: "lb" },
            { setNumber: 2, weight: 60, reps: 6, rpe: 8, unit: "kg" },
          ],
          bestSet: { weight: 100, reps: 8, rpe: 8, unit: "lb" },
        },
      ],
      undefined,
      "kg"
    );

    assert.deepEqual(result?.lastSession, {
      weight: 60,
      reps: 6,
      rpe: 8,
      date: "2026-07-14T00:00:00.000Z",
      unit: "kg",
    });
  });

  test("does not collapse distinct canonical weights that display the same", () => {
    const result = calculateProgressionSuggestion(
      [
        {
          workoutId: "latest",
          date: "2026-07-14T00:00:00.000Z",
          sets: [
            { setNumber: 1, weight: 100, reps: 8, rpe: null, unit: "kg" },
          ],
          bestSet: { weight: 100, reps: 8, rpe: null, unit: "kg" },
        },
        {
          workoutId: "previous",
          date: "2026-07-07T00:00:00.000Z",
          sets: [
            { setNumber: 1, weight: 220.4, reps: 8, rpe: null, unit: "lb" },
          ],
          bestSet: { weight: 220.4, reps: 8, rpe: null, unit: "lb" },
        },
      ],
      "8",
      "kg"
    );

    assert.equal(result?.lastSession.weight, 100);
    assert.deepEqual(result?.suggestion, {
      type: "hold",
      targetWeight: 100,
      targetReps: 8,
      reasoning: "Build consistency at this weight.",
    });
  });
});

describe("progression ignores warm-up sets", () => {
  function sessionWithWarmups(workoutId: string, date: string) {
    return {
      workoutId,
      date,
      sets: [
        { setNumber: 1, weight: 45, reps: 5, rpe: null, unit: "lb" as const, isWarmup: true },
        { setNumber: 2, weight: 135, reps: 3, rpe: null, unit: "lb" as const, isWarmup: true },
        { setNumber: 3, weight: 185, reps: 10, rpe: 8, unit: "lb" as const, isWarmup: false },
        { setNumber: 4, weight: 185, reps: 10, rpe: 8, unit: "lb" as const, isWarmup: false },
        { setNumber: 5, weight: 185, reps: 10, rpe: 8, unit: "lb" as const, isWarmup: false },
      ],
      bestSet: { weight: 185, reps: 10, rpe: 8, unit: "lb" as const },
    };
  }

  test("suggests adding weight when every work set hits the top of the range and warm-ups fall below it", () => {
    const result = calculateProgressionSuggestion(
      [
        sessionWithWarmups("latest", "2026-11-10T00:00:00.000Z"),
        sessionWithWarmups("previous", "2026-11-06T00:00:00.000Z"),
      ],
      "8-10",
      "lb"
    );

    assert.deepEqual(result?.suggestion, {
      type: "increase_weight",
      targetWeight: 190,
      targetReps: 8,
      reasoning: "Hit 10 reps for 2 sessions. Ready to add weight.",
    });
  });

  test("does not pick a heavier warm-up set as the best set", () => {
    const result = calculateProgressionSuggestion(
      [
        {
          workoutId: "latest",
          date: "2026-11-10T00:00:00.000Z",
          sets: [
            { setNumber: 1, weight: 225, reps: 1, rpe: null, unit: "lb", isWarmup: true },
            { setNumber: 2, weight: 185, reps: 8, rpe: null, unit: "lb", isWarmup: false },
          ],
          bestSet: { weight: 185, reps: 8, rpe: null, unit: "lb" },
        },
      ],
      "8-10",
      "lb"
    );

    assert.deepEqual(result?.lastSession, {
      weight: 185,
      reps: 8,
      rpe: null,
      date: "2026-11-10T00:00:00.000Z",
      unit: "lb",
    });
  });
});

describe("progression weight step", () => {
  // Two sessions that hit the top of 8-12 at an easy RPE: the "Ready to add
  // weight" branch.
  const toppedOutSessions = (weight: number, unit: "lb" | "kg") =>
    ["2026-11-10", "2026-11-03"].map((date) => ({
      workoutId: date,
      date: `${date}T00:00:00.000Z`,
      sets: [
        { setNumber: 1, weight, reps: 12, rpe: 7, unit },
        { setNumber: 2, weight, reps: 12, rpe: 7, unit },
      ],
      bestSet: { weight, reps: 12, rpe: 7, unit },
    }));

  test("adds the default 5 lb when the user has set no step", () => {
    const result = calculateProgressionSuggestion(
      toppedOutSessions(100, "lb"),
      "8-12",
      "lb"
    );
    assert.equal(result?.suggestion.type, "increase_weight");
    assert.equal(result?.suggestion.targetWeight, 105);
  });

  test("adds the user's 2.5 lb step instead of 5 lb", () => {
    const result = calculateProgressionSuggestion(
      toppedOutSessions(100, "lb"),
      "8-12",
      "lb",
      { weightStep: 2.5, unit: "lb" }
    );
    assert.equal(result?.suggestion.type, "increase_weight");
    assert.equal(result?.suggestion.targetWeight, 102.5);
  });

  test("keeps a 1.25 kg step exact instead of rounding to 0.1 kg", () => {
    const result = calculateProgressionSuggestion(
      toppedOutSessions(60, "kg"),
      "8-12",
      "kg",
      { weightStep: 1.25, unit: "kg" }
    );
    assert.equal(result?.suggestion.targetWeight, 61.25);
  });

  test("uses the custom step in the low-RPE add-weight branch", () => {
    const sessions = ["2026-11-10", "2026-11-03"].map((date) => ({
      workoutId: date,
      date: `${date}T00:00:00.000Z`,
      sets: [{ setNumber: 1, weight: 20, reps: 10, rpe: 5, unit: "lb" as const }],
      bestSet: { weight: 20, reps: 10, rpe: 5, unit: "lb" as const },
    }));
    const result = calculateProgressionSuggestion(sessions, undefined, "lb", {
      weightStep: 2.5,
      unit: "lb",
    });
    assert.equal(result?.suggestion.type, "increase_weight");
    assert.match(result?.suggestion.reasoning ?? "", /too easy/);
    assert.equal(result?.suggestion.targetWeight, 22.5);
  });

  test("uses the custom step in the no-RPE add-weight branch", () => {
    const sessions = ["2026-11-10", "2026-11-03"].map((date) => ({
      workoutId: date,
      date: `${date}T00:00:00.000Z`,
      sets: [{ setNumber: 1, weight: 20, reps: 10, rpe: null, unit: "lb" as const }],
      bestSet: { weight: 20, reps: 10, rpe: null, unit: "lb" as const },
    }));
    const result = calculateProgressionSuggestion(sessions, undefined, "lb", {
      weightStep: 2.5,
      unit: "lb",
    });
    assert.equal(result?.suggestion.type, "increase_weight");
    assert.match(result?.suggestion.reasoning ?? "", /Try adding weight/);
    assert.equal(result?.suggestion.targetWeight, 22.5);
  });

  test("falls back to the default step when the saved step is in another unit", () => {
    const result = calculateProgressionSuggestion(
      toppedOutSessions(100, "lb"),
      "8-12",
      "lb",
      { weightStep: 1.25, unit: "kg" }
    );
    assert.equal(result?.suggestion.targetWeight, 105);
  });
});
