import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isValidWeightStep, resolveWeightStep } from "./weight-step";

describe("resolveWeightStep", () => {
  test("defaults to 5 lb and 2.5 kg when the user has set no step", () => {
    assert.equal(resolveWeightStep("lb", null), 5);
    assert.equal(resolveWeightStep("kg", undefined), 2.5);
  });

  test("uses the saved step when its unit matches", () => {
    assert.equal(resolveWeightStep("lb", { weightStep: 2.5, unit: "lb" }), 2.5);
    assert.equal(resolveWeightStep("kg", { weightStep: 1.25, unit: "kg" }), 1.25);
  });

  test("ignores a saved step in the other unit", () => {
    assert.equal(resolveWeightStep("kg", { weightStep: 2.5, unit: "lb" }), 2.5);
    assert.equal(resolveWeightStep("lb", { weightStep: 1, unit: "kg" }), 5);
  });
});

describe("isValidWeightStep", () => {
  test("accepts positive steps up to the maximum", () => {
    assert.equal(isValidWeightStep(0.5), true);
    assert.equal(isValidWeightStep(50), true);
  });

  test("rejects zero, negative, too large, and non-finite steps", () => {
    for (const step of [0, -2.5, 50.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(isValidWeightStep(step), false, `step ${step}`);
    }
  });
});
