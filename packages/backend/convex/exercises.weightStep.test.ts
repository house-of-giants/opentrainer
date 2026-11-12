import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import schema from "./schema";

const modules = {
	"./_generated/server.ts": () => import("./_generated/server"),
	"./exercises.ts": () => import("./exercises"),
};

type WeightStepSetting = { weightStep: number; unit: "lb" | "kg" };

const getWeightStep = makeFunctionReference<
	"query",
	{ exerciseName: string },
	WeightStepSetting | null
>("exercises:getWeightStep");

const setWeightStep = makeFunctionReference<
	"mutation",
	{ exerciseName: string; weightStep: number | null; unit: "lb" | "kg" },
	null
>("exercises:setWeightStep");

async function setup(subjects: string[]) {
	const t = convexTest(schema, modules);
	await t.run(async (ctx) => {
		for (const subject of subjects) {
			await ctx.db.insert("users", {
				clerkId: subject,
				createdAt: 1,
				updatedAt: 1,
			});
		}
	});
	return (subject: string) =>
		t.withIdentity({ issuer: "https://opentrainer.app/test", subject });
}

describe("per-exercise weight step", () => {
	test("returns null until the user saves a step", async () => {
		const as = await setup(["lifter"]);
		assert.equal(
			await as("lifter").query(getWeightStep, { exerciseName: "Lateral Raise" }),
			null
		);
	});

	test("saves, updates, and clears a step for one exercise", async () => {
		const as = await setup(["lifter"]);
		const lifter = as("lifter");

		await lifter.mutation(setWeightStep, {
			exerciseName: "Lateral Raise",
			weightStep: 2.5,
			unit: "lb",
		});
		assert.deepEqual(
			await lifter.query(getWeightStep, { exerciseName: "Lateral Raise" }),
			{ weightStep: 2.5, unit: "lb" }
		);

		await lifter.mutation(setWeightStep, {
			exerciseName: "Lateral Raise",
			weightStep: 1.25,
			unit: "kg",
		});
		assert.deepEqual(
			await lifter.query(getWeightStep, { exerciseName: "Lateral Raise" }),
			{ weightStep: 1.25, unit: "kg" }
		);
		// Other exercises keep the default.
		assert.equal(
			await lifter.query(getWeightStep, { exerciseName: "Squat" }),
			null
		);

		await lifter.mutation(setWeightStep, {
			exerciseName: "Lateral Raise",
			weightStep: null,
			unit: "kg",
		});
		assert.equal(
			await lifter.query(getWeightStep, { exerciseName: "Lateral Raise" }),
			null
		);
	});

	test("keeps one user's step private from another user", async () => {
		const as = await setup(["alice", "bob"]);
		await as("alice").mutation(setWeightStep, {
			exerciseName: "Lateral Raise",
			weightStep: 2.5,
			unit: "lb",
		});
		assert.equal(
			await as("bob").query(getWeightStep, { exerciseName: "Lateral Raise" }),
			null
		);
	});

	test("rejects a step that is not positive or is too large", async () => {
		const as = await setup(["lifter"]);
		for (const weightStep of [0, -5, 51]) {
			await assert.rejects(
				as("lifter").mutation(setWeightStep, {
					exerciseName: "Lateral Raise",
					weightStep,
					unit: "lb",
				}),
				/weight step/i,
				`step ${weightStep}`
			);
		}
	});
});
