import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { usePaginatedQuery, useQuery } from "convex/react";

import HistoryScreen from "@/app/(app)/(tabs)/history";
import { StartWorkoutProvider } from "@/components/workout/start-workout-provider";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  usePaginatedQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn().mockResolvedValue(undefined)),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUsePaginatedQuery = usePaginatedQuery as jest.Mock;
const mockLoadMore = jest.fn();

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

// An older workout that only arrives with the second page.
const olderWorkout = {
  _id: "workout_0",
  title: "Leg Day",
  status: "completed",
  startedAt: new Date("2025-06-02T17:00:00Z").getTime(),
  summary: { totalDurationMinutes: 60, totalSets: 18, exerciseCount: 5 },
};

// Stands in for Convex's usePaginatedQuery: serves the given pages one at a
// time and moves to the next page when loadMore is called.
function mockHistoryPages(pages: unknown[][], { loadingMore = false } = {}) {
  mockUsePaginatedQuery.mockImplementation(() => {
    const [loaded, setLoaded] = useState(1);
    const exhausted = loaded >= pages.length;
    return {
      results: pages.slice(0, loaded).flat(),
      status: loadingMore ? "LoadingMore" : exhausted ? "Exhausted" : "CanLoadMore",
      isLoading: loadingMore,
      loadMore: (numItems: number) => {
        mockLoadMore(numItems);
        setLoaded((n) => n + 1);
      },
    };
  });
}

function mockFirstPageLoading() {
  mockUsePaginatedQuery.mockReturnValue({
    results: [],
    status: "LoadingFirstPage",
    isLoading: true,
    loadMore: mockLoadMore,
  });
}

function mockQueries(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "workouts:getActiveWorkout": null,
    "routines:getRoutines": [],
    ...overrides,
  };
  mockUseQuery.mockImplementation((ref: unknown) => values[getFunctionName(ref as never)]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueries();
  mockHistoryPages([workouts]);
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
  it("pages through completed workouts instead of capping at 100", async () => {
    await renderHistory();

    const [ref, args, options] = mockUsePaginatedQuery.mock.calls[0];
    expect(getFunctionName(ref)).toBe("workouts:getWorkoutHistoryPage");
    expect(args).toEqual({ status: "completed" });
    expect(options).toEqual({ initialNumItems: 50 });
  });

  it("loads the next page of older workouts when the list end is reached", async () => {
    mockHistoryPages([workouts, [olderWorkout]]);
    await renderHistory();

    expect(screen.queryByText("Leg Day")).toBeNull();

    await fireEvent(screen.getByTestId("history-list"), "endReached");

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
    expect(mockLoadMore).toHaveBeenCalledWith(50);
    // The second page joins the same month-grouped list.
    expect(screen.getByText("Pull Day")).toBeOnTheScreen();
    expect(screen.getByText("June 2025")).toBeOnTheScreen();
    expect(screen.getByText("Leg Day")).toBeOnTheScreen();
    expect(screen.getByText("18 sets")).toBeOnTheScreen();

    // Every page is loaded now, so reaching the end again asks for nothing.
    await fireEvent(screen.getByTestId("history-list"), "endReached");
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it("shows a quiet loading row while an older page loads", async () => {
    mockHistoryPages([workouts, [olderWorkout]], { loadingMore: true });
    await renderHistory();

    expect(screen.getByText("Loading older workouts")).toBeOnTheScreen();

    await fireEvent(screen.getByTestId("history-list"), "endReached");
    expect(mockLoadMore).not.toHaveBeenCalled();
  });

  it("shows no loading row once every page is loaded", async () => {
    await renderHistory();

    expect(screen.queryByText("Loading older workouts")).toBeNull();
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
    mockHistoryPages([[]]);
    await renderHistory();

    expect(screen.getByText("No workouts yet")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Start a Workout"));
    expect(screen.getByText("Empty Workout")).toBeOnTheScreen();
  });

  it("renders skeletons while the query is loading", async () => {
    mockFirstPageLoading();
    await renderHistory();

    expect(screen.queryByText("Workout History")).toBeNull();
  });
});
