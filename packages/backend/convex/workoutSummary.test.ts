import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Doc } from "./_generated/dataModel";
import { buildWorkoutSummary } from "./workoutSummary";

function liftingSet(weight: number, reps: number, unit: "kg" | "lb"): Doc<"entries"> {
	return {
		exerciseName: "Bench Press",
		kind: "lifting",
		lifting: { setNumber: 1, weight, reps, unit },
	} as Doc<"entries">;
}

const START = Date.UTC(2026, 10, 10, 14, 0);
const END = START + 60 * 60_000;

describe("buildWorkoutSummary totalVolume", () => {
	test("stores kg sets as pounds: 100 kg x 5 is about 1102.3 lb, not 500", () => {
		const summary = buildWorkoutSummary([liftingSet(100, 5, "kg")], START, END);

		assert.ok(summary.totalVolume !== undefined);
		assert.ok(
			Math.abs(summary.totalVolume - 1102.31) < 0.01,
			`expected about 1102.31 lb, got ${summary.totalVolume}`
		);
	});

	test("adds lb and kg sets in one workout as pounds", () => {
		const summary = buildWorkoutSummary(
			[liftingSet(225, 5, "lb"), liftingSet(100, 5, "kg")],
			START,
			END
		);

		// 225 lb x 5 = 1125 lb, plus 100 kg x 5 = 500 kg = 1102.31 lb.
		assert.ok(summary.totalVolume !== undefined);
		assert.ok(
			Math.abs(summary.totalVolume - 2227.31) < 0.01,
			`expected about 2227.31 lb, got ${summary.totalVolume}`
		);
	});

	test("keeps an lb-only workout unchanged", () => {
		const summary = buildWorkoutSummary(
			[liftingSet(135, 5, "lb"), liftingSet(225, 3, "lb")],
			START,
			END
		);

		assert.equal(summary.totalVolume, 135 * 5 + 225 * 3);
	});
});
