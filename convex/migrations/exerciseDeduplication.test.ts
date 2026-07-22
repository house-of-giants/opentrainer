import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = {
	"../_generated/server.ts": () => import("../_generated/server"),
	"../migrations/exerciseDeduplication.ts": () =>
		import("./exerciseDeduplication"),
};

type AuditResult = {
	exerciseCount: number;
	duplicateGroupCount: number;
	removableExerciseCount: number;
	routineReferenceCount: number;
	entryReferenceCount: number;
	groups: Array<{
		ownerId: string;
		canonical: {
			id: Id<"exercises">;
			name: string;
			isSystemExercise: boolean;
		};
		duplicates: Array<{
			id: Id<"exercises">;
			name: string;
			routineReferenceCount: number;
			entryReferenceCount: number;
		}>;
	}>;
};

type ApplyArgs = {
	confirmation: "deduplicate-exercises";
	expectedExerciseCount: number;
	expectedRemovableExerciseCount: number;
};

type ApplyResult = Omit<AuditResult, "groups"> & {
	updatedRoutineCount: number;
	updatedEntryCount: number;
	deletedExerciseCount: number;
};

const audit = makeFunctionReference<"query", Record<string, never>, AuditResult>(
	"migrations/exerciseDeduplication:audit"
);
const apply = makeFunctionReference<"mutation", ApplyArgs, ApplyResult>(
	"migrations/exerciseDeduplication:apply"
);

function createTest() {
	return convexTest(schema, modules);
}

async function insertUser(t: ReturnType<typeof createTest>) {
	return t.run((ctx) =>
		ctx.db.insert("users", {
			clerkId: "test-user",
			createdAt: 1,
			updatedAt: 1,
		})
	);
}

async function insertExercise(
	t: ReturnType<typeof createTest>,
	value: {
		name: string;
		createdAt: number;
		isSystemExercise: boolean;
		userId?: Id<"users">;
	}
) {
	return t.run((ctx) =>
		ctx.db.insert("exercises", {
			...value,
			category: "lifting",
		})
	);
}

async function seedReferencedDuplicates(t: ReturnType<typeof createTest>) {
	const userId = await insertUser(t);
	const canonicalId = await insertExercise(t, {
		name: "Plank",
		createdAt: 1,
		isSystemExercise: true,
	});
	const referencedDuplicateId = await insertExercise(t, {
		name: "Plank",
		createdAt: 2,
		isSystemExercise: false,
		userId,
	});
	const unreferencedDuplicateId = await insertExercise(t, {
		name: " plank ",
		createdAt: 3,
		isSystemExercise: false,
		userId,
	});

	const { routineId, entryId } = await t.run(async (ctx) => {
		const routineId = await ctx.db.insert("routines", {
			userId,
			name: "Core",
			source: "manual",
			days: [
				{
					name: "Day 1",
					exercises: [
						{
							exerciseId: referencedDuplicateId,
							exerciseName: "Plank",
							kind: "lifting",
						},
					],
				},
			],
			isActive: true,
			createdAt: 1,
			updatedAt: 1,
		});
		const workoutId = await ctx.db.insert("workouts", {
			userId,
			status: "completed",
			startedAt: 1,
			completedAt: 2,
		});
		const entryId = await ctx.db.insert("entries", {
			workoutId,
			userId,
			exerciseId: referencedDuplicateId,
			exerciseName: "Plank",
			kind: "lifting",
			lifting: {
				setNumber: 1,
				durationSeconds: 60,
				unit: "lb",
			},
			createdAt: 1,
		});
		return { routineId, entryId };
	});

	return {
		userId,
		canonicalId,
		referencedDuplicateId,
		unreferencedDuplicateId,
		routineId,
		entryId,
	};
}

describe("exercise deduplication migration", () => {
	test("audits duplicate references with per-exercise counts", async () => {
		const t = createTest();
		const seeded = await seedReferencedDuplicates(t);

		const result = await t.query(audit, {});

		assert.deepEqual(result, {
			exerciseCount: 3,
			duplicateGroupCount: 1,
			removableExerciseCount: 2,
			routineReferenceCount: 1,
			entryReferenceCount: 1,
			groups: [
				{
					ownerId: seeded.userId,
					canonical: {
						id: seeded.canonicalId,
						name: "Plank",
						isSystemExercise: true,
					},
					duplicates: [
						{
							id: seeded.referencedDuplicateId,
							name: "Plank",
							routineReferenceCount: 1,
							entryReferenceCount: 1,
						},
						{
							id: seeded.unreferencedDuplicateId,
							name: " plank ",
							routineReferenceCount: 0,
							entryReferenceCount: 0,
						},
					],
				},
			],
		});
	});

	test("rejects apply when either audited count changed", async () => {
		const t = createTest();
		await seedReferencedDuplicates(t);

		await assert.rejects(
			t.mutation(apply, {
				confirmation: "deduplicate-exercises",
				expectedExerciseCount: 4,
				expectedRemovableExerciseCount: 2,
			}),
			/Exercise count changed: expected 4, found 3/
		);
		await assert.rejects(
			t.mutation(apply, {
				confirmation: "deduplicate-exercises",
				expectedExerciseCount: 3,
				expectedRemovableExerciseCount: 1,
			}),
			/Duplicate count changed: expected 1, found 2/
		);
	});

	test("refuses to delete an exercise marked as system-owned", async () => {
		const t = createTest();
		const userId = await insertUser(t);
		await insertExercise(t, {
			name: "Plank",
			createdAt: 1,
			isSystemExercise: true,
		});
		await insertExercise(t, {
			name: "Plank",
			createdAt: 2,
			isSystemExercise: true,
			userId,
		});
		await insertExercise(t, {
			name: "Plank",
			createdAt: 3,
			isSystemExercise: false,
			userId,
		});

		await assert.rejects(
			t.mutation(apply, {
				confirmation: "deduplicate-exercises",
				expectedExerciseCount: 3,
				expectedRemovableExerciseCount: 2,
			}),
			/Refusing to delete non-custom exercise/
		);
		assert.equal(
			await t.run(async (ctx) =>
				(await ctx.db.query("exercises").collect()).length
			),
			3
		);
	});

	test("remaps routine and entry references before deleting duplicates", async () => {
		const t = createTest();
		const seeded = await seedReferencedDuplicates(t);

		const result = await t.mutation(apply, {
			confirmation: "deduplicate-exercises",
			expectedExerciseCount: 3,
			expectedRemovableExerciseCount: 2,
		});

		assert.deepEqual(result, {
			exerciseCount: 3,
			duplicateGroupCount: 1,
			removableExerciseCount: 2,
			routineReferenceCount: 1,
			entryReferenceCount: 1,
			updatedRoutineCount: 1,
			updatedEntryCount: 1,
			deletedExerciseCount: 2,
		});
		await t.run(async (ctx) => {
			const exercises = await ctx.db.query("exercises").collect();
			assert.deepEqual(
				exercises.map((exercise) => exercise._id),
				[seeded.canonicalId]
			);
			assert.equal(
				(await ctx.db.get(seeded.routineId))?.days[0].exercises[0]
					.exerciseId,
				seeded.canonicalId
			);
			assert.equal(
				(await ctx.db.get(seeded.entryId))?.exerciseId,
				seeded.canonicalId
			);
		});
	});
});
