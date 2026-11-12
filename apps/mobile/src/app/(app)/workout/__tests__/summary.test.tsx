import { fireEvent, render, screen } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useQuery } from "convex/react";

import WorkoutSummaryScreen from "@/app/(app)/workout/summary";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: "workout1" }),
}));

jest.mock(
  "react-native-safe-area-context",
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  () => require("react-native-safe-area-context/jest/mock").default,
);

function lifting(exerciseName: string, setNumber: number, weight: number, reps: number) {
  return {
    _id: `${exerciseName}-${setNumber}`,
    exerciseName,
    kind: "lifting",
    lifting: { setNumber, weight, reps, unit: "lb" },
  };
}

function session(id: string, weight: number, reps: number, rpe: number | null) {
  const set = { setNumber: 1, weight, reps, rpe, unit: "lb" as const, isWarmup: false };
  return {
    workoutId: id,
    date: "2026-11-10T00:00:00.000Z",
    sets: [set],
    bestSet: { weight, reps, rpe, unit: "lb" as const },
  };
}

const finishedWorkout = {
  _id: "workout1",
  title: "Push",
  routineId: "routine1",
  routineDayIndex: 0,
  entries: [
    lifting("Bench Press", 1, 225, 5),
    lifting("Barbell Row", 1, 135, 6),
    lifting("Bench Press", 2, 225, 5),
    // A timed hold has no weight target, so it is not listed.
    {
      _id: "plank",
      exerciseName: "Plank",
      kind: "lifting",
      lifting: { setNumber: 1, durationSeconds: 45, unit: "lb" },
    },
    { _id: "bike", exerciseName: "Bike", kind: "cardio", cardio: { durationSeconds: 600 } },
  ],
};

// History includes the workout just finished, newest first.
const exerciseHistory: Record<string, unknown> = {
  // Two sessions at the top of a 5-rep target: add one 5 lb step.
  "Bench Press": [session("workout1", 225, 5, null), session("w0", 225, 5, null)],
  // RPE 9 at 6 reps against 8-10: hold the weight, 2 reps short of 8.
  "Barbell Row": [session("workout1", 135, 6, 9)],
};

beforeEach(() => {
  jest.clearAllMocks();
  (useQuery as jest.Mock).mockImplementation((ref, args) => {
    if (args === "skip") return undefined;
    switch (getFunctionName(ref)) {
      case "workouts:getWorkoutWithEntries":
        return finishedWorkout;
      case "workouts:getRoutineExercisesForWorkout":
        return [
          { exerciseName: "Bench Press", kind: "lifting", targetReps: "5" },
          { exerciseName: "Barbell Row", kind: "lifting", targetReps: "8-10" },
        ];
      case "users:getCurrentUser":
        return { preferredUnits: "lb" };
      case "entries:getExerciseHistory":
        return exerciseHistory[args.exerciseName];
      case "exercises:getWeightStep":
        return null;
      default:
        throw new Error(`Unmocked query: ${getFunctionName(ref)}`);
    }
  });
});

async function renderSummary() {
  await render(
    <ThemeProvider>
      <WorkoutSummaryScreen />
    </ThemeProvider>,
  );
}

describe("WorkoutSummaryScreen", () => {
  it("lists what changes next session for each lift", async () => {
    await renderSummary();

    expect(screen.getByText("Workout complete")).toBeOnTheScreen();
    expect(screen.getByText("Push")).toBeOnTheScreen();

    expect(screen.getByText("Bench Press")).toBeOnTheScreen();
    expect(screen.getByText("+5 lb")).toBeOnTheScreen();
    expect(screen.getByText("230 lb × 5")).toBeOnTheScreen();

    expect(screen.getByText("Barbell Row")).toBeOnTheScreen();
    expect(screen.getByText("Hold, 2 reps short")).toBeOnTheScreen();
    expect(screen.getByText("135 lb × 6")).toBeOnTheScreen();

    // Each lift is listed once; timed holds and cardio are not listed.
    expect(screen.getAllByText("Bench Press")).toHaveLength(1);
    expect(screen.queryByText("Plank")).toBeNull();
    expect(screen.queryByText("Bike")).toBeNull();
  });

  it("returns home on Done", async () => {
    await renderSummary();

    await fireEvent.press(screen.getByText("Done"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)");
  });
});
