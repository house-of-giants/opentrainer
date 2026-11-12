import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import schema from "./schema";

const modules = {
	"./_generated/server.ts": () => import("./_generated/server"),
	"./historyImport.ts": () => import("./historyImport"),
	"./exercises.ts": () => import("./exercises"),
};

type ImportSet = {
	exerciseName: string;
	exerciseId?: string;
	reps?: number;
	weight?: number;
	durationSeconds?: number;
	unit: "kg" | "lb";
	rpe?: number;
	isWarmup?: boolean;
	notes?: string;
};

type ImportWorkout = {
	startedAt: number;
	completedAt?: number;
	title?: string;
	notes?: string;
	sets: ImportSet[];
};

const importWorkouts = makeFunctionReference<
	"mutation",
	{ workouts: ImportWorkout[] },
	{ created: number; duplicates: number; sets: number }
>("historyImport:importWorkouts");

const createExercise = makeFunctionReference<
	"mutation",
	{ name: string; category: "lifting"; measurementType?: "reps" | "duration" },
	string
>("exercises:createExercise");

// 2024-03-18 07:30 UTC and 2024-03-20 18:05 UTC
const MONDAY = Date.UTC(2024, 2, 18, 7, 30);
const WEDNESDAY = Date.UTC(2024, 2, 20, 18, 5);

const strongStyleFile: ImportWorkout[] = [
	{
		startedAt: MONDAY,
		completedAt: MONDAY + 65 * 60_000,
		title: "Legs",
		notes: "Felt good",
		sets: [
			{ exerciseName: "Squat", weight: 135, reps: 5, unit: "lb", isWarmup: true },
			{ exerciseName: "Squat", weight: 225, reps: 5, unit: "lb", rpe: 7 },
			{ exerciseName: "Squat", weight: 225, reps: 5, unit: "lb", rpe: 8.5, notes: "belt" },
			{ exerciseName: "Plank", durationSeconds: 60, unit: "lb" },
		],
	},
	{
		startedAt: WEDNESDAY,
		title: "Push",
		sets: [
			{ exerciseName: "Bench Press", weight: 100, reps: 8, unit: "kg" },
			{ exerciseName: "Bench Press", weight: 100, reps: 7, unit: "kg" },
		],
	},
];

async function setup() {
	const t = convexTest(schema, modules);
	await t.run(async (ctx) => {
		await ctx.db.insert("users", { clerkId: "lifter", createdAt: 1, updatedAt: 1 });
		await ctx.db.insert("users", { clerkId: "other", createdAt: 1, updatedAt: 1 });
	});
	const as = (subject: string) =>
		t.withIdentity({ issuer: "https://opentrainer.app/test", subject });
	const userId = async (subject: string) =>
		t.run(async (ctx) => {
			const user = await ctx.db
				.query("users")
				.withIndex("by_clerk_id", (q) => q.eq("clerkId", subject))
				.first();
			return user!._id;
		});
	const savedWorkouts = async (subject: string) => {
		const id = await userId(subject);
		return t.run(async (ctx) => {
			const workouts = await ctx.db
				.query("workouts")
				.withIndex("by_user_started", (q) => q.eq("userId", id))
				.collect();
			return Promise.all(
				workouts.map(async (workout) => ({
					workout,
					entries: await ctx.db
						.query("entries")
						.withIndex("by_workout_created", (q) => q.eq("workoutId", workout._id))
						.collect(),
				}))
			);
		});
	};
	return { t, as, userId, savedWorkouts };
}

describe("historyImport.importWorkouts", () => {
	test("saves completed workouts with their original dates, units, and sets", async () => {
		const { as, savedWorkouts } = await setup();

		const result = await as("lifter").mutation(importWorkouts, { workouts: strongStyleFile });

		assert.deepEqual(result, { created: 2, duplicates: 0, sets: 6 });
		const saved = await savedWorkouts("lifter");
		assert.equal(saved.length, 2);

		const [legs, push] = saved;
		assert.equal(legs.workout.status, "completed");
		assert.equal(legs.workout.startedAt, MONDAY);
		assert.equal(legs.workout.completedAt, MONDAY + 65 * 60_000);
		assert.equal(legs.workout.title, "Legs");
		assert.equal(legs.workout.notes, "Felt good");
		assert.deepEqual(
			legs.entries.map((e) => [
				e.exerciseName,
				e.lifting?.setNumber,
				e.lifting?.weight,
				e.lifting?.reps ?? null,
				e.lifting?.durationSeconds ?? null,
				e.lifting?.unit,
				e.lifting?.isWarmup ?? false,
				e.lifting?.rpe ?? null,
			]),
			[
				["Squat", 1, 135, 5, null, "lb", true, null],
				["Squat", 2, 225, 5, null, "lb", false, 7],
				["Squat", 3, 225, 5, null, "lb", false, 8.5],
				["Plank", 1, undefined, null, 60, "lb", false, null],
			]
		);
		assert.equal(legs.entries[2].notes, "belt");

		assert.equal(push.workout.startedAt, WEDNESDAY);
		// No end time in the file: the workout ends when it starts.
		assert.equal(push.workout.completedAt, WEDNESDAY);
		assert.deepEqual(
			push.entries.map((e) => [e.lifting?.weight, e.lifting?.reps, e.lifting?.unit]),
			[
				[100, 8, "kg"],
				[100, 7, "kg"],
			]
		);
	});

	test("sets the workout summary the way workout completion does", async () => {
		const { as, savedWorkouts } = await setup();

		await as("lifter").mutation(importWorkouts, { workouts: strongStyleFile });

		const [legs, push] = await savedWorkouts("lifter");
		assert.deepEqual(legs.workout.summary, {
			totalVolume: 135 * 5 + 225 * 5 + 225 * 5,
			totalSets: 4,
			totalDurationMinutes: 65,
			exerciseCount: 2,
		});
		assert.equal(push.workout.summary?.totalSets, 2);
		// Summary volume is pounds: 100 kg x 15 reps = 1500 kg = 3306.93 lb.
		const pushVolume = push.workout.summary?.totalVolume ?? 0;
		assert.ok(Math.abs(pushVolume - 3306.93) < 0.01, `expected about 3306.93 lb, got ${pushVolume}`);
		assert.equal(push.workout.summary?.totalDurationMinutes, 0);
	});

	test("a second import of the same workouts creates no duplicates", async () => {
		const { as, savedWorkouts } = await setup();

		await as("lifter").mutation(importWorkouts, { workouts: strongStyleFile });
		const again = await as("lifter").mutation(importWorkouts, { workouts: strongStyleFile });

		assert.deepEqual(again, { created: 0, duplicates: 2, sets: 0 });
		const saved = await savedWorkouts("lifter");
		assert.equal(saved.length, 2);
		assert.deepEqual(
			saved.map((s) => s.entries.length),
			[4, 2]
		);
	});

	test("a re-import still finds a workout after the user edits its times", async () => {
		const { t, as, savedWorkouts } = await setup();

		await as("lifter").mutation(importWorkouts, { workouts: strongStyleFile });
		const [legs] = await savedWorkouts("lifter");
		await t.run((ctx) =>
			ctx.db.patch(legs.workout._id, { startedAt: MONDAY + 60_000, completedAt: MONDAY + 3_600_000 })
		);

		const again = await as("lifter").mutation(importWorkouts, { workouts: strongStyleFile });

		assert.equal(again.created, 0);
		assert.equal((await savedWorkouts("lifter")).length, 2);
	});

	test("skips a workout the app already logged at the same start time and name", async () => {
		const { t, as, userId, savedWorkouts } = await setup();
		const id = await userId("lifter");
		await t.run((ctx) =>
			ctx.db.insert("workouts", {
				userId: id,
				title: "push",
				status: "completed",
				startedAt: WEDNESDAY,
				completedAt: WEDNESDAY + 1,
			})
		);

		const result = await as("lifter").mutation(importWorkouts, { workouts: strongStyleFile });

		assert.deepEqual(result, { created: 1, duplicates: 1, sets: 4 });
		assert.equal((await savedWorkouts("lifter")).length, 2);
	});

	test("imports the same workouts separately for two users", async () => {
		const { as, savedWorkouts } = await setup();

		await as("lifter").mutation(importWorkouts, { workouts: strongStyleFile });
		const other = await as("other").mutation(importWorkouts, { workouts: strongStyleFile });

		assert.equal(other.created, 2);
		assert.equal((await savedWorkouts("other")).length, 2);
	});

	test("links sets to a custom exercise the user creates for an unmatched name", async () => {
		const { t, as, userId, savedWorkouts } = await setup();
		const exerciseId = await as("lifter").mutation(createExercise, {
			name: "Belt Squat",
			category: "lifting",
		});

		await as("lifter").mutation(importWorkouts, {
			workouts: [
				{
					startedAt: MONDAY,
					sets: [{ exerciseName: "belt squat (machine)", exerciseId, reps: 10, weight: 90, unit: "kg" }],
				},
			],
		});

		const [saved] = await savedWorkouts("lifter");
		assert.equal(saved.entries[0].exerciseId, exerciseId);
		// The entry takes the exercise's own name so history joins on it.
		assert.equal(saved.entries[0].exerciseName, "Belt Squat");
		const exercise = await t.run((ctx) => ctx.db.get(exerciseId as never));
		assert.equal((exercise as { userId?: string }).userId, await userId("lifter"));
	});

	test("rejects another user's custom exercise", async () => {
		const { as } = await setup();
		const exerciseId = await as("other").mutation(createExercise, {
			name: "Secret Lift",
			category: "lifting",
		});

		await assert.rejects(
			as("lifter").mutation(importWorkouts, {
				workouts: [
					{
						startedAt: MONDAY,
						sets: [{ exerciseName: "Secret Lift", exerciseId, reps: 5, unit: "lb" }],
					},
				],
			}),
			/Exercise not found/
		);
	});

	test("rejects sets with no reps and no time, and future dates", async () => {
		const { as, savedWorkouts } = await setup();

		await assert.rejects(
			as("lifter").mutation(importWorkouts, {
				workouts: [{ startedAt: MONDAY, sets: [{ exerciseName: "Squat", weight: 100, unit: "lb" }] }],
			}),
			/Reps must be greater than zero/
		);
		await assert.rejects(
			as("lifter").mutation(importWorkouts, {
				workouts: [
					{
						startedAt: Date.now() + 86_400_000,
						sets: [{ exerciseName: "Squat", reps: 5, unit: "lb" }],
					},
				],
			}),
			/future/
		);
		assert.equal((await savedWorkouts("lifter")).length, 0);
	});

	test("rejects a batch over the per-batch set limit", async () => {
		const { as } = await setup();
		const sets = Array.from({ length: 501 }, () => ({
			exerciseName: "Squat",
			reps: 5,
			unit: "lb" as const,
		}));

		await assert.rejects(
			as("lifter").mutation(importWorkouts, { workouts: [{ startedAt: MONDAY, sets }] }),
			/at most 25 workouts and 500 sets/
		);
	});
});
