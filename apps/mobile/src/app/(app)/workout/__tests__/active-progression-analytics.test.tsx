import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import ActiveWorkoutScreen from "@/app/(app)/workout/active";
import { analytics } from "@/lib/analytics";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(() => jest.fn()),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock(
  "react-native-safe-area-context",
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  () => require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("@/lib/analytics", () => ({
  analytics: { capture: jest.fn(), identify: jest.fn(), captureException: jest.fn() },
}));

const mockCapture = analytics.capture as jest.Mock;

// Two sessions of 3x8 at 135 lb with no RPE: the suggestion is 140 lb x 8.
function pastSession(workoutId: string, date: string) {
  return {
    workoutId,
    date,
    sets: [1, 2, 3].map((setNumber) => ({
      setNumber,
      weight: 135,
      reps: 8,
      rpe: null,
      unit: "lb" as const,
    })),
    bestSet: { weight: 135, reps: 8, rpe: null, unit: "lb" as const },
  };
}

const queryResults: Record<string, unknown> = {
  "workouts:getActiveWorkout": {
    _id: "workout1",
    title: "Push Day",
    startedAt: Date.now() - 10 * 60000,
    routineId: "routine1",
    exerciseNotes: [],
  },
  "users:getCurrentUser": { preferredUnits: "lb", tier: "pro" },
  "entries:getEntriesByWorkout": [],
  "workouts:getRoutineExercisesForWorkout": [
    { exerciseName: "Bench Press", kind: "lifting", targetSets: 3, targetReps: "8-12" },
  ],
  "ai/swapMutations:getSwapsForWorkout": [],
  "entries:getExerciseHistory": [
    pastSession("w2", "2026-11-10T00:00:00.000Z"),
    pastSession("w1", "2026-11-07T00:00:00.000Z"),
  ],
  "entries:getTimedExerciseHistory": [],
  "exercises:getExercises": [],
  "exercises:getMuscleGroups": [],
  "exercises:getWeightStep": null,
};

const addLiftingEntry = jest.fn().mockResolvedValue("entry-id");

beforeEach(() => {
  jest.clearAllMocks();
  (useQuery as jest.Mock).mockImplementation((ref, args) => {
    if (args === "skip") return undefined;
    const name = getFunctionName(ref);
    if (!(name in queryResults)) throw new Error(`Unmocked query: ${name}`);
    return queryResults[name];
  });
  (useMutation as jest.Mock).mockImplementation((ref) =>
    getFunctionName(ref) === "entries:addLiftingEntry" ? addLiftingEntry : jest.fn(),
  );
});

function suggestionEvents() {
  return mockCapture.mock.calls.filter(([event]) =>
    String(event).startsWith("progression_suggestion_"),
  );
}

async function renderAndWaitForSuggestion() {
  await render(
    <ThemeProvider>
      <ActiveWorkoutScreen />
    </ThemeProvider>,
  );
  await waitFor(() => expect(screen.getByText("LOG SET 1/3")).toBeOnTheScreen());
  expect(screen.getByText("140 lb × 8")).toBeOnTheScreen();
}

async function logSet(label: string) {
  await fireEvent.press(screen.getByText(label));
  await act(async () => {});
}

describe("progression suggestion analytics", () => {
  it("sends shown once, then accepted once when the set uses the suggested weight", async () => {
    await renderAndWaitForSuggestion();

    expect(suggestionEvents()).toEqual([
      ["progression_suggestion_shown", { suggestion_type: "increase_weight" }],
    ]);

    await logSet("LOG SET 1/3");
    expect(addLiftingEntry.mock.calls[0][0].lifting).toMatchObject({ weight: 140, unit: "lb" });
    await logSet("LOG SET 1/3"); // the mocked entries query does not advance

    expect(suggestionEvents()).toEqual([
      ["progression_suggestion_shown", { suggestion_type: "increase_weight" }],
      ["progression_suggestion_accepted", { suggestion_type: "increase_weight" }],
    ]);
  });

  it("sends accepted only after the set saves, so a failed save does not count", async () => {
    addLiftingEntry.mockRejectedValueOnce(new Error("offline"));
    await renderAndWaitForSuggestion();

    await logSet("LOG SET 1/3");
    expect(addLiftingEntry).toHaveBeenCalledTimes(1);
    expect(suggestionEvents()).toEqual([
      ["progression_suggestion_shown", { suggestion_type: "increase_weight" }],
    ]);

    await logSet("LOG SET 1/3"); // retry succeeds
    expect(addLiftingEntry).toHaveBeenCalledTimes(2);
    expect(suggestionEvents()).toEqual([
      ["progression_suggestion_shown", { suggestion_type: "increase_weight" }],
      ["progression_suggestion_accepted", { suggestion_type: "increase_weight" }],
    ]);
  });

  it("does not send accepted when the lifter logs a different weight", async () => {
    await renderAndWaitForSuggestion();

    await fireEvent.press(screen.getByLabelText("Decrease WEIGHT"));
    await logSet("LOG SET 1/3");

    expect(addLiftingEntry.mock.calls[0][0].lifting).toMatchObject({ weight: 135 });
    expect(suggestionEvents()).toEqual([
      ["progression_suggestion_shown", { suggestion_type: "increase_weight" }],
    ]);
  });
});
