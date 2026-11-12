import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = {
	"../_generated/server.ts": () => import("../_generated/server"),
	"../_generated/api.ts": () => import("../_generated/api"),
	"../migrations/exerciseIdBackfill.ts": () => import("./exerciseIdBackfill"),
};

type BackfillResult = {
	dryRun: boolean;
	batches: number;
	scanned: number;
	alreadyLinked: number;
	resolvable: number;
	unresolvable: number;
	changed: number;
};

const backfill = makeFunctionReference<
	"action",
	{ dryRun: boolean; batchSize?: number },
	BackfillResult
>("migrations/exerciseIdBackfill:backfill");

async function setup() {
	const t = convexTest(schema, modules);

	const ids = await t.run(async (ctx) => {
		const ana = await ctx.db.insert("users", { clerkId: "ana", createdAt: 1, updatedAt: 1 });
		const ben = await ctx.db.insert("users", { clerkId: "ben", createdAt: 1, updatedAt: 1 });
		const bench = await ctx.db.insert("exercises", {
			name: "Bench Press",
			aliases: ["Flat Bench Press"],
			category: "lifting",
			isSystemExercise: true,
			createdAt: 1,
		});
		const anaSled = await ctx.db.insert("exercises", {
			userId: ana,
			name: "Sled Push",
			category: "lifting",
			isSystemExercise: false,
			createdAt: 2,
		});
		const anaWorkout = await ctx.db.insert("workouts", { userId: ana, status: "completed", startedAt: 1, completedAt: 2 });
		const benWorkout = await ctx.db.insert("workouts", { userId: ben, status: "completed", startedAt: 1, completedAt: 2 });

		const entry = (
			userId: Id<"users">,
			workoutId: Id<"workouts">,
			exerciseName: string,
			exerciseId?: Id<"exercises">
		) =>
			ctx.db.insert("entries", {
				userId,
				workoutId,
				exerciseName,
				exerciseId,
				kind: "lifting",
				lifting: { setNumber: 1, reps: 5, weight: 100, unit: "lb" },
				createdAt: 1,
			});

		return {
			bench,
			anaSled,
			entries: {
				// System exercise by exact name.
				anaBench: await entry(ana, anaWorkout, "Bench Press"),
				// System exercise by alias and different spacing and case.
				anaAlias: await entry(ana, anaWorkout, "  flat bench  press"),
				// Ana's own custom exercise.
				anaSled: await entry(ana, anaWorkout, "Sled Push"),
				// Already linked: left as is.
				anaLinked: await entry(ana, anaWorkout, "Bench Press", bench),
				// Ben has no "Sled Push" exercise; Ana's must not be used.
				benSled: await entry(ben, benWorkout, "Sled Push"),
				// No exercise has this name.
				benUnknown: await entry(ben, benWorkout, "Tire Flip"),
			},
		};
	});

	const exerciseIds = async () => {
		const entries = await t.run((ctx) => ctx.db.query("entries").collect());
		return new Map(entries.map((e) => [e._id, e.exerciseId]));
	};

	return { t, ids, exerciseIds };
}

describe("migrations/exerciseIdBackfill.backfill", () => {
	test("dry run counts the entries and writes nothing", async () => {
		const { t, exerciseIds } = await setup();
		const before = await exerciseIds();

		const result = await t.action(backfill, { dryRun: true, batchSize: 4 });

		assert.deepEqual(result, {
			dryRun: true,
			batches: 2,
			scanned: 6,
			alreadyLinked: 1,
			resolvable: 3,
			unresolvable: 2,
			changed: 0,
		});
		assert.deepEqual(await exerciseIds(), before);
	});

	test("real run links each resolvable entry to its owner's exercise", async () => {
		const { t, ids, exerciseIds } = await setup();

		const result = await t.action(backfill, { dryRun: false, batchSize: 4 });

		assert.equal(result.resolvable, 3);
		assert.equal(result.unresolvable, 2);
		assert.equal(result.changed, 3);
		const after = await exerciseIds();
		assert.equal(after.get(ids.entries.anaBench), ids.bench);
		assert.equal(after.get(ids.entries.anaAlias), ids.bench);
		assert.equal(after.get(ids.entries.anaSled), ids.anaSled);
		assert.equal(after.get(ids.entries.anaLinked), ids.bench);
		assert.equal(after.get(ids.entries.benSled), undefined);
		assert.equal(after.get(ids.entries.benUnknown), undefined);
	});

	test("a second real run changes nothing", async () => {
		const { t, exerciseIds } = await setup();
		await t.action(backfill, { dryRun: false, batchSize: 4 });
		const afterFirst = await exerciseIds();

		const second = await t.action(backfill, { dryRun: false, batchSize: 4 });

		assert.equal(second.scanned, 6);
		assert.equal(second.alreadyLinked, 4);
		assert.equal(second.resolvable, 0);
		assert.equal(second.unresolvable, 2);
		assert.equal(second.changed, 0);
		assert.deepEqual(await exerciseIds(), afterFirst);
	});
});
