import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = {
	"./_generated/server.ts": () => import("./_generated/server"),
	"./_generated/api.ts": () => import("./_generated/api"),
	"./entries.ts": () => import("./entries"),
	"./exercises.ts": () => import("./exercises"),
	"./migrations/exerciseIdBackfill.ts": () =>
		import("./migrations/exerciseIdBackfill"),
};

type HistorySession = {
	workoutId: Id<"workouts">;
	date: string;
	sets: Array<{
		setNumber: number;
		weight: number;
		reps: number;
		rpe: number | null;
		unit: "kg" | "lb";
		isWarmup: boolean;
	}>;
	bestSet: { weight: number; reps: number; rpe: number | null; unit: "kg" | "lb" };
};

type TimedSession = {
	workoutId: Id<"workouts">;
	date: string;
	sets: Array<{ setNumber: number; durationSeconds: number; rpe: number | null }>;
	longestHoldSeconds: number;
};

type HistoryArgs = {
	exerciseName: string;
	exerciseId?: Id<"exercises">;
	sessionCount?: number;
};

const getExerciseHistory = makeFunctionReference<"query", HistoryArgs, HistorySession[]>(
	"entries:getExerciseHistory"
);
const getTimedExerciseHistory = makeFunctionReference<"query", HistoryArgs, TimedSession[]>(
	"entries:getTimedExerciseHistory"
);
const addLiftingEntry = makeFunctionReference<
	"mutation",
	{
		workoutId: Id<"workouts">;
		clientId: string;
		exerciseName: string;
		lifting: { setNumber: number; reps: number; weight: number; unit: "kg" | "lb" };
	},
	Id<"entries">
>("entries:addLiftingEntry");
const updateExercise = makeFunctionReference<
	"mutation",
	{ id: Id<"exercises">; name: string },
	Id<"exercises">
>("exercises:updateExercise");
const backfill = makeFunctionReference<
	"action",
	{ dryRun: boolean; batchSize?: number },
	unknown
>("migrations/exerciseIdBackfill:backfill");

const START = Date.UTC(2026, 10, 1, 9, 0);
const HOUR = 60 * 60_000;

function setup() {
	const t = convexTest(schema, modules);
	const as = (subject: string) =>
		t.withIdentity({ issuer: "https://opentrainer.app/test", subject });
	return { t, as };
}

type Ctx = Parameters<Parameters<ReturnType<typeof convexTest>["run"]>[0]>[0];

async function insertUser(ctx: Ctx, clerkId: string) {
	return await ctx.db.insert("users", { clerkId, createdAt: 1, updatedAt: 1 });
}

async function insertWorkout(
	ctx: Ctx,
	userId: Id<"users">,
	hour: number,
	status: "completed" | "in_progress" = "completed"
) {
	return await ctx.db.insert("workouts", {
		userId,
		status,
		startedAt: START + hour * HOUR,
		completedAt: status === "completed" ? START + hour * HOUR + HOUR / 2 : undefined,
	});
}

async function insertSet(
	ctx: Ctx,
	fields: {
		userId: Id<"users">;
		workoutId: Id<"workouts">;
		exerciseName: string;
		exerciseId?: Id<"exercises">;
		hour: number;
		setNumber: number;
		weight?: number;
		reps?: number;
		durationSeconds?: number;
		isWarmup?: boolean;
	}
) {
	return await ctx.db.insert("entries", {
		workoutId: fields.workoutId,
		userId: fields.userId,
		exerciseId: fields.exerciseId,
		exerciseName: fields.exerciseName,
		kind: "lifting",
		lifting: {
			setNumber: fields.setNumber,
			weight: fields.weight,
			reps: fields.durationSeconds === undefined ? (fields.reps ?? 5) : undefined,
			durationSeconds: fields.durationSeconds,
			unit: "lb",
			isWarmup: fields.isWarmup,
		},
		createdAt: START + fields.hour * HOUR + fields.setNumber,
	});
}

async function insertSystemExercise(ctx: Ctx, name: string, aliases?: string[]) {
	return await ctx.db.insert("exercises", {
		name,
		aliases,
		category: "lifting",
		isSystemExercise: true,
		createdAt: 1,
	});
}

async function insertCustomExercise(ctx: Ctx, userId: Id<"users">, name: string) {
	return await ctx.db.insert("exercises", {
		userId,
		name,
		category: "lifting",
		isSystemExercise: false,
		createdAt: 2,
	});
}

const weights = (sessions: HistorySession[]) =>
	sessions.map((session) => session.sets.map((set) => set.weight));

describe("exercise history after a custom exercise is renamed", () => {
	test("sets logged under the old name show in the new name's history", async () => {
		const { t, as } = setup();
		const { exerciseId, workoutId } = await t.run(async (ctx) => {
			const userId = await insertUser(ctx, "renamer");
			const exerciseId = await insertCustomExercise(ctx, userId, "Landmine Press");
			const workoutId = await ctx.db.insert("workouts", {
				userId,
				status: "in_progress",
				startedAt: START,
			});
			return { exerciseId, workoutId };
		});
		const lifter = as("renamer");

		// Live clients send only the name.
		await lifter.mutation(addLiftingEntry, {
			workoutId,
			clientId: "set-1",
			exerciseName: "Landmine Press",
			lifting: { setNumber: 1, reps: 8, weight: 70, unit: "lb" },
		});
		await t.run((ctx) => ctx.db.patch(workoutId, { status: "completed", completedAt: START + HOUR }));

		await lifter.mutation(updateExercise, { id: exerciseId, name: "Half-Kneeling Landmine Press" });

		const history = await lifter.query(getExerciseHistory, {
			exerciseName: "Half-Kneeling Landmine Press",
		});
		assert.deepEqual(weights(history), [[70]]);
	});

	test("legacy sets without an exercise id follow the rename after the backfill", async () => {
		const { t, as } = setup();
		const { exerciseId } = await t.run(async (ctx) => {
			const userId = await insertUser(ctx, "legacy-renamer");
			const exerciseId = await insertCustomExercise(ctx, userId, "Jefferson Curl");
			const older = await insertWorkout(ctx, userId, 0);
			const newer = await insertWorkout(ctx, userId, 24);
			await insertSet(ctx, { userId, workoutId: older, exerciseName: "Jefferson Curl", hour: 0, setNumber: 1, weight: 25 });
			await insertSet(ctx, { userId, workoutId: newer, exerciseName: "Jefferson Curl", hour: 24, setNumber: 1, weight: 35 });
			return { exerciseId };
		});

		await t.action(backfill, { dryRun: false });
		const lifter = as("legacy-renamer");
		await lifter.mutation(updateExercise, { id: exerciseId, name: "Weighted Jefferson Curl" });

		const history = await lifter.query(getExerciseHistory, {
			exerciseName: "Weighted Jefferson Curl",
		});
		assert.deepEqual(weights(history), [[35], [25]]);
	});
});

describe("timed history after a custom exercise is renamed", () => {
	test("holds logged under the old name show in the new name's history", async () => {
		const { t, as } = setup();
		await t.run(async (ctx) => {
			const userId = await insertUser(ctx, "timed-renamer");
			const exerciseId = await insertCustomExercise(ctx, userId, "Copenhagen Plank");
			const workoutId = await insertWorkout(ctx, userId, 0);
			await insertSet(ctx, { userId, workoutId, exerciseName: "Side Plank Adductor", exerciseId, hour: 0, setNumber: 1, durationSeconds: 40 });
		});

		const history = await as("timed-renamer").query(getTimedExerciseHistory, {
			exerciseName: "Copenhagen Plank",
		});
		assert.deepEqual(history.map((session) => session.longestHoldSeconds), [40]);
	});
});

describe("legacy entries without an exercise id", () => {
	async function seedLegacy() {
		const { t, as } = setup();
		await t.run(async (ctx) => {
			const userId = await insertUser(ctx, "legacy");
			await insertSystemExercise(ctx, "Bench Press", ["Flat Bench Press"]);
			const workoutId = await insertWorkout(ctx, userId, 0);
			// Resolvable to the system exercise.
			await insertSet(ctx, { userId, workoutId, exerciseName: "Bench Press", hour: 0, setNumber: 1, weight: 185 });
			// No exercise has this name.
			await insertSet(ctx, { userId, workoutId, exerciseName: "Zercher Carry", hour: 0, setNumber: 2, weight: 135 });
		});
		return { t, lifter: as("legacy") };
	}

	test("are found by name before the backfill", async () => {
		const { lifter } = await seedLegacy();
		assert.deepEqual(weights(await lifter.query(getExerciseHistory, { exerciseName: "Bench Press" })), [[185]]);
		assert.deepEqual(weights(await lifter.query(getExerciseHistory, { exerciseName: "Zercher Carry" })), [[135]]);
	});

	test("are still found after the backfill, resolved or not", async () => {
		const { t, lifter } = await seedLegacy();
		await t.action(backfill, { dryRun: false });
		assert.deepEqual(weights(await lifter.query(getExerciseHistory, { exerciseName: "Bench Press" })), [[185]]);
		assert.deepEqual(weights(await lifter.query(getExerciseHistory, { exerciseName: "Zercher Carry" })), [[135]]);
	});
});

describe("history for a normal user", () => {
	// Expected values are what the old full scan by exerciseName returned for
	// this data: newest completed session first, sets in set order, warm-ups
	// marked, in-progress workouts and other exercises left out.
	async function seedNormalUser() {
		const { t, as } = setup();
		const ids = await t.run(async (ctx) => {
			const userId = await insertUser(ctx, "normal");
			await insertSystemExercise(ctx, "Squat");
			await insertSystemExercise(ctx, "Plank");
			const monday = await insertWorkout(ctx, userId, 0);
			const wednesday = await insertWorkout(ctx, userId, 48);
			const friday = await insertWorkout(ctx, userId, 96, "in_progress");
			for (const [workoutId, hour, top] of [
				[monday, 0, 225],
				[wednesday, 48, 235],
				[friday, 96, 245],
			] as const) {
				await insertSet(ctx, { userId, workoutId, exerciseName: "Squat", hour, setNumber: 2, weight: top });
				await insertSet(ctx, { userId, workoutId, exerciseName: "Squat", hour, setNumber: 1, weight: 135, isWarmup: true });
				await insertSet(ctx, { userId, workoutId, exerciseName: "Plank", hour, setNumber: 1, durationSeconds: hour + 30 });
				await insertSet(ctx, { userId, workoutId, exerciseName: "Deadlift", hour, setNumber: 1, weight: 315 });
			}
			return { monday, wednesday };
		});
		return { lifter: as("normal"), ...ids };
	}

	test("returns the same lifting sessions as the old scan", async () => {
		const { lifter, monday, wednesday } = await seedNormalUser();
		const history = await lifter.query(getExerciseHistory, { exerciseName: "Squat" });

		assert.deepEqual(
			history.map((session) => session.workoutId),
			[wednesday, monday]
		);
		assert.deepEqual(
			history.map((session) => session.sets.map((set) => [set.setNumber, set.weight, set.isWarmup])),
			[
				[[1, 135, true], [2, 235, false]],
				[[1, 135, true], [2, 225, false]],
			]
		);
		assert.deepEqual(history.map((session) => session.bestSet.weight), [235, 225]);
		assert.equal(history[0].date, new Date(START + 48 * HOUR + HOUR / 2).toISOString());

		const lastOnly = await lifter.query(getExerciseHistory, { exerciseName: "Squat", sessionCount: 1 });
		assert.deepEqual(lastOnly.map((session) => session.workoutId), [wednesday]);
	});

	test("returns the same timed sessions as the old scan", async () => {
		const { lifter, monday, wednesday } = await seedNormalUser();
		const history = await lifter.query(getTimedExerciseHistory, { exerciseName: "Plank" });

		assert.deepEqual(
			history.map((session) => [session.workoutId, session.longestHoldSeconds]),
			[
				[wednesday, 78],
				[monday, 30],
			]
		);
		// A timed exercise has no reps sessions.
		assert.deepEqual(await lifter.query(getExerciseHistory, { exerciseName: "Plank" }), []);
	});
});

describe("history user isolation", () => {
	test("never returns another user's sets for the same exercise", async () => {
		const { t, as } = setup();
		const { otherExerciseId } = await t.run(async (ctx) => {
			const mine = await insertUser(ctx, "me");
			const theirs = await insertUser(ctx, "them");
			const squat = await insertSystemExercise(ctx, "Squat");
			const otherExerciseId = await insertCustomExercise(ctx, theirs, "Belt Squat");
			const myWorkout = await insertWorkout(ctx, mine, 0);
			const theirWorkout = await insertWorkout(ctx, theirs, 0);
			await insertSet(ctx, { userId: mine, workoutId: myWorkout, exerciseName: "Squat", exerciseId: squat, hour: 0, setNumber: 1, weight: 200 });
			await insertSet(ctx, { userId: theirs, workoutId: theirWorkout, exerciseName: "Squat", exerciseId: squat, hour: 0, setNumber: 1, weight: 400 });
			await insertSet(ctx, { userId: theirs, workoutId: theirWorkout, exerciseName: "Belt Squat", exerciseId: otherExerciseId, hour: 0, setNumber: 2, weight: 300 });
			return { otherExerciseId };
		});

		const me = as("me");
		assert.deepEqual(weights(await me.query(getExerciseHistory, { exerciseName: "Squat" })), [[200]]);
		// Another user's exercise id gives nothing of theirs.
		assert.deepEqual(
			await me.query(getExerciseHistory, { exerciseName: "Belt Squat", exerciseId: otherExerciseId }),
			[]
		);
	});
});

describe("history with an explicit exercise id", () => {
	test("returns sets logged under any name for that exercise id", async () => {
		const { t, as } = setup();
		const { exerciseId } = await t.run(async (ctx) => {
			const userId = await insertUser(ctx, "by-id");
			const exerciseId = await insertCustomExercise(ctx, userId, "Pendlay Row");
			const older = await insertWorkout(ctx, userId, 0);
			const newer = await insertWorkout(ctx, userId, 24);
			await insertSet(ctx, { userId, workoutId: older, exerciseName: "Dead Stop Row", exerciseId, hour: 0, setNumber: 1, weight: 155 });
			await insertSet(ctx, { userId, workoutId: newer, exerciseName: "Pendlay Row", exerciseId, hour: 24, setNumber: 1, weight: 165 });
			return { exerciseId };
		});

		const lifter = as("by-id");
		// "Dead Stop Row" no longer names an exercise, so only the id links it.
		assert.deepEqual(
			weights(await lifter.query(getExerciseHistory, { exerciseName: "Dead Stop Row", exerciseId })),
			[[165], [155]]
		);
		assert.deepEqual(
			weights(await lifter.query(getExerciseHistory, { exerciseName: "Dead Stop Row" })),
			[[155]]
		);
	});
});
