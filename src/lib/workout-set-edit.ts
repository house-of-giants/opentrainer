import { getExerciseGroup } from "./workout-exercise-group";
import { editedWeightForStorage, type WeightUnit } from "./units";

type StoredLiftingEntry = {
	_id: string;
	lifting?: {
		weight?: number;
		unit: WeightUnit;
		isWarmup?: boolean;
	};
};

type DisplayedLiftingSet = {
	entryId?: string;
	setNumber: number;
	reps: number;
	weight: number;
	unit: WeightUnit;
	isBodyweight?: boolean;
	rpe?: number | null;
};

export type EditableLiftingSet = DisplayedLiftingSet & {
	entryId: string;
	exerciseName: string;
	storedWeight?: number;
	storedUnit?: WeightUnit;
	isWarmup?: boolean;
};

export function createEditableLiftingSet(
	exerciseGroups: ReadonlyMap<
		string,
		{ entries: readonly StoredLiftingEntry[] }
	>,
	exerciseName: string,
	set: DisplayedLiftingSet
): EditableLiftingSet | undefined {
	if (!set.entryId) return undefined;

	const storedSet = getExerciseGroup(exerciseGroups, {
		name: exerciseName,
		category: "lifting",
		measurementType: "reps",
	})?.entries.find((entry) => entry._id === set.entryId)?.lifting;

	return {
		...set,
		entryId: set.entryId,
		exerciseName,
		storedWeight: storedSet?.weight,
		storedUnit: storedSet?.unit,
		isWarmup: storedSet?.isWarmup,
	};
}

export function buildRepLiftingUpdate(
	editingSet: EditableLiftingSet,
	data: { reps?: number; weight?: number; rpe?: number | null; isWarmup?: boolean }
) {
	return {
		setNumber: editingSet.setNumber,
		reps: data.reps,
		weight:
			data.weight === undefined
				? undefined
				: editedWeightForStorage({
						displayedWeight: data.weight,
						displayUnit: editingSet.unit,
						storedUnit: editingSet.storedUnit ?? editingSet.unit,
						originalDisplayedWeight: editingSet.weight,
						originalStoredWeight: editingSet.storedWeight,
					}),
		unit: editingSet.storedUnit ?? editingSet.unit,
		isBodyweight: editingSet.isBodyweight,
		rpe: data.rpe ?? undefined,
		isWarmup: data.isWarmup ?? editingSet.isWarmup,
	};
}

export function buildTimedLiftingUpdate(
	editingSet: EditableLiftingSet,
	data: { durationSeconds?: number; rpe?: number | null; isWarmup?: boolean }
) {
	return {
		setNumber: editingSet.setNumber,
		durationSeconds: data.durationSeconds,
		unit: editingSet.storedUnit ?? editingSet.unit,
		rpe: data.rpe ?? undefined,
		isWarmup: data.isWarmup ?? editingSet.isWarmup,
	};
}
