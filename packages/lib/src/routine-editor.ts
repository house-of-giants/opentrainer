// Maps routine exercises between the stored shape (what `routines.updateRoutine`
// accepts) and the routine editors' form state on web and mobile.

type RoutineExerciseKind = "lifting" | "cardio" | "mobility";
type RoutineMeasurementType = "reps" | "duration";

// The rest timer length for an exercise that has no stored rest time.
export const DEFAULT_REST_SECONDS = 90;

// Mirrors `routineExerciseValidator` in packages/backend/convex/routines.ts.
// That validator rejects unknown fields, so the save payload holds only these.
export type StoredRoutineExercise<TExerciseId = string> = {
	exerciseId?: TExerciseId;
	exerciseName: string;
	kind: RoutineExerciseKind;
	targetSets?: number;
	targetReps?: string;
	targetRpe?: number;
	measurementType?: RoutineMeasurementType;
	targetDuration?: number;
	targetIntensity?: number;
	targetHoldSeconds?: number;
	perSide?: boolean;
	notes?: string;
	restSeconds?: number;
};

// The editor has no control for targetRpe, notes, or targetIntensity. It
// carries them from load to save so that a save does not delete them.
export type RoutineEditorExerciseFields<TExerciseId = string> = {
	exerciseId?: TExerciseId;
	exerciseName: string;
	kind: RoutineExerciseKind;
	targetSets: number;
	targetReps: string;
	measurementType?: RoutineMeasurementType;
	targetDuration?: number;
	targetHoldSeconds?: number;
	perSide?: boolean;
	targetRpe?: number;
	notes?: string;
	targetIntensity?: number;
	restSeconds: number;
};

export function routineExerciseToEditorFields<TExerciseId>(
	exercise: StoredRoutineExercise<TExerciseId>,
	catalogMeasurementType?: RoutineMeasurementType
): RoutineEditorExerciseFields<TExerciseId> {
	let targetDuration = exercise.targetDuration;
	if (exercise.kind === "cardio" && !targetDuration && exercise.targetReps) {
		const match = exercise.targetReps.match(/(\d+)/);
		if (match) {
			targetDuration = parseInt(match[1], 10);
		}
	}
	return {
		exerciseId: exercise.exerciseId,
		exerciseName: exercise.exerciseName,
		kind: exercise.kind,
		targetSets: exercise.targetSets || 3,
		targetReps: exercise.targetReps || "8-12",
		measurementType: exercise.measurementType ?? catalogMeasurementType,
		targetDuration: targetDuration || 20,
		targetHoldSeconds: exercise.targetHoldSeconds || 30,
		perSide: exercise.perSide || false,
		targetRpe: exercise.targetRpe,
		notes: exercise.notes,
		targetIntensity: exercise.targetIntensity,
		restSeconds: exercise.restSeconds ?? DEFAULT_REST_SECONDS,
	};
}

// Editor state can hold client-only fields (a local id). This picks only the
// fields that the backend validator accepts.
export function editorExerciseToRoutineExercise<TExerciseId>(
	exercise: RoutineEditorExerciseFields<TExerciseId>
): StoredRoutineExercise<TExerciseId> {
	return {
		exerciseId: exercise.exerciseId,
		exerciseName: exercise.exerciseName,
		kind: exercise.kind,
		targetSets:
			exercise.kind === "lifting" || exercise.kind === "mobility" ? exercise.targetSets : 1,
		targetReps:
			(exercise.kind === "lifting" && exercise.measurementType !== "duration") ||
			exercise.kind === "mobility"
				? exercise.targetReps
				: undefined,
		measurementType: exercise.kind === "lifting" ? exercise.measurementType : undefined,
		targetDuration: exercise.kind === "cardio" ? exercise.targetDuration : undefined,
		targetHoldSeconds:
			exercise.kind === "mobility" || exercise.measurementType === "duration"
				? exercise.targetHoldSeconds
				: undefined,
		perSide: exercise.kind === "mobility" ? exercise.perSide : undefined,
		targetRpe: exercise.targetRpe,
		notes: exercise.notes,
		targetIntensity: exercise.targetIntensity,
		restSeconds: exercise.restSeconds,
	};
}
