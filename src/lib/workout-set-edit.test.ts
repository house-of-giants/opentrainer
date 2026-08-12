import assert from "node:assert/strict";
import { test } from "node:test";
import { getExerciseGroupKey } from "./workout-exercise-group";
import {
	buildRepLiftingUpdate,
	buildTimedLiftingUpdate,
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
			isWarmup: undefined,
		},
	});
});

const warmupExerciseGroups = (entryId: string, exerciseName: string) =>
	new Map([
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
						lifting: { weight: 135, unit: "lb" as const, isWarmup: true },
					},
				],
			},
		],
	]);

test("createEditableLiftingSet hydrates the stored warmup flag", () => {
	const editingSet = createEditableLiftingSet(
		warmupExerciseGroups("entry-1", "Bench Press"),
		"Bench Press",
		{ entryId: "entry-1", setNumber: 1, reps: 5, weight: 135, unit: "lb" }
	);
	assert.ok(editingSet);
	assert.equal(editingSet.isWarmup, true);
});

test("buildRepLiftingUpdate preserves stored warmup flag when omitted from data", () => {
	const editingSet = createEditableLiftingSet(
		warmupExerciseGroups("entry-1", "Bench Press"),
		"Bench Press",
		{ entryId: "entry-1", setNumber: 1, reps: 5, weight: 135, unit: "lb" }
	);
	assert.ok(editingSet);

	const update = buildRepLiftingUpdate(editingSet, { reps: 6, weight: 135 });
	assert.equal(update.isWarmup, true);
});

test("buildRepLiftingUpdate lets an explicit false clear the warmup flag", () => {
	const editingSet = createEditableLiftingSet(
		warmupExerciseGroups("entry-1", "Bench Press"),
		"Bench Press",
		{ entryId: "entry-1", setNumber: 1, reps: 5, weight: 135, unit: "lb" }
	);
	assert.ok(editingSet);

	const update = buildRepLiftingUpdate(editingSet, {
		reps: 5,
		weight: 135,
		isWarmup: false,
	});
	assert.equal(update.isWarmup, false);
});

test("buildTimedLiftingUpdate preserves stored unit and warmup flag", () => {
	const update = buildTimedLiftingUpdate(
		{
			entryId: "entry-1",
			exerciseName: "Plank",
			setNumber: 2,
			reps: 0,
			weight: 0,
			unit: "kg",
			storedUnit: "lb",
			isWarmup: true,
		},
		{ durationSeconds: 45, rpe: null }
	);

	assert.deepEqual(update, {
		setNumber: 2,
		durationSeconds: 45,
		unit: "lb",
		rpe: undefined,
		isWarmup: true,
	});
});
