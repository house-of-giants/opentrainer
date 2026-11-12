import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import schema from "../schema";

const modules = {
	"../_generated/server.ts": () => import("../_generated/server"),
	"../users.ts": () => import("../users"),
	"../ai/routineGenerator.ts": () => import("./routineGenerator"),
	"../ai/rateLimitQueries.ts": () => import("./rateLimitQueries"),
};

const generateRoutine = makeFunctionReference<
	"action",
	{ splitType: "full_body"; primaryGoal: "strength" },
	{ name: string }
>("ai/routineGenerator:generateRoutine");

const getRoutineSwapAlternatives = makeFunctionReference<
	"action",
	{ exerciseName: string; reason: "equipment" },
	{ alternatives: unknown[] }
>("ai/routineGenerator:getRoutineSwapAlternatives");

const GENERATION_LIMIT_MESSAGE =
	"Rate limit exceeded. You've used all 10 routine generation requests for today. Try again tomorrow.";
const SWAP_LIMIT_MESSAGE =
	"Rate limit exceeded. You've used all 10 routine swap requests for today. Try again tomorrow.";

const ROUTINE_JSON = JSON.stringify({
	name: "Full Body Strength",
	description: "Three full body days",
	weeklyStructure: "Mon/Wed/Fri",
	rationale: "Test routine",
	days: [
		{
			name: "Day A",
			focus: "Full body",
			exercises: [
				{ exerciseName: "Squat", kind: "lifting", targetSets: 3, targetReps: "5" },
			],
		},
	],
});

const SWAP_JSON = JSON.stringify({
	alternatives: [
		{
			exercise: "Goblet Squat",
			reasoning: "Needs only a dumbbell",
			equipmentNeeded: ["dumbbell"],
			difficultyAdjustment: "easier",
		},
	],
});

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENROUTER_API_KEY;
let fetchCalls = 0;

function stubModel(content: string, status = 200) {
	globalThis.fetch = (async () => {
		fetchCalls += 1;
		if (status !== 200) {
			return new Response("upstream error", { status });
		}
		return new Response(
			JSON.stringify({ choices: [{ message: { content } }] }),
			{ status: 200, headers: { "Content-Type": "application/json" } }
		);
	}) as typeof fetch;
}

async function setupProUser() {
	const t = convexTest(schema, modules);
	await t.run(async (ctx) => {
		await ctx.db.insert("users", {
			clerkId: "rate-limit-user",
			tier: "pro",
			createdAt: 1,
			updatedAt: 1,
		});
	});
	return t.withIdentity({
		issuer: "https://opentrainer.app/test",
		subject: "rate-limit-user",
	});
}

const generationArgs = { splitType: "full_body", primaryGoal: "strength" } as const;
const swapArgs = { exerciseName: "Squat", reason: "equipment" } as const;

describe("routine generation rate limit", () => {
	beforeEach(() => {
		fetchCalls = 0;
		process.env.OPENROUTER_API_KEY = "test-key";
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		if (originalApiKey === undefined) {
			delete process.env.OPENROUTER_API_KEY;
		} else {
			process.env.OPENROUTER_API_KEY = originalApiKey;
		}
	});

	test("rejects the 11th generation in 24 hours without calling the model", async () => {
		stubModel(ROUTINE_JSON);
		const t = await setupProUser();

		for (let i = 0; i < 10; i++) {
			const routine = await t.action(generateRoutine, generationArgs);
			assert.equal(routine.name, "Full Body Strength");
		}
		assert.equal(fetchCalls, 10);

		await assert.rejects(t.action(generateRoutine, generationArgs), {
			message: GENERATION_LIMIT_MESSAGE,
		});
		assert.equal(fetchCalls, 10);
	});

	test("counts generations whose model call fails", async () => {
		stubModel("", 500);
		const t = await setupProUser();

		for (let i = 0; i < 10; i++) {
			await assert.rejects(t.action(generateRoutine, generationArgs), /OpenRouter API error: 500/);
		}

		stubModel(ROUTINE_JSON);
		await assert.rejects(t.action(generateRoutine, generationArgs), {
			message: GENERATION_LIMIT_MESSAGE,
		});
		assert.equal(fetchCalls, 10);
	});

	test("does not count generations older than 24 hours", async () => {
		stubModel(ROUTINE_JSON);
		const t = await setupProUser();
		const dayAndAMinuteAgo = Date.now() - 24 * 60 * 60 * 1000 - 60 * 1000;
		await t.run(async (ctx) => {
			const user = await ctx.db.query("users").first();
			for (let i = 0; i < 10; i++) {
				await ctx.db.insert("aiUsage", {
					userId: user!._id,
					action: "routineGeneration",
					createdAt: dayAndAMinuteAgo,
				});
			}
		});

		const routine = await t.action(generateRoutine, generationArgs);
		assert.equal(routine.name, "Full Body Strength");
		assert.equal(fetchCalls, 1);
	});

	test("rejects the 11th routine swap and keeps generation available", async () => {
		stubModel(SWAP_JSON);
		const t = await setupProUser();

		for (let i = 0; i < 10; i++) {
			const result = await t.action(getRoutineSwapAlternatives, swapArgs);
			assert.equal(result.alternatives.length, 1);
		}
		await assert.rejects(t.action(getRoutineSwapAlternatives, swapArgs), {
			message: SWAP_LIMIT_MESSAGE,
		});
		assert.equal(fetchCalls, 10);

		stubModel(ROUTINE_JSON);
		const routine = await t.action(generateRoutine, generationArgs);
		assert.equal(routine.name, "Full Body Strength");
	});
});
