import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import schema from "./schema";

const modules = {
	"./_generated/server.ts": () => import("./_generated/server"),
	"./workouts.ts": () => import("./workouts"),
};

type DashboardStats = {
	weeklyTotalVolume: number;
	weeklyTrend: Array<{ volume: number }>;
	preferredUnits: "kg" | "lb";
} | null;

const getDashboardStats = makeFunctionReference<"query", Record<string, never>, DashboardStats>(
	"workouts:getDashboardStats"
);

// Stored summary volume is pounds: 100 kg x 5 = 1102.31 lb.
const STORED_VOLUME_LB = 1102.31;

async function setup(preferredUnits: "kg" | "lb") {
	const t = convexTest(schema, modules);
	await t.run(async (ctx) => {
		const userId = await ctx.db.insert("users", {
			clerkId: "lifter",
			preferredUnits,
			createdAt: 1,
			updatedAt: 1,
		});
		const startedAt = Date.now() - 60_000;
		await ctx.db.insert("workouts", {
			userId,
			status: "completed",
			startedAt,
			completedAt: startedAt + 30_000,
			summary: { totalVolume: STORED_VOLUME_LB, totalSets: 1, exerciseCount: 1 },
		});
	});
	return t.withIdentity({ issuer: "https://opentrainer.app/test", subject: "lifter" });
}

describe("workouts.getDashboardStats volume", () => {
	test("returns weekly volume in kg for a kg lifter", async () => {
		const stats = await (await setup("kg")).query(getDashboardStats, {});

		assert.equal(stats?.preferredUnits, "kg");
		assert.equal(stats?.weeklyTotalVolume, 500);
		assert.equal(stats?.weeklyTrend.at(-1)?.volume, 500);
	});

	test("returns weekly volume in lb for an lb lifter", async () => {
		const stats = await (await setup("lb")).query(getDashboardStats, {});

		assert.equal(stats?.weeklyTotalVolume, 1102);
		assert.equal(stats?.weeklyTrend.at(-1)?.volume, 1102);
	});
});
