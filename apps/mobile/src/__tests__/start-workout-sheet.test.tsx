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
  mockUseQuery.mockImplementation((ref: unknown) => values[getFunctionName(ref as never)]);
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
