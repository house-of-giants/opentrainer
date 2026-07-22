import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "../_generated/server";
import { getExerciseCleanupPlan } from "../../src/lib/exercise-deduplication";

type ExerciseCleanupGroup = ReturnType<
	typeof getExerciseCleanupPlan<Doc<"exercises">>
>[number];

async function loadCleanupState(ctx: QueryCtx | MutationCtx) {
	const [exercises, routines, entries] = await Promise.all([
		ctx.db.query("exercises").collect(),
		ctx.db.query("routines").collect(),
		ctx.db.query("entries").collect(),
	]);
	const groups = getExerciseCleanupPlan(exercises);
	const duplicateToCanonical = new Map<string, Id<"exercises">>();

	for (const group of groups) {
		for (const duplicate of group.duplicates) {
			duplicateToCanonical.set(duplicate._id, group.canonical._id);
		}
	}

	let routineReferenceCount = 0;
	for (const routine of routines) {
		for (const day of routine.days) {
			for (const exercise of day.exercises) {
				if (
					exercise.exerciseId &&
					duplicateToCanonical.has(exercise.exerciseId)
				) {
					routineReferenceCount += 1;
				}
			}
		}
	}

	let entryReferenceCount = 0;
	for (const entry of entries) {
		if (entry.exerciseId && duplicateToCanonical.has(entry.exerciseId)) {
			entryReferenceCount += 1;
		}
	}

	return {
		exercises,
		routines,
		entries,
		groups,
		duplicateToCanonical,
		summary: {
			exerciseCount: exercises.length,
			duplicateGroupCount: groups.length,
			removableExerciseCount: groups.reduce(
				(total, group) => total + group.duplicates.length,
				0
			),
			routineReferenceCount,
			entryReferenceCount,
		},
	};
}

function serializeGroup(
	group: ExerciseCleanupGroup,
	routines: Doc<"routines">[],
	entries: Doc<"entries">[]
) {
	return {
		ownerId: group.ownerId,
		canonical: {
			id: group.canonical._id,
			name: group.canonical.name,
			isSystemExercise: group.canonical.isSystemExercise ?? false,
		},
		duplicates: group.duplicates.map((duplicate) => ({
			id: duplicate._id,
			name: duplicate.name,
			routineReferenceCount: routines.reduce(
				(count, routine) =>
					count +
					routine.days.reduce(
						(dayCount, day) =>
							dayCount +
							day.exercises.filter(
								(exercise) => exercise.exerciseId === duplicate._id
							).length,
						0
					),
				0
			),
			entryReferenceCount: entries.filter(
				(entry) => entry.exerciseId === duplicate._id
			).length,
		})),
	};
}

export const audit = internalQuery({
	args: {},
	handler: async (ctx) => {
		const state = await loadCleanupState(ctx);
		return {
			...state.summary,
			groups: state.groups.map((group) =>
				serializeGroup(group, state.routines, state.entries)
			),
		};
	},
});

export const apply = internalMutation({
	args: {
		confirmation: v.literal("deduplicate-exercises"),
		expectedExerciseCount: v.number(),
		expectedRemovableExerciseCount: v.number(),
	},
	handler: async (ctx, args) => {
		const state = await loadCleanupState(ctx);
		if (state.summary.exerciseCount !== args.expectedExerciseCount) {
			throw new Error(
				`Exercise count changed: expected ${args.expectedExerciseCount}, found ${state.summary.exerciseCount}`
			);
		}
		if (
			state.summary.removableExerciseCount !==
			args.expectedRemovableExerciseCount
		) {
			throw new Error(
				`Duplicate count changed: expected ${args.expectedRemovableExerciseCount}, found ${state.summary.removableExerciseCount}`
			);
		}

		let updatedRoutineCount = 0;
		for (const routine of state.routines) {
			let changed = false;
			const days = routine.days.map((day) => ({
				...day,
				exercises: day.exercises.map((exercise) => {
					const canonicalId = exercise.exerciseId
						? state.duplicateToCanonical.get(exercise.exerciseId)
						: undefined;
					if (!canonicalId) return exercise;
					changed = true;
					return { ...exercise, exerciseId: canonicalId };
				}),
			}));

			if (changed) {
				await ctx.db.patch(routine._id, { days });
				updatedRoutineCount += 1;
			}
		}

		let updatedEntryCount = 0;
		for (const entry of state.entries) {
			const canonicalId = entry.exerciseId
				? state.duplicateToCanonical.get(entry.exerciseId)
				: undefined;
			if (!canonicalId) continue;
			await ctx.db.patch(entry._id, { exerciseId: canonicalId });
			updatedEntryCount += 1;
		}

		for (const group of state.groups) {
			for (const duplicate of group.duplicates) {
				if (duplicate.isSystemExercise || !duplicate.userId) {
					throw new Error(`Refusing to delete non-custom exercise ${duplicate._id}`);
				}
				await ctx.db.delete(duplicate._id);
			}
		}

		return {
			...state.summary,
			updatedRoutineCount,
			updatedEntryCount,
			deletedExerciseCount: state.summary.removableExerciseCount,
		};
	},
});
