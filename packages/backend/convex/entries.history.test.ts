import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import schema from "./schema";

const modules = {
	"./_generated/server.ts": () => import("./_generated/server"),
	"./entries.ts": () => import("./entries"),
};

type HistorySet = {
	setNumber: number;
	weight: number;
	reps: number;
	rpe: number | null;
	unit: "kg" | "lb";
	isWarmup?: boolean;
};

type HistorySession = {
	workoutId: string;
	date: string;
	sets: HistorySet[];
	bestSet: Omit<HistorySet, "setNumber" | "isWarmup">;
};

const getExerciseHistory = makeFunctionReference<
	"query",
	{ exerciseName: string; sessionCount?: number },
	HistorySession[]
>("entries:getExerciseHistory");

describe("getExerciseHistory warm-up sets", () => {
	test("marks warm-up sets and picks the best set from work sets only", async () => {
		const t = convexTest(schema, modules).withIdentity({
			issuer: "https://opentrainer.app/test",
			subject: "warmup-user",
		});

		await t.run(async (ctx) => {
			const userId = await ctx.db.insert("users", {
				clerkId: "warmup-user",
				createdAt: 1,
				updatedAt: 1,
			});
			const workoutId = await ctx.db.insert("workouts", {
				userId,
				status: "completed",
				startedAt: 1,
				completedAt: 2,
			});
			const sets = [
				{ setNumber: 1, weight: 135, reps: 5, isWarmup: true },
				{ setNumber: 2, weight: 225, reps: 1, isWarmup: true },
				{ setNumber: 3, weight: 185, reps: 8 },
				{ setNumber: 4, weight: 185, reps: 8, isWarmup: false },
			];
			for (const set of sets) {
				await ctx.db.insert("entries", {
					workoutId,
					userId,
					exerciseName: "Bench Press",
					kind: "lifting",
					lifting: { ...set, unit: "lb" },
					createdAt: set.setNumber,
				});
			}
		});

		const history = await t.query(getExerciseHistory, {
			exerciseName: "Bench Press",
		});

		assert.equal(history.length, 1);
		assert.deepEqual(
			history[0].sets.map((set) => [set.setNumber, set.isWarmup]),
			[
				[1, true],
				[2, true],
				[3, false],
				[4, false],
			]
		);
		assert.equal(history[0].bestSet.weight, 185);
		assert.equal(history[0].bestSet.reps, 8);
	});
});

describe("getExerciseHistory session count", () => {
	test("returns every completed session when asked for more than 100", async () => {
		const t = convexTest(schema, modules).withIdentity({
			issuer: "https://opentrainer.app/test",
			subject: "long-history-user",
		});

		await t.run(async (ctx) => {
			const userId = await ctx.db.insert("users", {
				clerkId: "long-history-user",
				createdAt: 1,
				updatedAt: 1,
			});
			for (let i = 1; i <= 120; i++) {
				const workoutId = await ctx.db.insert("workouts", {
					userId,
					status: "completed",
					startedAt: i * 1000,
					completedAt: i * 1000 + 500,
				});
				await ctx.db.insert("entries", {
					workoutId,
					userId,
					exerciseName: "Squat",
					kind: "lifting",
					lifting: { setNumber: 1, weight: 100 + i, reps: 5, unit: "kg" },
					createdAt: i * 1000 + 100,
				});
			}
		});

		const history = await t.query(getExerciseHistory, {
			exerciseName: "Squat",
			sessionCount: 100_000,
		});

		assert.equal(history.length, 120);
		assert.equal(history[0].sets[0].weight, 220);
		assert.equal(history[119].sets[0].weight, 101);
	});
});
