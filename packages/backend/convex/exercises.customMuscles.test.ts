import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { getMondayWeekStartUtc } from "./lib/week";
import type { TrainingLabDashboardStats } from "./ai/trainingLabTypes";

const modules = {
  "./_generated/server.ts": () => import("./_generated/server"),
  "./exercises.ts": () => import("./exercises"),
  "./users.ts": () => import("./users"),
  "./ai/aggregators.ts": () => import("./ai/aggregators"),
  "./ai/rateLimitQueries.ts": () => import("./ai/rateLimitQueries"),
  "./ai/trainingLabMutations.ts": () => import("./ai/trainingLabMutations"),
};

const createExercise = makeFunctionReference<
  "mutation",
  { name: string; category: "lifting"; muscleGroups?: string[] },
  Id<"exercises">
>("exercises:createExercise");
const updateExercise = makeFunctionReference<
  "mutation",
  { id: Id<"exercises">; muscleGroups?: string[] },
  Id<"exercises">
>("exercises:updateExercise");
const getDashboardStats = makeFunctionReference<
  "query",
  Record<string, never>,
  TrainingLabDashboardStats | null
>("ai/trainingLabMutations:getDashboardStats");

const CLERK_ID = "custom-muscles-user";

async function setup() {
  const t = convexTest(schema, modules).withIdentity({
    issuer: "https://opentrainer.app/test",
    subject: CLERK_ID,
  });
  const startedAt = Math.max(getMondayWeekStartUtc(Date.now()), Date.now() - 60_000);
  const { userId, workoutId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId: CLERK_ID,
      tier: "pro",
      preferredUnits: "lb",
      createdAt: 1,
      updatedAt: 1,
    });
    const workoutId = await ctx.db.insert("workouts", {
      userId,
      status: "completed",
      startedAt,
      completedAt: startedAt + 1000,
    });
    return { userId, workoutId };
  });
  return { t, userId, workoutId };
}

type Setup = Awaited<ReturnType<typeof setup>>;

/** One working set, linked by id when exerciseId is given, else by name only. */
async function insertSet(
  { t, userId, workoutId }: Setup,
  exerciseName: string,
  exerciseId?: Id<"exercises">
) {
  await t.run((ctx) =>
    ctx.db.insert("entries", {
      workoutId,
      userId,
      exerciseId,
      exerciseName,
      kind: "lifting",
      lifting: { setNumber: 1, reps: 8, weight: 95, unit: "lb" },
      createdAt: Date.now(),
    })
  );
}

async function muscleSplit({ t }: Setup) {
  const stats = await t.query(getDashboardStats, {});
  const analytics = stats?.muscleAnalytics;
  assert.ok(analytics, "pro users get muscle analytics");
  return {
    split: Object.fromEntries(analytics.split.map((row) => [row.muscle, row.sets])),
    unmapped: analytics.unmappedWorkingSets,
  };
}

describe("custom exercise muscle groups in muscle analytics", () => {
  test("sets of a custom exercise move from Unmapped to its muscles after an edit", async () => {
    const s = await setup();
    // CSV import makes custom exercises with no muscle groups.
    const id = await s.t.mutation(createExercise, { name: "Landmine Press", category: "lifting" });
    // Linked by id; the name differs, as after a rename or a spreadsheet alias.
    await insertSet(s, "LM Press", id);
    await insertSet(s, "landmine  press"); // older entry, linked by name only

    assert.deepEqual(await muscleSplit(s), { split: { unmapped: 2 }, unmapped: 2 });

    await s.t.mutation(updateExercise, { id, muscleGroups: ["shoulders", "triceps"] });

    assert.deepEqual(await muscleSplit(s), {
      split: { shoulders: 2, triceps: 2 },
      unmapped: 0,
    });
  });

  test("a custom exercise created with muscle groups counts at once", async () => {
    const s = await setup();
    const id = await s.t.mutation(createExercise, {
      name: "Seal Row",
      category: "lifting",
      muscleGroups: ["back"],
    });
    await insertSet(s, "Chest Supported Row", id); // linked by id only
    await insertSet(s, "Seal Row");

    assert.deepEqual(await muscleSplit(s), { split: { back: 2 }, unmapped: 0 });
  });
});
