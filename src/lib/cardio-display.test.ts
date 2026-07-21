import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getCardioDisplaySummary } from "./cardio-display";

const draft = {
  durationSeconds: 1_200,
  distance: 1,
  distanceUnit: "mi" as const,
  rpe: 5,
};

describe("getCardioDisplaySummary", () => {
  test("normalizes persisted meter distances to kilometers", () => {
    assert.deepEqual(
      getCardioDisplaySummary(
        {
          durationSeconds: 120,
          distance: 400,
          distanceUnit: "m",
          rpe: 7,
        },
        draft
      ),
      {
        durationSeconds: 120,
        distance: 0.4,
        distanceUnit: "km",
        rpe: 7,
      }
    );
  });

  test("does not invent missing persisted distance or RPE values", () => {
    assert.deepEqual(
      getCardioDisplaySummary({ durationSeconds: 600 }, draft),
      {
        durationSeconds: 600,
        distanceUnit: undefined,
      }
    );
  });

  test("uses draft values only for a newly acknowledged log", () => {
    assert.deepEqual(getCardioDisplaySummary(undefined, draft), draft);
  });
});
