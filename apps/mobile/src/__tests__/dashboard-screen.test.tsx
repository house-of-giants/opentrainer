import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import DashboardScreen from "@/app/(app)/(tabs)/index";
import { StartWorkoutProvider } from "@/components/workout/start-workout-provider";
import { analytics } from "@/lib/analytics";
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
      primaryEmailAddress: { emailAddress: mockClerkEmail.value },
    },
  }),
}));

const mockClerkEmail = { value: "dom@example.com" };

jest.mock("@/lib/analytics", () => ({
  analytics: { capture: jest.fn(), identify: jest.fn(), captureException: jest.fn() },
}));

const mockIdentify = analytics.identify as jest.Mock;

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
  mockUseQuery.mockImplementation((ref: unknown, args: unknown) => {
    if (args === "skip") return undefined;
    const value = values[getFunctionName(ref as never)];
    return typeof value === "function" ? value(args) : value;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockClerkEmail.value = "dom@example.com";
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
  it("identifies a returning signed-in user and marks an external email as not internal", async () => {
    await renderDashboard();

    expect(mockIdentify.mock.calls).toEqual([
      ["user_clerk", { name: "Dom Trainer", email: "dom@example.com", is_internal: false }],
    ]);
  });

  it("marks a houseofgiants.com account as internal", async () => {
    mockClerkEmail.value = "qa@houseofgiants.com";
    await renderDashboard();

    expect(mockIdentify.mock.calls).toEqual([
      ["user_clerk", { name: "Dom Trainer", email: "qa@houseofgiants.com", is_internal: true }],
    ]);
  });
});

describe("Dashboard next session", () => {
  const routine = {
    _id: "routine_1",
    name: "Upper Lower",
    updatedAt: 1,
    days: [
      {
        name: "Upper",
        exercises: [{ exerciseName: "Bench Press", kind: "lifting", targetReps: "5" }],
      },
      {
        name: "Lower",
        exercises: [
          { exerciseName: "Hip Openers", kind: "mobility" },
          { exerciseName: "Squat", kind: "lifting", targetReps: "5" },
        ],
      },
    ],
  };

  function squatSession(id: string) {
    const set = { setNumber: 1, weight: 315, reps: 5, rpe: null, unit: "lb", isWarmup: false };
    return { workoutId: id, date: "2026-11-01T00:00:00.000Z", sets: [set], bestSet: set };
  }

  function routineHistory(routineDayIndex: number) {
    return [{ ...history[0], routineId: "routine_1", routineDayIndex }];
  }

  const exerciseHistory: Record<string, unknown> = {
    // Two sessions at the top of a 5-rep target: the next target adds 5 lb.
    Squat: [squatSession("w2"), squatSession("w1")],
    "Bench Press": [],
  };

  const createWorkout = jest.fn().mockResolvedValue("workout_new");

  beforeEach(() => {
    mockQueries({
      "routines:getRoutines": [routine],
      "workouts:getWorkoutHistory": routineHistory(0),
      "entries:getExerciseHistory": (args: { exerciseName: string }) =>
        exerciseHistory[args.exerciseName],
      "exercises:getWeightStep": null,
    });
    mockUseMutation.mockImplementation((ref: unknown) =>
      getFunctionName(ref as never) === "workouts:createWorkout"
        ? createWorkout
        : jest.fn().mockResolvedValue(undefined),
    );
  });

  it("shows the day after the last one done, its first lift, and the last and next targets", async () => {
    await renderDashboard();

    expect(screen.getByText("Next up · Upper Lower")).toBeOnTheScreen();
    expect(screen.getByText("Day 2 · Lower")).toBeOnTheScreen();
    expect(screen.getByText("Squat")).toBeOnTheScreen();
    expect(
      screen.getByText("Last time 315 lb × 5. Next: 320 lb × 5."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("2 sessions left to hit this week's goal.")).toBeNull();
  });

  it("starts the next day with one tap", async () => {
    await renderDashboard();

    await fireEvent.press(screen.getByText("Start Day 2"));

    await waitFor(() =>
      expect(createWorkout).toHaveBeenCalledWith({
        title: "Lower",
        routineId: "routine_1",
        routineDayIndex: 1,
      }),
    );
    expect(mockPush).toHaveBeenCalledWith("/(app)/workout/active");
    expect(analytics.capture).toHaveBeenCalledWith(
      "workout_started",
      expect.objectContaining({ source: "routine", entry_point: "home", is_next_day: true }),
    );
  });

  it("goes back to day 1 after the last day", async () => {
    mockQueries({
      "routines:getRoutines": [routine],
      "workouts:getWorkoutHistory": routineHistory(1),
      "entries:getExerciseHistory": (args: { exerciseName: string }) =>
        exerciseHistory[args.exerciseName],
      "exercises:getWeightStep": null,
    });
    await renderDashboard();

    expect(screen.getByText("Day 1 · Upper")).toBeOnTheScreen();
    expect(screen.getByText("Bench Press")).toBeOnTheScreen();
    expect(screen.getByText("No sets logged yet.")).toBeOnTheScreen();
    expect(screen.getByText("Start Day 1")).toBeOnTheScreen();
  });

  it("opens the start sheet to pick a different workout", async () => {
    await renderDashboard();

    await fireEvent.press(screen.getByText("Pick another workout"));
    expect(screen.getByText("Start Workout")).toBeOnTheScreen();
    expect(screen.getByText("Empty Workout")).toBeOnTheScreen();
  });

  it("keeps the continue prompt while a workout is in progress", async () => {
    mockQueries({
      "routines:getRoutines": [routine],
      "workouts:getWorkoutHistory": routineHistory(0),
      "workouts:getActiveWorkout": { _id: "workout_active", title: "Upper", startedAt: Date.now() },
    });
    await renderDashboard();

    expect(screen.getByText("Continue workout")).toBeOnTheScreen();
    expect(screen.queryByText("Day 2 · Lower")).toBeNull();
  });
});
