import assert from "node:assert/strict";
import { test } from "node:test";
import { getExerciseGroupKey } from "./workout-exercise-group";
import {
	buildRepLiftingUpdate,
	createEditableLiftingSet,
} from "./workout-set-edit";

test("editing only RPE preserves the original stored weight and unit", async () => {
	const entryId = "entry-1";
	const exerciseName = "Bench Press";
	const exerciseGroups = new Map([
		[
			getExerciseGroupKey({
				name: exerciseName,
				category: "lifting",
				measurementType: "reps",
			}),
			{
				entries: [
					{
						_id: entryId,
						lifting: { weight: 225, unit: "lb" as const },
					},
				],
			},
		],
	]);
	const editingSet = createEditableLiftingSet(exerciseGroups, exerciseName, {
		entryId,
		setNumber: 1,
		reps: 8,
		weight: 102.1,
		unit: "kg",
		rpe: 7,
	});
	assert.ok(editingSet);

	let received:
		| {
				entryId: string;
				lifting: ReturnType<typeof buildRepLiftingUpdate>;
		  }
		| undefined;
	const updateLiftingEntry = async (args: NonNullable<typeof received>) => {
		received = args;
	};

	await updateLiftingEntry({
		entryId,
		lifting: buildRepLiftingUpdate(editingSet, {
			reps: 8,
			weight: 102.1,
			rpe: 8,
		}),
	});

	assert.deepEqual(received, {
		entryId,
		lifting: {
			setNumber: 1,
			reps: 8,
			weight: 225,
			unit: "lb",
			isBodyweight: undefined,
			rpe: 8,
		},
	});
});
