export type ExerciseGroupDescriptor = {
	name: string;
	category: "lifting" | "cardio" | "mobility" | "other";
	measurementType?: "reps" | "duration";
};

export function getExerciseGroupKey(exercise: ExerciseGroupDescriptor) {
	const category = exercise.category === "cardio" ? "cardio" : "lifting";
	const measurementType =
		category === "lifting" && exercise.measurementType === "duration"
			? "duration"
			: "reps";
	return JSON.stringify([exercise.name, category, measurementType]);
}
