/**
 * Effort logging through the real active-workout screen: the selector, the
 * accordion, and the screen's addLiftingEntry call.
 */
import { renderRouter, screen } from "expo-router/testing-library";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useQuery, useMutation } from "convex/react";

import ActiveWorkoutScreen from "@/app/(app)/workout/active";
import { resetPendingSets } from "@/test-utils/pending-sets";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(() => jest.fn()),
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  useConvex: () => require("@/test-utils/pending-sets").mockConvexClient,
}));

jest.mock("@/lib/pending-set-queue", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  require("@/test-utils/pending-sets").pendingSetQueueModuleMock(),
);

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

const routineExercises = [
  {
    exerciseName: "Bench Press",
    kind: "lifting",
    targetSets: 3,
    targetReps: "8-12",
  },
];

const addLiftingEntry = jest.fn(async () => "entry-id");

function mockConvex(user: Record<string, unknown>) {
  const queryResults: Record<string, unknown> = {
    "workouts:getActiveWorkout": workout,
    "users:getCurrentUser": user,
    "entries:getEntriesByWorkout": [],
    "workouts:getRoutineExercisesForWorkout": routineExercises,
    "ai/swapMutations:getSwapsForWorkout": [],
    "entries:getExerciseHistory": [],
    "entries:getTimedExerciseHistory": [],
    "exercises:getExercises": [],
    "exercises:getMuscleGroups": [],
    "exercises:getWeightStep": null,
  };
  (useQuery as jest.Mock).mockImplementation((ref, args) => {
    if (args === "skip") return undefined;
    const name = getFunctionName(ref);
    if (!(name in queryResults)) throw new Error(`Unmocked query: ${name}`);
    const result = queryResults[name];
    return Array.isArray(result) ? [...result] : result;
  });
  (useMutation as jest.Mock).mockImplementation((ref) =>
    getFunctionName(ref) === "entries:addLiftingEntry"
      ? addLiftingEntry
      : jest.fn(),
  );
}

async function renderActive(user: Record<string, unknown>) {
  mockConvex(user);
  await renderRouter(
    {
      "workout/active": () => (
        <ThemeProvider>
          <ActiveWorkoutScreen />
        </ThemeProvider>
      ),
    },
    { initialUrl: "/workout/active" },
  );
  await waitFor(() => {
    expect(screen.getByText("LOG SET 1/3")).toBeOnTheScreen();
  });
}

async function logSet() {
  await fireEvent.press(screen.getByText("LOG SET 1/3"));
  expect(addLiftingEntry).toHaveBeenCalledTimes(1);
  const [args] = addLiftingEntry.mock.calls[0] as unknown as [
    { lifting: { rpe?: number; rir?: number } },
  ];
  return args.lifting;
}

beforeEach(async () => {
  await resetPendingSets();
  addLiftingEntry.mockClear();
});

describe("effort logging on the active workout screen", () => {
  it("logs a set without effort in one tap", async () => {
    await renderActive({ preferredUnits: "lb" });

    const lifting = await logSet();

    expect(lifting.rpe).toBeUndefined();
    expect(lifting.rir).toBeUndefined();
  });

  it("logs RPE 7 with one effort tap", async () => {
    await renderActive({ preferredUnits: "lb" });

    await fireEvent.press(screen.getByLabelText("RPE 7"));
    const lifting = await logSet();

    expect(lifting.rpe).toBe(7);
    expect(lifting.rir).toBeUndefined();
  });

  it("logs RPE 8.5 with the half step", async () => {
    await renderActive({ preferredUnits: "lb", effortScale: "rpe" });

    await fireEvent.press(screen.getByLabelText("RPE 8"));
    await fireEvent.press(screen.getByLabelText("Half step"));
    expect(screen.getByText(/RPE 8\.5 · 1–2 reps left/)).toBeOnTheScreen();
    const lifting = await logSet();

    expect(lifting.rpe).toBe(8.5);
    expect(lifting.rir).toBeUndefined();
  });

  it("stores RIR and the matching RPE when the user logs on the RIR scale", async () => {
    await renderActive({ preferredUnits: "lb", effortScale: "rir" });

    expect(screen.queryByLabelText("Half step")).toBeNull();
    await fireEvent.press(screen.getByLabelText("2 reps in reserve"));
    const lifting = await logSet();

    expect(lifting.rir).toBe(2);
    expect(lifting.rpe).toBe(8);
  });
});
