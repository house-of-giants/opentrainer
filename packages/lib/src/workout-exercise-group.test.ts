import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	getExerciseGroup,
	getExerciseGroupKey,
} from "./workout-exercise-group";

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

	test("retrieves a rep-based lifting group from its structured key", () => {
		const descriptor = {
			name: "Bench Press",
			category: "lifting" as const,
			measurementType: "reps" as const,
		};
		const group = { storedWeight: 225 };
		const groups = new Map([[getExerciseGroupKey(descriptor), group]]);

		assert.equal(getExerciseGroup(groups, descriptor), group);
		assert.equal(
			getExerciseGroup(groups, {
				...descriptor,
				measurementType: "duration",
			}),
			undefined
		);
	});
});
