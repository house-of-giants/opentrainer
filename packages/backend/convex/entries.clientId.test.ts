import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

// The mobile app replays sets it has not seen confirmed, with the clientId it
// logged them with. A replay of a set the server already has must not add it
// again.

const modules = {
	"./_generated/server.ts": () => import("./_generated/server"),
	"./entries.ts": () => import("./entries"),
};

type LiftingArgs = {
	workoutId: Id<"workouts">;
	clientId: string;
	exerciseName: string;
	lifting: {
		setNumber: number;
		reps?: number;
		weight?: number;
		durationSeconds?: number;
		unit: "kg" | "lb";
	};
};

const addLiftingEntry = makeFunctionReference<
	"mutation",
	LiftingArgs,
	Id<"entries">
>("entries:addLiftingEntry");

async function setUp() {
	const t = convexTest(schema, modules).withIdentity({
		issuer: "https://opentrainer.app/test",
		subject: "replay-user",
	});
	const workoutId = await t.run(async (ctx) => {
		const userId = await ctx.db.insert("users", {
			clerkId: "replay-user",
			createdAt: 1,
			updatedAt: 1,
		});
		return ctx.db.insert("workouts", {
			userId,
			status: "in_progress",
			startedAt: 1,
		});
	});
	return { t, workoutId };
}

describe("addLiftingEntry replay with the same clientId", () => {
	for (const [kind, lifting] of [
		["rep", { setNumber: 1, reps: 5, weight: 185, unit: "lb" }],
		["timed", { setNumber: 1, durationSeconds: 45, unit: "lb" }],
	] as const) {
		test(`stores a ${kind} set once and returns the same entry id`, async () => {
			const { t, workoutId } = await setUp();
			const args = {
				workoutId,
				clientId: "device-1",
				exerciseName: "Bench Press",
				lifting,
			};

			const firstId = await t.mutation(addLiftingEntry, args);
			const replayId = await t.mutation(addLiftingEntry, args);
			const otherId = await t.mutation(addLiftingEntry, {
				...args,
				clientId: "device-2",
			});

			assert.equal(replayId, firstId);
			assert.notEqual(otherId, firstId);
			const stored = await t.run((ctx) =>
				ctx.db
					.query("entries")
					.withIndex("by_workout_created", (q) => q.eq("workoutId", workoutId))
					.collect()
			);
			assert.deepEqual(
				stored.map((entry) => entry.clientId).sort(),
				["device-1", "device-2"]
			);
		});
	}
});
