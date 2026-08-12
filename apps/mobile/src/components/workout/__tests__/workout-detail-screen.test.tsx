import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useMutation, useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import { api } from "@opentrainer/backend";

import WorkoutDetailsScreen from "@/app/(app)/workout/[id]";
import { ThemeProvider } from "@/theme/theme-provider";
import { proUser, workoutDoc } from "../__fixtures__/workout-fixtures";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "workout_1" }),
  useRouter: () => ({ back: mockBack, replace: mockReplace, push: jest.fn() }),
}));

jest.mock("@/components/ui/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), message: jest.fn() },
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;

const mutations = new Map<string, jest.Mock>();

function mutationSpy(name: string) {
  const existing = mutations.get(name);
  if (existing) return existing;
  const spy = jest.fn(() => Promise.resolve());
  mutations.set(name, spy);
  return spy;
}

function setQueryResults(results: Record<string, unknown>) {
  mockUseQuery.mockImplementation((ref: unknown) => results[getFunctionName(ref as never)]);
}

const loadedQueries = {
  [getFunctionName(api.workouts.getWorkoutWithEntries)]: workoutDoc,
  [getFunctionName(api.users.getCurrentUser)]: proUser,
};

describe("workout detail screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutations.clear();
    mockUseMutation.mockImplementation((ref: unknown) =>
      mutationSpy(getFunctionName(ref as never)),
    );
  });

  it("shows skeletons while loading, then the workout once data arrives", async () => {
    setQueryResults({});
    const view = await render(
      <ThemeProvider>
        <WorkoutDetailsScreen />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("detail-skeleton")).toBeOnTheScreen();
    expect(screen.queryByText("Push Day")).not.toBeOnTheScreen();

    setQueryResults(loadedQueries);
    await view.rerender(
      <ThemeProvider>
        <WorkoutDetailsScreen />
      </ThemeProvider>,
    );

    expect(screen.getByText("Push Day")).toBeOnTheScreen();
    expect(screen.getByText("Felt strong")).toBeOnTheScreen();
    // Grouped entries: one card per exercise name, in insertion order.
    expect(screen.getByText("Bench Press")).toBeOnTheScreen();
    expect(screen.getByText("Treadmill")).toBeOnTheScreen();
    expect(screen.getByText("Couch Stretch")).toBeOnTheScreen();
    // Summary stats derived from the workout summary + entries.
    expect(screen.getByText("1h 5m")).toBeOnTheScreen();
    expect(screen.getByText("25m")).toBeOnTheScreen();
    expect(screen.getByText("3.2 km")).toBeOnTheScreen();
  });

  it("renders the not-found state when the workout query returns null", async () => {
    setQueryResults({
      [getFunctionName(api.workouts.getWorkoutWithEntries)]: null,
      [getFunctionName(api.users.getCurrentUser)]: proUser,
    });
    await render(
      <ThemeProvider>
        <WorkoutDetailsScreen />
      </ThemeProvider>,
    );

    expect(screen.getByText("Workout not found")).toBeOnTheScreen();
  });

  it("deletes the workout through a confirmation dialog and returns to history", async () => {
    setQueryResults(loadedQueries);
    await render(
      <ThemeProvider>
        <WorkoutDetailsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByText("Delete workout"));

    const confirmButtons = screen.getAllByText("Delete workout");
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() =>
      expect(mutationSpy("workouts:deleteWorkout")).toHaveBeenCalledWith({
        workoutId: "workout_1",
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/history"));
  });

  it("goes back from the header", async () => {
    setQueryResults(loadedQueries);
    await render(
      <ThemeProvider>
        <WorkoutDetailsScreen />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockBack).toHaveBeenCalled();
  });
});
