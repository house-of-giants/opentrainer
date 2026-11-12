import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = {
	"./_generated/server.ts": () => import("./_generated/server"),
	"./users.ts": () => import("./users"),
	"./webhooks.ts": () => import("./webhooks"),
};

const getOrCreateUser = makeFunctionReference<
	"mutation",
	{ clerkId: string; email?: string; name?: string; imageUrl?: string },
	Id<"users">
>("users:getOrCreateUser");

const upsertUser = makeFunctionReference<
	"mutation",
	{ clerkId: string; email?: string; name?: string; imageUrl?: string },
	Id<"users">
>("webhooks:upsertUser");

const updateUserTier = makeFunctionReference<
	"mutation",
	{ clerkId: string; tier: "free" | "pro" },
	null
>("webhooks:updateUserTier");

async function readUser(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
	const user = await t.run((ctx) => ctx.db.get(userId));
	assert.ok(user, "user row must exist");
	return user;
}

describe("new accounts get early-access Pro, not lifetime alpha Pro", () => {
	test("getOrCreateUser gives a new account Pro for early access without the alpha flag", async () => {
		const t = convexTest(schema, modules);

		const userId = await t.mutation(getOrCreateUser, {
			clerkId: "new-user",
			email: "new@example.com",
		});
		const user = await readUser(t, userId);

		assert.equal(user.tier, "pro");
		assert.equal(user.isAlphaUser, undefined);
		assert.equal(user.proReason, "early_access");
	});

	test("the Clerk user.created webhook gives a new account the same early-access Pro", async () => {
		const t = convexTest(schema, modules);

		const userId = await t.mutation(upsertUser, { clerkId: "webhook-user" });
		const user = await readUser(t, userId);

		assert.equal(user.tier, "pro");
		assert.equal(user.isAlphaUser, undefined);
		assert.equal(user.proReason, "early_access");
	});
});

describe("existing accounts keep what they have", () => {
	test("getOrCreateUser does not change tier, alpha flag, or Pro reason of an existing alpha account", async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) =>
			ctx.db.insert("users", {
				clerkId: "alpha-user",
				email: "old@example.com",
				tier: "pro",
				isAlphaUser: true,
				createdAt: 1,
				updatedAt: 1,
			}),
		);

		const returnedId = await t.mutation(getOrCreateUser, {
			clerkId: "alpha-user",
			email: "changed@example.com",
		});
		const user = await readUser(t, userId);

		assert.equal(returnedId, userId);
		assert.equal(user.email, "changed@example.com");
		assert.equal(user.tier, "pro");
		assert.equal(user.isAlphaUser, true);
		assert.equal(user.proReason, undefined);
	});

	test("the Clerk webhook does not change tier, alpha flag, or Pro reason of an existing alpha account", async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) =>
			ctx.db.insert("users", {
				clerkId: "alpha-user",
				tier: "pro",
				isAlphaUser: true,
				createdAt: 1,
				updatedAt: 1,
			}),
		);

		await t.mutation(upsertUser, { clerkId: "alpha-user", name: "Renamed" });
		const user = await readUser(t, userId);

		assert.equal(user.name, "Renamed");
		assert.equal(user.tier, "pro");
		assert.equal(user.isAlphaUser, true);
		assert.equal(user.proReason, undefined);
	});
});

describe("billing webhook tier changes", () => {
	test("a paid upgrade records paid as the Pro reason", async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) =>
			ctx.db.insert("users", {
				clerkId: "payer",
				tier: "free",
				createdAt: 1,
				updatedAt: 1,
			}),
		);

		await t.mutation(updateUserTier, { clerkId: "payer", tier: "pro" });
		const user = await readUser(t, userId);

		assert.equal(user.tier, "pro");
		assert.equal(user.proReason, "paid");
	});

	test("a downgrade of a paid account sets free and clears the Pro reason", async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) =>
			ctx.db.insert("users", {
				clerkId: "lapsed",
				tier: "pro",
				proReason: "paid",
				createdAt: 1,
				updatedAt: 1,
			}),
		);

		await t.mutation(updateUserTier, { clerkId: "lapsed", tier: "free" });
		const user = await readUser(t, userId);

		assert.equal(user.tier, "free");
		assert.equal(user.proReason, undefined);
	});

	test("a free-plan event does not downgrade an early-access account", async () => {
		const t = convexTest(schema, modules);
		const userId = await t.mutation(getOrCreateUser, { clerkId: "early" });

		await t.mutation(updateUserTier, { clerkId: "early", tier: "free" });
		const user = await readUser(t, userId);

		assert.equal(user.tier, "pro");
		assert.equal(user.proReason, "early_access");
	});

	test("a free-plan event does not downgrade an alpha account", async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) =>
			ctx.db.insert("users", {
				clerkId: "alpha-user",
				tier: "pro",
				isAlphaUser: true,
				createdAt: 1,
				updatedAt: 1,
			}),
		);

		await t.mutation(updateUserTier, { clerkId: "alpha-user", tier: "free" });
		const user = await readUser(t, userId);

		assert.equal(user.tier, "pro");
		assert.equal(user.isAlphaUser, true);
	});
});

const completeOnboarding = makeFunctionReference<
	"mutation",
	{
		goals?: Array<"strength" | "hypertrophy" | "endurance" | "weight_loss" | "general_fitness">;
		experienceLevel?: "beginner" | "intermediate" | "advanced";
		equipmentDescription?: string;
		equipment?: string[];
		weeklyAvailability?: number;
		sessionDuration?: number;
	},
	Id<"users">
>("users:completeOnboarding");

describe("completeOnboarding", () => {
	async function setupOnboardingUser() {
		const db = convexTest(schema, modules);
		const t = db.withIdentity({ subject: "onboarding-user" });
		const userId = await db.run((ctx) =>
			ctx.db.insert("users", { clerkId: "onboarding-user", createdAt: 1, updatedAt: 1 }),
		);
		return { db, t, userId };
	}

	test("a lifter who brings a program finishes without profile answers, and none are invented", async () => {
		const { db, t, userId } = await setupOnboardingUser();

		await t.mutation(completeOnboarding, {});
		const user = await readUser(db, userId);

		assert.equal(typeof user.onboardingCompletedAt, "number");
		assert.equal(user.goals, undefined);
		assert.equal(user.experienceLevel, undefined);
		assert.equal(user.equipment, undefined);
		assert.equal(user.weeklyAvailability, undefined);
		assert.equal(user.sessionDuration, undefined);
	});

	test("the generate path still saves every answer", async () => {
		const { db, t, userId } = await setupOnboardingUser();

		await t.mutation(completeOnboarding, {
			goals: ["strength"],
			experienceLevel: "advanced",
			equipmentDescription: "Garage gym",
			equipment: ["barbell"],
			weeklyAvailability: 3,
			sessionDuration: 45,
		});
		const user = await readUser(db, userId);

		assert.equal(typeof user.onboardingCompletedAt, "number");
		assert.deepEqual(user.goals, ["strength"]);
		assert.equal(user.experienceLevel, "advanced");
		assert.equal(user.equipmentDescription, "Garage gym");
		assert.deepEqual(user.equipment, ["barbell"]);
		assert.equal(user.weeklyAvailability, 3);
		assert.equal(user.sessionDuration, 45);
	});
});
