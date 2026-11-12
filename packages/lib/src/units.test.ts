import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  calculateVolumeInUnit,
  convertWeight,
  defaultUnitForLocale,
  defaultUnitForRegion,
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

describe("default unit from locale", () => {
  test("uses lb only for regions on US customary units", () => {
    for (const region of ["US", "LR", "MM", "us"]) {
      assert.equal(defaultUnitForRegion(region), "lb", region);
    }
    for (const region of ["GB", "CA", "DE", "AU", "IN", "JP", "BR"]) {
      assert.equal(defaultUnitForRegion(region), "kg", region);
    }
  });

  test("falls back to kg when the region is unknown", () => {
    assert.equal(defaultUnitForRegion(undefined), "kg");
    assert.equal(defaultUnitForRegion(null), "kg");
    assert.equal(defaultUnitForRegion(""), "kg");
  });

  test("reads the region from a locale tag", () => {
    assert.equal(defaultUnitForLocale("en-US"), "lb");
    assert.equal(defaultUnitForLocale("es-US"), "lb");
    assert.equal(defaultUnitForLocale("en-GB"), "kg");
    assert.equal(defaultUnitForLocale("fr-CA"), "kg");
    assert.equal(defaultUnitForLocale("de-DE"), "kg");
  });

  test("infers the likely region when the tag has none", () => {
    assert.equal(defaultUnitForLocale("en"), "lb");
    assert.equal(defaultUnitForLocale("de"), "kg");
    assert.equal(defaultUnitForLocale("ja"), "kg");
  });

  test("falls back to kg for a missing or invalid tag", () => {
    assert.equal(defaultUnitForLocale(undefined), "kg");
    assert.equal(defaultUnitForLocale(""), "kg");
    assert.equal(defaultUnitForLocale("not a locale!"), "kg");
  });
});
