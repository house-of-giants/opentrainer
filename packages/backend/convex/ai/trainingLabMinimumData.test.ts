import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { getMondayWeekStartUtc, WEEK_IN_MS } from "../lib/week";
import { TRAINING_LAB_FULL_PROMPT } from "./prompts";
import type {
  TrainingLabCTAState,
  TrainingLabDashboardStats,
  TrainingLabReport,
} from "./trainingLabTypes";

const modules = {
  "../_generated/server.ts": () => import("../_generated/server"),
  "../users.ts": () => import("../users"),
  "../ai/aggregators.ts": () => import("./aggregators"),
  "../ai/rateLimitQueries.ts": () => import("./rateLimitQueries"),
  "../ai/trainingLab.ts": () => import("./trainingLab"),
  "../ai/trainingLabMutations.ts": () => import("./trainingLabMutations"),
};

const getCtaState = makeFunctionReference<"query", Record<string, never>, TrainingLabCTAState | null>(
  "ai/trainingLabMutations:getCtaState"
);
const getDashboardStats = makeFunctionReference<
  "query",
  Record<string, never>,
  TrainingLabDashboardStats | null
>("ai/trainingLabMutations:getDashboardStats");
const generateReport = makeFunctionReference<
  "action",
  { reportType: "snapshot" | "full"; periodDays?: number },
  TrainingLabReport
>("ai/trainingLab:generateReport");

const CLERK_ID = "training-lab-user";

function createTest() {
  return convexTest(schema, modules).withIdentity({
    issuer: "https://opentrainer.app/test",
    subject: CLERK_ID,
  });
}

type TestConvex = ReturnType<typeof createTest>;

async function insertProUser(t: TestConvex) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      clerkId: CLERK_ID,
      tier: "pro",
      preferredUnits: "lb",
      createdAt: 1,
      updatedAt: 1,
    })
  );
}

/** Start times inside the current Monday-based week, never in the future. */
function thisWeekStart(index: number) {
  const now = Date.now();
  return Math.max(getMondayWeekStartUtc(now), now - (index + 1) * 60_000);
}

/** Start times well before the current week. */
function earlierStart(index: number) {
  return getMondayWeekStartUtc(Date.now()) - 2 * WEEK_IN_MS - index * 24 * 60 * 60 * 1000;
}

async function insertCompletedWorkout(t: TestConvex, userId: Id<"users">, startedAt: number) {
  return t.run((ctx) =>
    ctx.db.insert("workouts", {
      userId,
      status: "completed",
      startedAt,
      completedAt: startedAt + 1000,
    })
  );
}

async function insertBenchSet(
  t: TestConvex,
  userId: Id<"users">,
  workoutId: Id<"workouts">,
  setNumber: number,
  isWarmup: boolean
) {
  return t.run((ctx) =>
    ctx.db.insert("entries", {
      workoutId,
      userId,
      exerciseName: "Bench Press",
      kind: "lifting",
      lifting: {
        setNumber,
        reps: isWarmup ? 10 : 5,
        weight: isWarmup ? 95 : 185,
        unit: "lb",
        rpe: isWarmup ? 4 : 8,
        isWarmup,
      },
      createdAt: Date.now(),
    })
  );
}

const MODEL_FULL_REPORT = {
  summary: "Pressing volume is steady.",
  scores: {
    volumeAdherence: 70,
    intensityManagement: 65,
    muscleBalance: 40,
    recoveryBalance: 55,
  },
  insights: [
    {
      category: "volume",
      observation: "3 working sets of bench press this week.",
      recommendation: "Keep the same volume next week.",
      priority: "medium",
    },
  ],
  alerts: [],
};

let originalFetch: typeof globalThis.fetch;
let originalApiKey: string | undefined;
let modelRequests: Array<{ messages: Array<{ role: string; content: string }> }>;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalApiKey = process.env.OPENROUTER_API_KEY;
  modelRequests = [];
  // Never reach the real model provider from tests.
  process.env.OPENROUTER_API_KEY = "test-key";
  globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
    modelRequests.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(MODEL_FULL_REPORT) } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = originalApiKey;
  }
});

describe("Training Lab minimum data", () => {
  test("CTA blocks a report with 3 completed workouts and says how many more are needed", async () => {
    const t = createTest();
    const userId = await insertProUser(t);
    for (let i = 0; i < 3; i++) {
      await insertCompletedWorkout(t, userId, thisWeekStart(i));
    }

    const cta = await t.query(getCtaState, {});

    assert.ok(cta);
    assert.equal(cta.totalWorkouts, 3);
    assert.equal(cta.canGenerate, false);
    assert.equal(cta.message, "Complete 1 more workout to unlock your analysis");
  });

  test("CTA says how many workouts are needed when there are none", async () => {
    const t = createTest();
    await insertProUser(t);

    const cta = await t.query(getCtaState, {});

    assert.ok(cta);
    assert.equal(cta.canGenerate, false);
    assert.equal(cta.message, "Complete 4 workouts to unlock your analysis");
  });

  test("CTA uses the plural count below the minimum", async () => {
    const t = createTest();
    const userId = await insertProUser(t);
    await insertCompletedWorkout(t, userId, thisWeekStart(0));

    const cta = await t.query(getCtaState, {});

    assert.ok(cta);
    assert.equal(cta.canGenerate, false);
    assert.equal(cta.message, "Complete 3 more workouts to unlock your analysis");
  });

  test("CTA counts all completed workouts, not only this week's, toward the minimum", async () => {
    const t = createTest();
    const userId = await insertProUser(t);
    for (let i = 0; i < 3; i++) {
      await insertCompletedWorkout(t, userId, earlierStart(i));
    }
    await insertCompletedWorkout(t, userId, thisWeekStart(0));

    const cta = await t.query(getCtaState, {});

    assert.ok(cta);
    assert.equal(cta.totalWorkouts, 4);
    assert.equal(cta.canGenerate, true);
  });

  test("CTA still requires a workout in the report window above the minimum", async () => {
    const t = createTest();
    const userId = await insertProUser(t);
    for (let i = 0; i < 4; i++) {
      await insertCompletedWorkout(t, userId, earlierStart(i));
    }

    const cta = await t.query(getCtaState, {});

    assert.ok(cta);
    assert.equal(cta.canGenerate, false);
    assert.equal(cta.message, "Complete a workout this week to generate your analysis");
  });

  test("generateReport rejects below the minimum and never calls the model", async () => {
    const t = createTest();
    const userId = await insertProUser(t);
    for (let i = 0; i < 3; i++) {
      await insertCompletedWorkout(t, userId, thisWeekStart(i));
    }

    await assert.rejects(
      t.action(generateReport, { reportType: "full" }),
      /Complete 1 more workout to unlock your analysis/
    );
    assert.equal(modelRequests.length, 0);
    const assessments = await t.run((ctx) => ctx.db.query("assessments").collect());
    assert.equal(assessments.length, 0);
  });
});

describe("Training Lab report content", () => {
  async function seedEligibleUserWithWarmups(t: TestConvex) {
    const userId = await insertProUser(t);
    await t.run((ctx) =>
      ctx.db.insert("exercises", {
        name: "Bench Press",
        category: "lifting",
        muscleGroups: ["chest", "triceps"],
        isSystemExercise: true,
        createdAt: 1,
      })
    );
    for (let i = 0; i < 3; i++) {
      await insertCompletedWorkout(t, userId, earlierStart(i));
    }
    const workoutId = await insertCompletedWorkout(t, userId, thisWeekStart(0));
    await insertBenchSet(t, userId, workoutId, 1, true);
    await insertBenchSet(t, userId, workoutId, 2, true);
    await insertBenchSet(t, userId, workoutId, 3, false);
    await insertBenchSet(t, userId, workoutId, 4, false);
    await insertBenchSet(t, userId, workoutId, 5, false);
    return userId;
  }

  test("report muscle set counts exclude warm-ups and match the muscle analytics screen", async () => {
    const t = createTest();
    await seedEligibleUserWithWarmups(t);

    const report = await t.action(generateReport, { reportType: "full" });
    const stats = await t.query(getDashboardStats, {});

    // 2 warm-up sets + 3 working sets of a chest/triceps press: only working sets count.
    const screenSets = Object.fromEntries(
      (stats?.muscleAnalytics?.split ?? []).map((row) => [row.muscle, row.sets])
    );
    assert.deepEqual(screenSets, { chest: 3, triceps: 3 });

    assert.equal(modelRequests.length, 1);
    const payload = JSON.parse(modelRequests[0].messages[1].content) as {
      vol: Array<{ m: string; s: number }>;
    };
    const payloadSets = Object.fromEntries(payload.vol.map((row) => [row.m, row.s]));
    assert.deepEqual(payloadSets, screenSets);

    const chartSets = Object.fromEntries(
      report.chartData.volumeByMuscle.map((row) => [row.muscle, row.sets])
    );
    assert.deepEqual(chartSets, screenSets);
  });

  test("new full reports do not store scores even if the model returns them", async () => {
    const t = createTest();
    await seedEligibleUserWithWarmups(t);

    const report = await t.action(generateReport, { reportType: "full" });

    assert.equal("scores" in report, false);
    const { assessments, details } = await t.run(async (ctx) => ({
      assessments: await ctx.db.query("assessments").collect(),
      details: await ctx.db.query("assessmentDetails").collect(),
    }));
    assert.equal(assessments.length, 1);
    assert.equal(assessments[0].summary, MODEL_FULL_REPORT.summary);
    assert.equal(assessments[0].scores, undefined);
    assert.equal(details.length, 1);
    const storedReport = JSON.parse(details[0].contentMarkdown) as Record<string, unknown>;
    assert.equal("scores" in storedReport, false);
    assert.deepEqual(storedReport.insights, MODEL_FULL_REPORT.insights);
  });

  test("full prompt no longer asks for scores and allows saying a pattern is not clear yet", () => {
    assert.doesNotMatch(TRAINING_LAB_FULL_PROMPT, /"scores"/);
    assert.doesNotMatch(TRAINING_LAB_FULL_PROMPT, /SCORING RUBRIC/);
    assert.doesNotMatch(TRAINING_LAB_FULL_PROMPT, /NEVER say "insufficient data"/);
    assert.match(TRAINING_LAB_FULL_PROMPT, /not clear yet/);
  });
});
