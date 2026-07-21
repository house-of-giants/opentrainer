import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getExerciseGroupKey } from "./workout-exercise-group";

describe("getExerciseGroupKey", () => {
	test("separates rep and timed lifting rows with the same name", () => {
		const repKey = getExerciseGroupKey({
			name: "Plank",
			category: "lifting",
			measurementType: "reps",
		});
		const durationKey = getExerciseGroupKey({
			name: "Plank",
			category: "lifting",
			measurementType: "duration",
		});

		assert.notEqual(repKey, durationKey);
	});

	test("keeps the missing measurement type backward compatible with reps", () => {
		assert.equal(
			getExerciseGroupKey({ name: "Squat", category: "lifting" }),
			getExerciseGroupKey({
				name: "Squat",
				category: "lifting",
				measurementType: "reps",
			})
		);
	});
});
