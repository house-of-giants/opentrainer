import { fireEvent, render, screen } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import DashboardScreen from "@/app/(app)/(tabs)/index";
import { StartWorkoutProvider } from "@/components/workout/start-workout-provider";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));

jest.mock("@clerk/clerk-expo", () => ({
  useUser: () => ({
    isLoaded: true,
    user: {
      id: "user_clerk",
      imageUrl: "https://img.clerk.com/avatar.png",
      fullName: "Dom Trainer",
      primaryEmailAddress: { emailAddress: "dom@example.com" },
    },
  }),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;

const stats = {
  weeklyWorkoutCount: 2,
  weeklyGoal: 4,
  weeklyTotalSets: 37,
  weeklyTotalVolume: 12450,
  weeklyTotalDuration: 95,
  preferredUnits: "lb" as const,
  currentWeek: [
    { date: "2026-08-10", dayName: "Mon", hasWorkout: true },
    { date: "2026-08-11", dayName: "Tue", hasWorkout: false },
  ],
};

const history = [
  {
    _id: "workout_1",
    title: "Push Day",
    startedAt: new Date("2026-08-10T17:00:00Z").getTime(),
    summary: { totalDurationMinutes: 62, totalSets: 18, exerciseCount: 5 },
  },
];

function mockQueries(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "users:getCurrentUser": { _id: "user_1", onboardingCompletedAt: 1 },
    "workouts:getActiveWorkout": null,
    "workouts:getWorkoutHistory": history,
    "workouts:getDashboardStats": stats,
    "routines:getRoutines": [],
    "ai/trainingLabMutations:getCtaState": null,
    ...overrides,
  };
  mockUseQuery.mockImplementation((ref: unknown) => values[getFunctionName(ref as never)]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueries();
  mockUseMutation.mockImplementation(() => jest.fn().mockResolvedValue(undefined));
});

async function renderDashboard() {
  await render(
    <ThemeProvider>
      <StartWorkoutProvider>
        <DashboardScreen />
      </StartWorkoutProvider>
    </ThemeProvider>,
  );
}

describe("Dashboard screen", () => {
  it("renders the weekly brief, stats and recent workouts", async () => {
    await renderDashboard();

    expect(screen.getByText("Alpha")).toBeOnTheScreen();
    expect(
      screen.getByText("2 sessions left to hit this week's goal."),
    ).toBeOnTheScreen();
    // Brief metrics: week progress, sets, formatted time.
    expect(screen.getByText("2/4")).toBeOnTheScreen();
    expect(screen.getByText("1h 35m")).toBeOnTheScreen();
    // Weekly stats grid.
    expect(screen.getByText("This Week")).toBeOnTheScreen();
    expect(screen.getByText("/4")).toBeOnTheScreen();
    expect(screen.getByText("12.4k")).toBeOnTheScreen();
    expect(screen.getByText("lb")).toBeOnTheScreen();
    // Recent list.
    expect(screen.getByText("Push Day")).toBeOnTheScreen();
    expect(screen.getByText("1h 2m")).toBeOnTheScreen();
    expect(screen.getByText("18")).toBeOnTheScreen();
  });

  it("routes to the active session when a workout is in progress", async () => {
    mockQueries({
      "workouts:getActiveWorkout": {
        _id: "workout_active",
        title: "Leg Day",
        startedAt: Date.now(),
      },
    });
    await renderDashboard();

    expect(
      screen.getByText("Workout in progress. Pick up where you left off."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Continue workout"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/workout/active");
  });

  it("opens the start-workout sheet from the brief CTA", async () => {
    await renderDashboard();

    await fireEvent.press(screen.getByText("Start workout"));
    expect(screen.getByText("Start Workout")).toBeOnTheScreen();
    expect(screen.getByText("Empty Workout")).toBeOnTheScreen();
  });

  it("shows the account skeleton until Convex resolves the user", async () => {
    mockQueries({ "users:getCurrentUser": null });
    await renderDashboard();

    expect(screen.getByText("Setting up your account...")).toBeOnTheScreen();
  });

  it("redirects to onboarding when it has not been completed", async () => {
    mockQueries({
      "users:getCurrentUser": { _id: "user_1", onboardingCompletedAt: undefined },
    });
    await renderDashboard();

    expect(mockReplace).toHaveBeenCalledWith("/(app)/onboarding");
  });
});
