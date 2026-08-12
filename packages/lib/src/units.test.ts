import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  calculateVolumeInUnit,
  convertWeight,
  displayWeight,
  editedWeightForStorage,
} from "./units";

describe("weight units", () => {
  test("converts pounds and kilograms for display", () => {
    assert.equal(displayWeight(225, "lb", "kg"), 102.1);
    assert.equal(displayWeight(100, "kg", "lb"), 220.5);
  });

  test("leaves same-unit source values unchanged before display rounding", () => {
    assert.equal(convertWeight(42.25, "lb", "lb"), 42.25);
    assert.equal(convertWeight(42.25, "kg", "kg"), 42.25);
  });

  test("sums mixed-unit volume in the requested unit without per-set rounding", () => {
    const sets = [
      { weight: 100, reps: 10, unit: "lb" as const },
      { weight: 100, reps: 10, unit: "kg" as const },
      { reps: 8, unit: "lb" as const },
    ];

    assert.ok(Math.abs(calculateVolumeInUnit(sets, "kg") - 1453.592) < 1e-6);
    assert.ok(Math.abs(calculateVolumeInUnit(sets, "lb") - 3204.62) < 1e-6);
  });

  test("preserves a legacy source value unless its displayed weight changes", () => {
    assert.equal(
      editedWeightForStorage({
        displayedWeight: 102.1,
        displayUnit: "kg",
        storedUnit: "lb",
        originalDisplayedWeight: 102.1,
        originalStoredWeight: 225,
      }),
      225
    );
    assert.equal(
      editedWeightForStorage({
        displayedWeight: 102.6,
        displayUnit: "kg",
        storedUnit: "lb",
        originalDisplayedWeight: 102.1,
        originalStoredWeight: 225,
      }),
      226
    );
  });
});
