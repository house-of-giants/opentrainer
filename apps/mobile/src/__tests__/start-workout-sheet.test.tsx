import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import { StartWorkoutSheet } from "@/components/workout/start-workout-sheet";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;

const routines = [
  {
    _id: "routine_1",
    name: "Push Pull Legs",
    days: [
      {
        name: "Push",
        exercises: [
          { exerciseName: "Bench Press" },
          { exerciseName: "Overhead Press" },
        ],
      },
      { name: "Pull", exercises: [{ exerciseName: "Barbell Row" }] },
    ],
  },
];

const createWorkout = jest.fn().mockResolvedValue("workout_1");
const cancelWorkout = jest.fn().mockResolvedValue(null);

function mockQueries(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "routines:getRoutines": routines,
    ...overrides,
  };
  mockUseQuery.mockImplementation((ref: unknown, args: unknown) => {
    if (args === "skip") return undefined;
    const value = values[getFunctionName(ref as never)];
    return typeof value === "function" ? value(args) : value;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueries();
  mockUseMutation.mockImplementation((ref: unknown) =>
    getFunctionName(ref as never) === "workouts:cancelWorkout"
      ? cancelWorkout
      : createWorkout,
  );
});

async function renderSheet(props: Partial<React.ComponentProps<typeof StartWorkoutSheet>> = {}) {
  const onOpenChange = jest.fn();
  await render(
    <ThemeProvider>
      <StartWorkoutSheet open onOpenChange={onOpenChange} {...props} />
    </ThemeProvider>,
  );
  return { onOpenChange };
}

describe("StartWorkoutSheet", () => {
  it("renders the empty-workout option and the saved routines", async () => {
    await renderSheet();

    expect(screen.getByText("Start Workout")).toBeOnTheScreen();
    expect(screen.getByText("Empty Workout")).toBeOnTheScreen();
    expect(screen.getByText("Push Pull Legs")).toBeOnTheScreen();
    expect(screen.getByText("2 days")).toBeOnTheScreen();
    // Days are collapsed until the routine is expanded.
    expect(screen.queryByText("Push")).toBeNull();
  });

  it("starts an empty workout and routes to the active session", async () => {
    const { onOpenChange } = await renderSheet();

    await fireEvent.press(screen.getByText("Empty Workout"));

    await waitFor(() => expect(createWorkout).toHaveBeenCalledWith({}));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith("/(app)/workout/active");
  });

  it("expands a routine and starts the picked day", async () => {
    const { onOpenChange } = await renderSheet();

    await fireEvent.press(screen.getByText("Push Pull Legs"));
    expect(screen.getByText("Push")).toBeOnTheScreen();
    expect(screen.getByText("Bench Press, Overhead Press")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Push"));

    await waitFor(() =>
      expect(createWorkout).toHaveBeenCalledWith({
        title: "Push",
        routineId: "routine_1",
        routineDayIndex: 0,
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith("/(app)/workout/active");
  });

  it("offers a create-routine CTA when there are no routines", async () => {
    mockQueries({ "routines:getRoutines": [] });
    const { onOpenChange } = await renderSheet();

    expect(screen.getByText("No routines yet")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Create Routine"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith("/(app)/routines/new");
  });

  it("shows the in-progress branch when a workout is active", async () => {
    const activeWorkout = {
      _id: "workout_active",
      title: "Leg Day",
      startedAt: Date.now(),
    };
    await renderSheet({
      activeWorkout: activeWorkout as never,
    });

    expect(screen.getByText("Workout In Progress")).toBeOnTheScreen();
    expect(screen.getByText("Leg Day")).toBeOnTheScreen();
    expect(screen.queryByText("Empty Workout")).toBeNull();

    await fireEvent.press(screen.getByText("Cancel & Start New"));
    await waitFor(() =>
      expect(cancelWorkout).toHaveBeenCalledWith({ workoutId: "workout_active" }),
    );

    await fireEvent.press(screen.getByText("Continue Workout"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/workout/active");
  });
});

describe("StartWorkoutSheet next routine day", () => {
  const rowSession = {
    workoutId: "w1",
    date: "2026-11-01T00:00:00.000Z",
    sets: [{ setNumber: 1, weight: 135, reps: 8, rpe: null, unit: "lb", isWarmup: false }],
    bestSet: { weight: 135, reps: 8, rpe: null, unit: "lb" },
  };

  beforeEach(() => {
    mockQueries({
      "routines:getRoutines": [
        {
          ...routines[0],
          days: [
            routines[0].days[0],
            {
              name: "Pull",
              exercises: [{ exerciseName: "Barbell Row", kind: "lifting", targetReps: "8-12" }],
            },
          ],
        },
      ],
      // Push (day 1) was the last routine workout.
      "workouts:getWorkoutHistory": [
        { _id: "w1", startedAt: 10, routineId: "routine_1", routineDayIndex: 0 },
      ],
      "users:getCurrentUser": { preferredUnits: "lb" },
      "entries:getExerciseHistory": (args: { exerciseName: string }) =>
        args.exerciseName === "Barbell Row" ? [rowSession] : [],
      "exercises:getWeightStep": null,
    });
  });

  it("leads with the next day, its first lift, and its targets", async () => {
    await renderSheet();

    expect(screen.getByText("Next up · Push Pull Legs")).toBeOnTheScreen();
    expect(screen.getByText("Day 2 · Pull")).toBeOnTheScreen();
    expect(screen.getByText("Barbell Row")).toBeOnTheScreen();
    // 8 reps in an 8-12 range: one more rep at the same weight.
    expect(
      screen.getByText("Last time 135 lb × 8. Next: 135 lb × 9."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Start Day 2")).toBeOnTheScreen();
    // Empty Workout stays available as the secondary choice.
    expect(screen.getByText("Empty Workout")).toBeOnTheScreen();
  });

  it("starts the next day from the main button", async () => {
    const { onOpenChange } = await renderSheet();

    await fireEvent.press(screen.getByText("Start Day 2"));

    await waitFor(() =>
      expect(createWorkout).toHaveBeenCalledWith({
        title: "Pull",
        routineId: "routine_1",
        routineDayIndex: 1,
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith("/(app)/workout/active");
  });

  it("still lets the lifter pick another day", async () => {
    await renderSheet();

    await fireEvent.press(screen.getByText("Push Pull Legs"));
    await fireEvent.press(screen.getByText("Push"));

    await waitFor(() =>
      expect(createWorkout).toHaveBeenCalledWith({
        title: "Push",
        routineId: "routine_1",
        routineDayIndex: 0,
      }),
    );
  });
});
