import assert from "node:assert/strict";
import { test } from "node:test";
import {
	editorExerciseToRoutineExercise,
	routineExerciseToEditorFields,
} from "./routine-editor";

// Field names of `routineExerciseValidator` in packages/backend/convex/routines.ts.
const VALIDATOR_FIELDS = [
	"exerciseId",
	"exerciseName",
	"kind",
	"targetSets",
	"targetReps",
	"targetRpe",
	"measurementType",
	"targetDuration",
	"targetIntensity",
	"targetHoldSeconds",
	"perSide",
	"notes",
];

// The editors add a local id and restSeconds to each exercise in form state.
function loadIntoEditor(stored: Parameters<typeof routineExerciseToEditorFields>[0]) {
	return { id: "local-1", ...routineExerciseToEditorFields(stored), restSeconds: 90 };
}

test("an unedited lifting exercise keeps targetRpe and notes after load and save", () => {
	const saved = editorExerciseToRoutineExercise(
		loadIntoEditor({
			exerciseId: "ex_bench",
			exerciseName: "Bench Press",
			kind: "lifting",
			targetSets: 4,
			targetReps: "6-8",
			targetRpe: 8,
			notes: "Pause the first rep",
		})
	);

	assert.equal(saved.targetRpe, 8);
	assert.equal(saved.notes, "Pause the first rep");
	assert.equal(saved.targetSets, 4);
	assert.equal(saved.targetReps, "6-8");
});

test("an unedited cardio exercise keeps targetIntensity and notes after load and save", () => {
	const saved = editorExerciseToRoutineExercise(
		loadIntoEditor({
			exerciseName: "Bike",
			kind: "cardio",
			targetDuration: 15,
			targetIntensity: 7,
			notes: "Easy spin",
		})
	);

	assert.equal(saved.targetIntensity, 7);
	assert.equal(saved.notes, "Easy spin");
	assert.equal(saved.targetDuration, 15);
	assert.equal(saved.targetSets, 1);
});

test("the save payload holds only fields that the backend validator accepts", () => {
	const saved = editorExerciseToRoutineExercise(
		loadIntoEditor({
			exerciseName: "Bench Press",
			kind: "lifting",
			targetSets: 4,
			targetReps: "6-8",
			targetRpe: 8,
			notes: "Pause the first rep",
			targetIntensity: 6,
		})
	);

	const extraFields = Object.keys(saved).filter((key) => !VALIDATOR_FIELDS.includes(key));
	assert.deepEqual(extraFields, []);
});

test("editor edits to controlled fields replace the stored values on save", () => {
	const loaded = loadIntoEditor({
		exerciseName: "Plank",
		kind: "lifting",
		targetSets: 3,
		targetReps: "8-12",
		targetRpe: 7,
	});

	const saved = editorExerciseToRoutineExercise({
		...loaded,
		measurementType: "duration",
		targetHoldSeconds: 45,
		targetSets: 2,
	});

	assert.deepEqual(saved, {
		exerciseId: undefined,
		exerciseName: "Plank",
		kind: "lifting",
		targetSets: 2,
		targetReps: undefined,
		measurementType: "duration",
		targetDuration: undefined,
		targetHoldSeconds: 45,
		perSide: undefined,
		targetRpe: 7,
		notes: undefined,
		targetIntensity: undefined,
	});
});
