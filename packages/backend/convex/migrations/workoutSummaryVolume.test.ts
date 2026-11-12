import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import type { Doc, Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = {
	"../_generated/server.ts": () => import("../_generated/server"),
	"../_generated/api.ts": () => import("../_generated/api"),
	"../migrations/workoutSummaryVolume.ts": () => import("./workoutSummaryVolume"),
};

type BackfillResult = {
	dryRun: boolean;
	batches: number;
	scanned: number;
	changed: number;
	volumeDeltaLb: number;
};

const backfill = makeFunctionReference<
	"action",
	{ dryRun: boolean; batchSize?: number },
	BackfillResult
>("migrations/workoutSummaryVolume:backfill");

const KG_100_X_5_LB = 100 * 5 * 2.20462;
const START = Date.UTC(2026, 10, 10, 14, 0);
const END = START + 60 * 60_000;

type SetInput = { weight: number; reps: number; unit: "kg" | "lb" };

async function setup() {
	const t = convexTest(schema, modules);

	const ids = await t.run(async (ctx) => {
		const userId = await ctx.db.insert("users", { clerkId: "lifter", createdAt: 1, updatedAt: 1 });

		async function workout(
			sets: SetInput[],
			fields: Partial<Doc<"workouts">>
		): Promise<Id<"workouts">> {
			const workoutId = await ctx.db.insert("workouts", {
				userId,
				status: "completed",
				startedAt: START,
				completedAt: END,
				...fields,
			});
			for (const [index, set] of sets.entries()) {
				await ctx.db.insert("entries", {
					workoutId,
					userId,
					exerciseName: "Bench Press",
					kind: "lifting",
					lifting: { setNumber: index + 1, ...set },
					createdAt: START + index,
				});
			}
			return workoutId;
		}

		const summary = (totalVolume: number, totalSets: number) => ({
			totalVolume,
			totalSets,
			totalDurationMinutes: 60,
			exerciseCount: 1,
		});

		return {
			// Stored by the old code: kg added as if it were lb.
			kg: await workout([{ weight: 100, reps: 5, unit: "kg" }], {
				summary: summary(500, 1),
			}),
			// lb-only workouts were already right.
			lb: await workout([{ weight: 225, reps: 5, unit: "lb" }], {
				summary: summary(1125, 1),
			}),
			mixed: await workout(
				[
					{ weight: 225, reps: 5, unit: "lb" },
					{ weight: 100, reps: 5, unit: "kg" },
				],
				{ summary: summary(1625, 2) }
			),
			// Not completed: no summary to fix.
			inProgress: await workout([{ weight: 100, reps: 5, unit: "kg" }], {
				status: "in_progress",
				completedAt: undefined,
			}),
		};
	});

	const workouts = async () => {
		const all = await t.run((ctx) => ctx.db.query("workouts").collect());
		return new Map(all.map((w) => [w._id, w]));
	};

	return { t, ids, workouts };
}

function near(actual: number | undefined, expected: number) {
	assert.ok(actual !== undefined, "expected a number, got undefined");
	assert.ok(Math.abs(actual - expected) < 0.01, `expected about ${expected}, got ${actual}`);
}

describe("migrations/workoutSummaryVolume.backfill", () => {
	test("dry run reports the wrong summaries and changes nothing", async () => {
		const { t, workouts } = await setup();
		const before = await workouts();

		const result = await t.action(backfill, { dryRun: true, batchSize: 2 });

		assert.equal(result.dryRun, true);
		assert.equal(result.batches, 2);
		assert.equal(result.scanned, 3);
		assert.equal(result.changed, 2);
		// kg: 1102.31 - 500; mixed: (1125 + 1102.31) - 1625.
		near(result.volumeDeltaLb, KG_100_X_5_LB - 500 + (1125 + KG_100_X_5_LB - 1625));
		assert.deepEqual(await workouts(), before);
	});

	test("real run fixes only the wrong summaries and keeps the other fields", async () => {
		const { t, ids, workouts } = await setup();
		const before = await workouts();

		const result = await t.action(backfill, { dryRun: false, batchSize: 2 });

		assert.equal(result.dryRun, false);
		assert.equal(result.scanned, 3);
		assert.equal(result.changed, 2);

		const after = await workouts();
		const kg = after.get(ids.kg)!;
		near(kg.summary?.totalVolume, KG_100_X_5_LB);
		assert.deepEqual({ ...kg.summary, totalVolume: 0 }, { ...before.get(ids.kg)!.summary, totalVolume: 0 });

		const mixed = after.get(ids.mixed)!;
		near(mixed.summary?.totalVolume, 1125 + KG_100_X_5_LB);
		assert.equal(mixed.summary?.totalSets, 2);

		assert.deepEqual(after.get(ids.lb), before.get(ids.lb));
		assert.deepEqual(after.get(ids.inProgress), before.get(ids.inProgress));
	});

	test("a second real run changes nothing", async () => {
		const { t, workouts } = await setup();
		await t.action(backfill, { dryRun: false, batchSize: 2 });
		const afterFirst = await workouts();

		const second = await t.action(backfill, { dryRun: false, batchSize: 2 });

		assert.equal(second.scanned, 3);
		assert.equal(second.changed, 0);
		assert.equal(second.volumeDeltaLb, 0);
		assert.deepEqual(await workouts(), afterFirst);
	});
});
