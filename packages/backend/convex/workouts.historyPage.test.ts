import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import schema from "./schema";

const modules = {
	"./_generated/server.ts": () => import("./_generated/server"),
	"./workouts.ts": () => import("./workouts"),
};

type HistoryPage = {
	page: Array<{ _id: string; startedAt: number; status: string; title?: string }>;
	isDone: boolean;
	continueCursor: string;
};

const getWorkoutHistoryPage = makeFunctionReference<
	"query",
	{
		paginationOpts: { numItems: number; cursor: string | null };
		status?: "completed" | "cancelled" | "all";
	},
	HistoryPage
>("workouts:getWorkoutHistoryPage");

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2020, 0, 1);

async function setup() {
	const t = convexTest(schema, modules);
	await t.run(async (ctx) => {
		const lifter = await ctx.db.insert("users", { clerkId: "lifter", createdAt: 1, updatedAt: 1 });
		const other = await ctx.db.insert("users", { clerkId: "other", createdAt: 1, updatedAt: 1 });
		// 150 completed workouts, inserted oldest-last so insertion order differs
		// from start-time order. Day i is BASE + i days.
		for (let i = 149; i >= 0; i--) {
			await ctx.db.insert("workouts", {
				userId: lifter,
				status: "completed",
				startedAt: BASE + i * DAY,
				completedAt: BASE + i * DAY + 3600_000,
				title: `Lifter ${i}`,
			});
		}
		await ctx.db.insert("workouts", {
			userId: lifter,
			status: "in_progress",
			startedAt: BASE + 500 * DAY,
			title: "Active",
		});
		await ctx.db.insert("workouts", {
			userId: lifter,
			status: "cancelled",
			startedAt: BASE + 400 * DAY,
			completedAt: BASE + 400 * DAY + 60_000,
			title: "Cancelled",
		});
		for (let i = 0; i < 5; i++) {
			await ctx.db.insert("workouts", {
				userId: other,
				status: "completed",
				startedAt: BASE + (300 + i) * DAY,
				completedAt: BASE + (300 + i) * DAY + 3600_000,
				title: `Other ${i}`,
			});
		}
	});
	const as = (subject: string) =>
		t.withIdentity({ issuer: "https://opentrainer.app/test", subject });
	return { t, as };
}

async function readAll(
	client: { query: (ref: typeof getWorkoutHistoryPage, args: never) => Promise<HistoryPage> },
	numItems: number,
	status?: "completed" | "cancelled" | "all",
) {
	const pages: HistoryPage[] = [];
	let cursor: string | null = null;
	for (let guard = 0; guard < 20; guard++) {
		const result: HistoryPage = await client.query(getWorkoutHistoryPage, {
			paginationOpts: { numItems, cursor },
			...(status ? { status } : {}),
		} as never);
		pages.push(result);
		if (result.isDone) return pages;
		cursor = result.continueCursor;
	}
	throw new Error("pagination did not finish");
}

describe("getWorkoutHistoryPage", () => {
	test("returns completed workouts newest first, one page of the asked size", async () => {
		const { as } = await setup();

		const first = await as("lifter").query(getWorkoutHistoryPage, {
			paginationOpts: { numItems: 50, cursor: null },
		});

		assert.equal(first.page.length, 50);
		assert.equal(first.isDone, false);
		assert.equal(first.page[0].title, "Lifter 149");
		assert.equal(first.page[49].title, "Lifter 100");
		for (let i = 1; i < first.page.length; i++) {
			assert.ok(first.page[i - 1].startedAt > first.page[i].startedAt, `page out of order at ${i}`);
		}
	});

	test("continues from the cursor past the old 100-workout cap without gaps or repeats", async () => {
		const { as } = await setup();

		const pages = await readAll(as("lifter"), 50);
		const titles = pages.flatMap((p) => p.page.map((w) => w.title));

		assert.equal(titles.length, 150);
		assert.equal(new Set(titles).size, 150);
		const expected = Array.from({ length: 150 }, (_, i) => `Lifter ${149 - i}`);
		assert.deepEqual(titles, expected);
		assert.equal(pages.at(-1)?.isDone, true);
		// Workouts 0..49 sit past the old limit of 100.
		assert.ok(titles.includes("Lifter 0"));
	});

	test("never returns another user's workouts or in-progress workouts", async () => {
		const { as } = await setup();

		const lifterTitles = (await readAll(as("lifter"), 40, "all")).flatMap((p) =>
			p.page.map((w) => w.title),
		);
		assert.equal(lifterTitles.length, 151);
		assert.ok(lifterTitles.includes("Cancelled"));
		assert.ok(!lifterTitles.includes("Active"));
		assert.ok(lifterTitles.every((title) => !title?.startsWith("Other")));

		const otherTitles = (await readAll(as("other"), 40)).flatMap((p) =>
			p.page.map((w) => w.title),
		);
		assert.deepEqual(otherTitles, ["Other 4", "Other 3", "Other 2", "Other 1", "Other 0"]);
	});

	test("returns an empty, finished page when signed out", async () => {
		const { t } = await setup();

		const result = await t.query(getWorkoutHistoryPage, {
			paginationOpts: { numItems: 50, cursor: null },
		});

		assert.deepEqual(result.page, []);
		assert.equal(result.isDone, true);
	});
});
