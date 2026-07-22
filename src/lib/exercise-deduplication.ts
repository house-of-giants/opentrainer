import { normalizeExerciseName } from "./exercise-names";

export type DeduplicableExercise = {
	name: string;
	aliases?: string[];
	userId?: string;
	isSystemExercise?: boolean;
	createdAt: number;
};

export type ExerciseDeduplicationGroup<T extends DeduplicableExercise> = {
	canonical: T;
	duplicates: T[];
};

function hasExerciseName(
	exercise: DeduplicableExercise,
	normalizedName: string
) {
	return (
		normalizeExerciseName(exercise.name) === normalizedName ||
		exercise.aliases?.some(
			(alias) => normalizeExerciseName(alias) === normalizedName
		) === true
	);
}

function exerciseNamesOverlap(
	left: DeduplicableExercise,
	right: DeduplicableExercise
) {
	return (
		hasExerciseName(left, normalizeExerciseName(right.name)) ||
		hasExerciseName(right, normalizeExerciseName(left.name))
	);
}

export function getExerciseDeduplicationGroups<
	T extends DeduplicableExercise,
>(exercises: readonly T[]): Array<ExerciseDeduplicationGroup<T>> {
	const preferredExercises = [...exercises].sort((left, right) => {
		if (left.isSystemExercise !== right.isSystemExercise) {
			return left.isSystemExercise ? -1 : 1;
		}
		return left.createdAt - right.createdAt;
	});
	const groups: Array<ExerciseDeduplicationGroup<T>> = [];

	for (const exercise of preferredExercises) {
		const existingGroup = groups.find(({ canonical }) =>
			exerciseNamesOverlap(canonical, exercise)
		);
		if (existingGroup) {
			existingGroup.duplicates.push(exercise);
		} else {
			groups.push({ canonical: exercise, duplicates: [] });
		}
	}

	return groups;
}

export function deduplicateVisibleExercises<T extends DeduplicableExercise>(
	exercises: readonly T[]
): T[] {
	return getExerciseDeduplicationGroups(exercises).map(
		({ canonical }) => canonical
	);
}

export function getExerciseCleanupPlan<T extends DeduplicableExercise>(
	exercises: readonly T[]
) {
	const systemExercises = exercises.filter(
		(exercise) => exercise.isSystemExercise
	);
	const exercisesByOwner = new Map<string, T[]>();

	for (const exercise of exercises) {
		if (exercise.isSystemExercise || !exercise.userId) continue;
		const ownerExercises = exercisesByOwner.get(exercise.userId) ?? [];
		ownerExercises.push(exercise);
		exercisesByOwner.set(exercise.userId, ownerExercises);
	}

	return Array.from(exercisesByOwner, ([ownerId, ownerExercises]) =>
		getExerciseDeduplicationGroups([
			...systemExercises,
			...ownerExercises,
		]).flatMap(({ canonical, duplicates }) => {
			const ownedDuplicates = duplicates.filter(
				(exercise) => exercise.userId === ownerId
			);
			return ownedDuplicates.length > 0
				? [{ ownerId, canonical, duplicates: ownedDuplicates }]
				: [];
		})
	).flat();
}
