import { fireEvent, render, screen } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useQuery } from "convex/react";

import HistoryScreen from "@/app/(app)/(tabs)/history";
import { StartWorkoutProvider } from "@/components/workout/start-workout-provider";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn().mockResolvedValue(undefined)),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockUseQuery = useQuery as jest.Mock;

const workouts = [
  {
    _id: "workout_2",
    title: "Pull Day",
    status: "completed",
    startedAt: new Date("2026-08-10T17:00:00Z").getTime(),
    summary: { totalDurationMinutes: 75, totalSets: 21, exerciseCount: 6 },
  },
  {
    _id: "workout_1",
    title: "Zone 2 Run",
    status: "completed",
    startedAt: new Date("2026-07-04T13:00:00Z").getTime(),
    summary: { totalCardioDurationSeconds: 2700, exerciseCount: 1 },
  },
];

function mockQueries(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "workouts:getWorkoutHistory": workouts,
    "workouts:getActiveWorkout": null,
    "routines:getRoutines": [],
    ...overrides,
  };
  mockUseQuery.mockImplementation((ref: unknown) => values[getFunctionName(ref as never)]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueries();
});

async function renderHistory() {
  await render(
    <ThemeProvider>
      <StartWorkoutProvider>
        <HistoryScreen />
      </StartWorkoutProvider>
    </ThemeProvider>,
  );
}

describe("History screen", () => {
  it("queries one page of completed workouts", async () => {
    await renderHistory();

    const historyCall = mockUseQuery.mock.calls.find(
      ([ref]) => getFunctionName(ref) === "workouts:getWorkoutHistory",
    );
    expect(historyCall?.[1]).toEqual({ limit: 100, status: "completed" });
  });

  it("groups workouts by month and renders their summaries", async () => {
    await renderHistory();

    expect(screen.getByText("Workout History")).toBeOnTheScreen();
    expect(screen.getByText("August 2026")).toBeOnTheScreen();
    expect(screen.getByText("July 2026")).toBeOnTheScreen();

    expect(screen.getByText("Pull Day")).toBeOnTheScreen();
    expect(screen.getByText("1h 15m")).toBeOnTheScreen();
    expect(screen.getByText("21 sets")).toBeOnTheScreen();
    expect(screen.getByText("6 exercises")).toBeOnTheScreen();

    // Cardio-only workouts show the cardio duration instead of set counts.
    expect(screen.getByText("Zone 2 Run")).toBeOnTheScreen();
    expect(screen.getByText("45m")).toBeOnTheScreen();
    expect(screen.getByText("cardio")).toBeOnTheScreen();
  });

  it("opens a workout detail route on press", async () => {
    await renderHistory();

    await fireEvent.press(screen.getByText("Pull Day"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/workout/workout_2");
  });

  it("offers the start-workout sheet from the empty state", async () => {
    mockQueries({ "workouts:getWorkoutHistory": [] });
    await renderHistory();

    expect(screen.getByText("No workouts yet")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Start a Workout"));
    expect(screen.getByText("Empty Workout")).toBeOnTheScreen();
  });

  it("renders skeletons while the query is loading", async () => {
    mockQueries({ "workouts:getWorkoutHistory": undefined });
    await renderHistory();

    expect(screen.queryByText("Workout History")).toBeNull();
  });
});
