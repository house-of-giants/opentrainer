import { render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useQuery } from "convex/react";

import ActiveWorkoutScreen from "@/app/(app)/workout/active";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
  useAction: jest.fn(() => jest.fn()),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
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

const entries = [
  {
    _id: "entry1",
    exerciseName: "Bench Press",
    kind: "lifting",
    lifting: { setNumber: 1, reps: 8, weight: 135, unit: "lb" },
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
    exerciseName: "Plank",
    kind: "lifting",
    measurementType: "duration",
    targetSets: 3,
    targetHoldSeconds: 45,
  },
  { exerciseName: "Running", kind: "cardio", targetDuration: 20 },
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

beforeEach(() => {
  jest.clearAllMocks();
  (useQuery as jest.Mock).mockImplementation((ref, args) => {
    if (args === "skip") return undefined;
    const name = getFunctionName(ref);
    if (!(name in queryResults)) {
      throw new Error(`Unmocked query: ${name}`);
    }
    return queryResults[name];
  });
});

describe("ActiveWorkoutScreen", () => {
  it("renders the workout header, command center, and all exercise groups", async () => {
    await render(
      <ThemeProvider>
        <ActiveWorkoutScreen />
      </ThemeProvider>,
    );

    expect(screen.getByText("Push Day")).toBeOnTheScreen();
    expect(screen.getByText("Finish")).toBeOnTheScreen();
    expect(screen.getByText("Session overview")).toBeOnTheScreen();

    // Bench Press comes straight from the logged entry.
    expect(screen.getByText("Bench Press")).toBeOnTheScreen();

    // Plank + Running arrive after the routine-exercises effect flushes.
    await waitFor(() => {
      expect(screen.getByText("Plank")).toBeOnTheScreen();
      expect(screen.getByText("Running")).toBeOnTheScreen();
    });

    expect(screen.getByText("+ Add Exercise")).toBeOnTheScreen();
  });

  it("shows the logged set and target-set progress for the current exercise", async () => {
    await render(
      <ThemeProvider>
        <ActiveWorkoutScreen />
      </ThemeProvider>,
    );

    await waitFor(() => {
      // 1 of 3 target sets for Bench Press.
      expect(screen.getByText("1/3")).toBeOnTheScreen();
      // Logged set row from the mocked entry.
      expect(screen.getByText("135lb × 8")).toBeOnTheScreen();
      // Next set CTA reflects target sets.
      expect(screen.getByText("LOG SET 2/3")).toBeOnTheScreen();
    });
  });

  it("redirects to the dashboard when there is no active workout", async () => {
    queryResults["workouts:getActiveWorkout"] = null;
    try {
      await render(
        <ThemeProvider>
          <ActiveWorkoutScreen />
        </ThemeProvider>,
      );
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)");
      });
    } finally {
      queryResults["workouts:getActiveWorkout"] = workout;
    }
  });
});
