import assert from "node:assert/strict";
import { test } from "node:test";
import { convexTest } from "convex-test";
import {
	editorExerciseToRoutineExercise,
	routineExerciseToEditorFields,
} from "@opentrainer/lib/routine-editor";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = {
	"./_generated/server.ts": () => import("./_generated/server"),
	"./routines.ts": () => import("./routines"),
	"./workouts.ts": () => import("./workouts"),
};

async function setup() {
	const t = convexTest(schema, modules).withIdentity({ subject: "user-1" });
	const { routineId, workoutId } = await t.run(async (ctx) => {
		const userId = await ctx.db.insert("users", {
			clerkId: "user-1",
			createdAt: 1,
			updatedAt: 1,
		});
		const routineId = await ctx.db.insert("routines", {
			userId,
			name: "Legs",
			source: "manual",
			days: [
				{
					name: "Day 1",
					// A record saved before restSeconds existed.
					exercises: [{ exerciseName: "Squat", kind: "lifting", targetSets: 5, targetReps: "5" }],
				},
			],
			isActive: true,
			createdAt: 1,
			updatedAt: 1,
		});
		const workoutId = await ctx.db.insert("workouts", {
			userId,
			routineId,
			routineDayIndex: 0,
			status: "in_progress",
			startedAt: 1,
		});
		return { routineId, workoutId };
	});
	return { t, routineId, workoutId };
}

test("a rest time saved through the routine editor mapper reaches the active workout", async () => {
	const { t, routineId, workoutId } = await setup();
	const routine = await t.query(api.routines.getRoutine, { routineId });
	assert.ok(routine);

	const edited = {
		...routineExerciseToEditorFields(routine.days[0].exercises[0]),
		restSeconds: 150,
	};
	await t.mutation(api.routines.updateRoutine, {
		routineId,
		days: [{ name: "Day 1", exercises: [editorExerciseToRoutineExercise(edited)] }],
	});

	const reloaded = await t.query(api.routines.getRoutine, { routineId });
	assert.equal(reloaded?.days[0].exercises[0].restSeconds, 150);

	const workoutExercises = await t.query(api.workouts.getRoutineExercisesForWorkout, {
		workoutId,
	});
	assert.equal(workoutExercises?.[0].restSeconds, 150);
});
