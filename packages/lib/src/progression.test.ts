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
