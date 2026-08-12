import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  convertWorkoutEntriesToRoutineFormat,
  convertWorkoutExercisesToRoutineFormat,
} from "./routineMeasurements";

describe("convertWorkoutExercisesToRoutineFormat", () => {
  test("keeps rep and timed prescriptions when an exported exercise mixes modes", () => {
    const result = convertWorkoutExercisesToRoutineFormat([{
      name: "Plank",
      kind: "lifting",
      sets: [
        { reps: 12, weight: 20, rpe: 7 },
        { durationSeconds: 30, rpe: 8 },
        { durationSeconds: 60, rpe: 9 },
      ],
    }]);

    assert.deepEqual(result, [
      {
        name: "Plank",
        kind: "lifting",
        targetSets: 1,
        targetReps: "12",
        targetRpe: 7,
      },
      {
        name: "Plank",
        kind: "lifting",
        targetSets: 2,
        targetRpe: 9,
        measurementType: "duration",
        targetHoldSeconds: 45,
      },
    ]);
  });

  test("preserves the first source mode when splitting a mixed export", () => {
    const result = convertWorkoutExercisesToRoutineFormat([{
      name: "Plank",
      kind: "lifting",
      sets: [
        { durationSeconds: 30 },
        { reps: 10 },
      ],
    }]);

    assert.deepEqual(
      result.map((exercise) => exercise.measurementType ?? "reps"),
      ["duration", "reps"]
    );
  });

  test("does not count warmups in either working prescription", () => {
    const result = convertWorkoutExercisesToRoutineFormat([{
      name: "Plank",
      kind: "lifting",
      sets: [
        { reps: 5, isWarmup: true },
        { durationSeconds: 40 },
      ],
    }]);

    assert.deepEqual(result, [{
      name: "Plank",
      kind: "lifting",
      targetSets: 1,
      measurementType: "duration",
      targetHoldSeconds: 40,
    }]);
  });
});

describe("convertWorkoutEntriesToRoutineFormat", () => {
  test("creates separate routine rows for rep and timed entries with the same name", () => {
    const result = convertWorkoutEntriesToRoutineFormat([
      {
        exerciseId: "exercise-1",
        exerciseName: "Plank",
        kind: "lifting",
        lifting: {},
      },
      {
        exerciseId: "exercise-1",
        exerciseName: "Plank",
        kind: "lifting",
        lifting: { durationSeconds: 30 },
      },
      {
        exerciseId: "exercise-1",
        exerciseName: "Plank",
        kind: "lifting",
        lifting: { durationSeconds: 60 },
      },
    ]);

    assert.deepEqual(result, [
      {
        exerciseId: "exercise-1",
        exerciseName: "Plank",
        kind: "lifting",
        targetSets: 1,
        targetReps: "8-12",
        measurementType: undefined,
        targetDuration: undefined,
        targetHoldSeconds: undefined,
      },
      {
        exerciseId: "exercise-1",
        exerciseName: "Plank",
        kind: "lifting",
        targetSets: 2,
        targetReps: undefined,
        measurementType: "duration",
        targetDuration: undefined,
        targetHoldSeconds: 45,
      },
    ]);
  });
});
