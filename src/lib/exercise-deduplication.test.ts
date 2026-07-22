import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	deduplicateVisibleExercises,
	getExerciseCleanupPlan,
} from "./exercise-deduplication";

type Exercise = {
	id: string;
	name: string;
	aliases?: string[];
	userId?: string;
	isSystemExercise?: boolean;
	createdAt: number;
};

describe("exercise deduplication", () => {
	test("prefers a system exercise over owned name and alias duplicates", () => {
		const systemExercise: Exercise = {
			id: "system-bench",
			name: "Bench Press",
			aliases: ["Barbell Bench Press"],
			isSystemExercise: true,
			createdAt: 1,
		};
		const exercises: Exercise[] = [
			{
				id: "custom-alias",
				name: "Barbell Bench Press",
				userId: "user-1",
				createdAt: 3,
			},
			systemExercise,
			{
				id: "custom-name",
				name: " bench   press ",
				userId: "user-1",
				createdAt: 2,
			},
		];

		assert.deepEqual(deduplicateVisibleExercises(exercises), [systemExercise]);
	});

	test("keeps the oldest owned exercise when no system exercise matches", () => {
		const oldest: Exercise = {
			id: "side-plank-1",
			name: "Side Plank",
			userId: "user-1",
			createdAt: 1,
		};
		const newest: Exercise = {
			id: "side-plank-2",
			name: "side plank",
			userId: "user-1",
			createdAt: 2,
		};

		assert.deepEqual(deduplicateVisibleExercises([newest, oldest]), [oldest]);
	});

	test("builds owner-scoped cleanup mappings without merging custom exercises across users", () => {
		const systemPlank: Exercise = {
			id: "system-plank",
			name: "Plank",
			isSystemExercise: true,
			createdAt: 1,
		};
		const ownerOneSidePlank: Exercise = {
			id: "owner-1-side-plank-1",
			name: "Side Plank",
			userId: "user-1",
			createdAt: 2,
		};
		const plan = getExerciseCleanupPlan([
			systemPlank,
			{
				id: "owner-1-plank",
				name: "Plank",
				userId: "user-1",
				createdAt: 2,
			},
			{
				id: "owner-2-plank",
				name: "Plank",
				userId: "user-2",
				createdAt: 2,
			},
			ownerOneSidePlank,
			{
				id: "owner-1-side-plank-2",
				name: "Side Plank",
				userId: "user-1",
				createdAt: 3,
			},
			{
				id: "owner-2-side-plank",
				name: "Side Plank",
				userId: "user-2",
				createdAt: 2,
			},
		]);

		assert.deepEqual(
			plan.map(({ ownerId, canonical, duplicates }) => ({
				ownerId,
				canonicalId: canonical.id,
				duplicateIds: duplicates.map(({ id }) => id),
			})),
			[
				{
					ownerId: "user-1",
					canonicalId: "system-plank",
					duplicateIds: ["owner-1-plank"],
				},
				{
					ownerId: "user-1",
					canonicalId: "owner-1-side-plank-1",
					duplicateIds: ["owner-1-side-plank-2"],
				},
				{
					ownerId: "user-2",
					canonicalId: "system-plank",
					duplicateIds: ["owner-2-plank"],
				},
			]
		);
	});
});
