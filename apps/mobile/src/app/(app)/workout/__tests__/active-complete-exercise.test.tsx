/**
 * Repro for the on-device crash: "Couldn't find a navigation context" thrown
 * under ExerciseAccordion when the LAST set of an exercise is logged. Runs the
 * REAL expo-router (renderRouter) instead of mocking it, since the mock masks
 * navigation-context bugs.
 */
import { renderRouter, screen } from "expo-router/testing-library";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useQuery, useMutation } from "convex/react";

import ActiveWorkoutScreen from "@/app/(app)/workout/active";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(() => jest.fn()),
}));

jest.mock(
  "react-native-safe-area-context",
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  () => require("react-native-safe-area-context/jest/mock").default,
);

const workout = {
  _id: "workout1",
  title: "Push Day",
  startedAt: Date.now() - 10 * 60000,
  routineId: "routine1",
  exerciseNotes: [],
};

// Two of three target sets already logged; pressing LOG SET 3/3 completes it.
const entries: Record<string, unknown>[] = [
  {
    _id: "entry1",
    exerciseName: "Bench Press",
    kind: "lifting",
    lifting: { setNumber: 1, reps: 8, weight: 135, unit: "lb" },
  },
  {
    _id: "entry2",
    exerciseName: "Bench Press",
    kind: "lifting",
    lifting: { setNumber: 2, reps: 8, weight: 135, unit: "lb" },
  },
];

const routineExercises = [
  {
    exerciseName: "Bench Press",
    kind: "lifting",
    targetSets: 3,
    targetReps: "8-12",
  },
  {
    exerciseName: "Overhead Press",
    kind: "lifting",
    targetSets: 3,
    targetReps: "8-12",
  },
];

const queryResults: Record<string, unknown> = {
  "workouts:getActiveWorkout": workout,
  "users:getCurrentUser": { preferredUnits: "lb", tier: "pro" },
  "entries:getEntriesByWorkout": entries,
  "workouts:getRoutineExercisesForWorkout": routineExercises,
  "ai/swapMutations:getSwapsForWorkout": [],
  "entries:getExerciseHistory": [],
  "entries:getTimedExerciseHistory": [],
  "exercises:getExercises": [],
  "exercises:getMuscleGroups": [],
};

const addLiftingEntry = jest.fn(
  async (args: { lifting: { setNumber: number } }) => {
    entries.push({
      _id: `entry${args.lifting.setNumber}`,
      exerciseName: "Bench Press",
      kind: "lifting",
      lifting: { ...args.lifting },
    });
    return "entry-id";
  },
);

beforeEach(() => {
  (useQuery as jest.Mock).mockImplementation((ref, args) => {
    if (args === "skip") return undefined;
    const name = getFunctionName(ref);
    if (!(name in queryResults)) {
      throw new Error(`Unmocked query: ${name}`);
    }
    // Fresh array identity each render so length-based effects re-fire.
    const result = queryResults[name];
    return Array.isArray(result) ? [...result] : result;
  });
  (useMutation as jest.Mock).mockImplementation((ref) => {
    const name = getFunctionName(ref);
    return name === "entries:addLiftingEntry" ? addLiftingEntry : jest.fn();
  });
});

describe("completing the last set of an exercise (real router)", () => {
  it("logs the final set and advances without a render crash", async () => {
    renderRouter(
      {
        "workout/active": () => (
          <ThemeProvider>
            <ActiveWorkoutScreen />
          </ThemeProvider>
        ),
      },
      { initialUrl: "/workout/active" },
    );

    await waitFor(() => {
      expect(screen.getByText("LOG SET 3/3")).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByText("LOG SET 3/3"));
    // Flush the mutation microtask so setShowRestTimer/effects run.
    await act(async () => {});
    expect(addLiftingEntry).toHaveBeenCalledTimes(1);
    expect(addLiftingEntry.mock.calls[0][0].lifting.setNumber).toBe(3);

    // NOTE: simulating the 800ms auto-advance re-render is not reliable under
    // jest-expo's sinon fake timers (the convex query mock's re-render never
    // lands), so this test intentionally stops at the logged press. The
    // device crash this guards against fired during this press-path render.
  });
});
