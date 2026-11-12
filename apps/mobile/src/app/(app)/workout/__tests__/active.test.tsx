import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import * as Notifications from "expo-notifications";

import ActiveWorkoutScreen from "@/app/(app)/workout/active";
import { resetPendingSets } from "@/test-utils/pending-sets";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
  useAction: jest.fn(() => jest.fn()),
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  useConvex: () => require("@/test-utils/pending-sets").mockConvexClient,
}));

jest.mock("@/lib/pending-set-queue", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  require("@/test-utils/pending-sets").pendingSetQueueModuleMock(),
);

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
  "exercises:getWeightStep": null,
  "entries:getTimedExerciseHistory": [],
  "exercises:getExercises": [],
  "exercises:getMuscleGroups": [],
};

beforeEach(async () => {
  await resetPendingSets();
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

  it("uses the saved weight step for the goal and the weight stepper", async () => {
    // Two sessions at the top of 8-12: the goal adds one step of weight.
    queryResults["entries:getExerciseHistory"] = ["w2", "w1"].map((id) => ({
      workoutId: id,
      date: "2026-11-01T00:00:00.000Z",
      sets: [{ setNumber: 1, weight: 100, reps: 12, rpe: 7, unit: "lb" }],
      bestSet: { weight: 100, reps: 12, rpe: 7, unit: "lb" },
    }));
    queryResults["exercises:getWeightStep"] = { weightStep: 2.5, unit: "lb" };
    try {
      await render(
        <ThemeProvider>
          <ActiveWorkoutScreen />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("102.5 lb × 8")).toBeOnTheScreen();
      });
      expect(screen.getByText("+2.5 lb")).toBeOnTheScreen();

      // The stepper starts from the logged 135 lb set.
      await fireEvent.press(screen.getByLabelText("Increase WEIGHT"));
      expect(
        within(screen.getByLabelText("Edit WEIGHT")).getByText("137.5"),
      ).toBeOnTheScreen();
    } finally {
      queryResults["entries:getExerciseHistory"] = [];
      queryResults["exercises:getWeightStep"] = null;
    }
  });

  it("opens the exercise history from the current card once the lift has a finished session", async () => {
    await render(
      <ThemeProvider>
        <ActiveWorkoutScreen />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("LOG SET 2/3")).toBeOnTheScreen();
    });
    // No finished session yet: nothing to show, so no button.
    expect(screen.queryByLabelText("View history for Bench Press")).not.toBeOnTheScreen();
    await screen.unmount();

    queryResults["entries:getExerciseHistory"] = [
      {
        workoutId: "w1",
        date: "2026-11-01T00:00:00.000Z",
        sets: [{ setNumber: 1, weight: 135, reps: 8, rpe: null, unit: "lb" }],
        bestSet: { weight: 135, reps: 8, rpe: null, unit: "lb" },
      },
    ];
    try {
      await render(
        <ThemeProvider>
          <ActiveWorkoutScreen />
        </ThemeProvider>,
      );
      await fireEvent.press(
        await screen.findByLabelText("View history for Bench Press"),
      );
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: "/(app)/exercise/[name]",
        params: { name: "Bench Press" },
      });
    } finally {
      queryResults["entries:getExerciseHistory"] = [];
    }
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

describe("ActiveWorkoutScreen completion", () => {
  afterEach(() => {
    queryResults["workouts:getActiveWorkout"] = workout;
    (useMutation as jest.Mock).mockImplementation(() => jest.fn());
  });

  it("opens the next-session summary after a routine workout instead of going home", async () => {
    // Completing clears the active workout, as Convex does before the mutation resolves.
    const completeWorkout = jest.fn(async () => {
      queryResults["workouts:getActiveWorkout"] = null;
    });
    (useMutation as jest.Mock).mockImplementation((ref) =>
      getFunctionName(ref) === "workouts:completeWorkout" ? completeWorkout : jest.fn(),
    );

    await render(
      <ThemeProvider>
        <ActiveWorkoutScreen />
      </ThemeProvider>,
    );
    await fireEvent.press(screen.getByText("Finish"));

    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: "/(app)/workout/summary",
        params: { id: "workout1" },
      }),
    );
    expect(completeWorkout).toHaveBeenCalledWith({ workoutId: "workout1" });
    expect(mockRouter.replace).not.toHaveBeenCalledWith("/(app)/(tabs)");
  });

  it("returns home after a workout that is not from a routine and has no exercises", async () => {
    queryResults["workouts:getActiveWorkout"] = { ...workout, routineId: undefined };
    const savedEntries = queryResults["entries:getEntriesByWorkout"];
    const savedRoutine = queryResults["workouts:getRoutineExercisesForWorkout"];
    queryResults["entries:getEntriesByWorkout"] = [];
    queryResults["workouts:getRoutineExercisesForWorkout"] = null;
    const completeWorkout = jest.fn(async () => {
      queryResults["workouts:getActiveWorkout"] = null;
    });
    (useMutation as jest.Mock).mockImplementation((ref) =>
      getFunctionName(ref) === "workouts:completeWorkout" ? completeWorkout : jest.fn(),
    );

    try {
      await render(
        <ThemeProvider>
          <ActiveWorkoutScreen />
        </ThemeProvider>,
      );
      await fireEvent.press(screen.getByText("Finish"));

      await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)"));
      expect(mockRouter.replace).not.toHaveBeenCalledWith(
        expect.objectContaining({ pathname: "/(app)/workout/summary" }),
      );
    } finally {
      queryResults["entries:getEntriesByWorkout"] = savedEntries;
      queryResults["workouts:getRoutineExercisesForWorkout"] = savedRoutine;
    }
  });
});

describe("ActiveWorkoutScreen rest timer", () => {
  async function logBenchSetAndGetRestTimer() {
    await render(
      <ThemeProvider>
        <ActiveWorkoutScreen />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("LOG SET 2/3")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByText("LOG SET 2/3"));
    await waitFor(() => {
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });
    const [request] = (Notifications.scheduleNotificationAsync as jest.Mock)
      .mock.calls[0];
    const result = {
      scheduledSeconds: request.trigger.seconds,
      shownTime: screen.getByText(/^\d+:\d{2}$/).props.children,
    };
    // Close the timer so its interval does not outlive the test.
    await fireEvent.press(screen.getByText("Skip Rest"));
    return result;
  }

  it("starts the rest timer at the rest time stored on the routine exercise", async () => {
    queryResults["workouts:getRoutineExercisesForWorkout"] = [
      { ...routineExercises[0], restSeconds: 150 },
      ...routineExercises.slice(1),
    ];
    try {
      const { scheduledSeconds, shownTime } =
        await logBenchSetAndGetRestTimer();
      expect(scheduledSeconds).toBe(150);
      expect(shownTime).toMatch(/^2:(29|30)$/);
    } finally {
      queryResults["workouts:getRoutineExercisesForWorkout"] = routineExercises;
    }
  });

  it("starts a 90-second rest timer when the routine exercise has no rest time", async () => {
    const { scheduledSeconds, shownTime } = await logBenchSetAndGetRestTimer();
    expect(scheduledSeconds).toBe(90);
    expect(shownTime).toMatch(/^1:(29|30)$/);
  });
});
