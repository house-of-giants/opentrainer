import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { Linking } from "react-native";

import NewRoutineScreen from "@/app/(app)/routines/new";
import {
  exerciseCatalogFixture,
  muscleGroupsFixture,
  validRoutineImportJson,
} from "@/components/workout/__fixtures__/routine-fixtures";
import { analytics } from "@/lib/analytics";
import { ThemeProvider } from "@/theme/theme-provider";
import { dragState } from "../test-utils/draggable-flatlist-mock";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock("@/lib/analytics", () => ({
  analytics: { capture: jest.fn(), identify: jest.fn(), captureException: jest.fn() },
}));

// Renders each list inline and records the latest data + onDragEnd handler per
// testID so tests can invoke the reorder callback directly.
jest.mock("react-native-draggable-flatlist", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use import
  require("../test-utils/draggable-flatlist-mock"),
);

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;

const createRoutine = jest.fn().mockResolvedValue("routine_new");
const createWorkout = jest.fn().mockResolvedValue("workout_1");
const importRoutine = jest.fn().mockResolvedValue("routine_imported");
const createExercise = jest.fn().mockResolvedValue("ex_custom");
const seedExercises = jest.fn().mockResolvedValue({ added: 10 });

function mockQueries(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "exercises:getExercises": exerciseCatalogFixture,
    "exercises:getMuscleGroups": muscleGroupsFixture,
    ...overrides,
  };
  mockUseQuery.mockImplementation((ref: unknown) => values[getFunctionName(ref as never)]);
}

beforeEach(() => {
  jest.clearAllMocks();
  dragState.reset();
  mockSearchParams = {};
  mockQueries();
  const mutations: Record<string, jest.Mock> = {
    "routines:createRoutine": createRoutine,
    "routines:importRoutineFromJson": importRoutine,
    "workouts:createWorkout": createWorkout,
    "exercises:createExercise": createExercise,
    "exercises:seedSystemExercises": seedExercises,
  };
  mockUseMutation.mockImplementation(
    (ref: unknown) => mutations[getFunctionName(ref as never)] ?? jest.fn(),
  );
});

async function renderBuilder() {
  await render(
    <ThemeProvider>
      <NewRoutineScreen />
    </ThemeProvider>,
  );
}

// The bottom-sheet jest mock renders sheet children unconditionally, so the
// picker list is always in the tree; "Add Exercise" must still be pressed
// first so the screen knows which day is active. Index 0 is the day card's
// button (the picker's identically named sheet title renders later).
async function addExercise(name: string) {
  await fireEvent.press(screen.getAllByText("Add Exercise")[0]);
  await fireEvent.press(screen.getAllByText(name)[0]);
}

describe("Routine builder", () => {
  it("starts with one expanded day and adds new days collapsed-others", async () => {
    await renderBuilder();

    expect(screen.getByDisplayValue("Day 1")).toBeOnTheScreen();
    expect(screen.getByText("No exercises added yet")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Add Day"));
    expect(screen.getByDisplayValue("Day 2")).toBeOnTheScreen();
    // Day 1 collapsed, Day 2 expanded: only one empty-state remains.
    expect(screen.getAllByText("No exercises added yet")).toHaveLength(1);
  });

  it("adds an exercise from the picker into the active day", async () => {
    await renderBuilder();

    await addExercise("Bench Press");

    expect(screen.getByText("1 exercise")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("3")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("8-12")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("90")).toBeOnTheScreen();
  });

  it("saves the routine with the exact createRoutine args", async () => {
    await renderBuilder();

    await fireEvent.changeText(
      screen.getByPlaceholderText("e.g., Push Pull Legs"),
      "My Split",
    );
    await addExercise("Bench Press");

    await fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(createRoutine).toHaveBeenCalledWith({
        name: "My Split",
        description: undefined,
        source: "manual",
        days: [
          {
            name: "Day 1",
            exercises: [
              {
                exerciseId: "ex_bench",
                exerciseName: "Bench Press",
                kind: "lifting",
                targetSets: 3,
                targetReps: "8-12",
                measurementType: undefined,
                targetHoldSeconds: undefined,
                restSeconds: 90,
              },
            ],
          },
        ],
      }),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it("saves a rest time of 0 seconds that the user types", async () => {
    await renderBuilder();

    await fireEvent.changeText(
      screen.getByPlaceholderText("e.g., Push Pull Legs"),
      "My Split",
    );
    await addExercise("Bench Press");
    await fireEvent.changeText(screen.getByDisplayValue("90"), "0");
    await fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(createRoutine).toHaveBeenCalledTimes(1));
    expect(createRoutine.mock.calls[0][0].days[0].exercises[0].restSeconds).toBe(0);
  });

  it("does not save without a routine name", async () => {
    await renderBuilder();

    await addExercise("Bench Press");
    await fireEvent.press(screen.getByText("Save"));

    expect(createRoutine).not.toHaveBeenCalled();
  });

  it("persists a reorder produced by the drag list's onDragEnd", async () => {
    await renderBuilder();

    await fireEvent.changeText(
      screen.getByPlaceholderText("e.g., Push Pull Legs"),
      "My Split",
    );
    await addExercise("Bench Press");
    await addExercise("Squat");

    const data = dragState.data["day-exercise-list-0"];
    expect(data).toHaveLength(2);
    await act(async () => {
      dragState.handlers["day-exercise-list-0"]({
        data: [...data].reverse(),
        from: 1,
        to: 0,
      });
    });

    await fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(createRoutine).toHaveBeenCalled());
    const days = createRoutine.mock.calls[0][0].days;
    expect(days[0].exercises.map((e: { exerciseName: string }) => e.exerciseName)).toEqual([
      "Squat",
      "Bench Press",
    ]);
  });
});

// The routine docs the ready screen reads back after a save or a paste.
const savedRoutine = {
  _id: "routine_new",
  name: "My Split",
  source: "manual",
  isActive: true,
  days: [
    {
      name: "Day 1",
      exercises: [{ exerciseName: "Bench Press", kind: "lifting", targetSets: 3, targetReps: "8-12" }],
    },
  ],
};
const importedRoutine = {
  ...savedRoutine,
  _id: "routine_imported",
  name: "Imported PPL",
  source: "imported",
  days: [{ name: "Push Day", exercises: [{ exerciseName: "Bench Press", kind: "lifting" }] }],
};

function mockReadyQueries() {
  mockUseQuery.mockImplementation((ref: unknown, args?: { routineId?: string }) => {
    const name = getFunctionName(ref as never);
    if (name === "routines:getRoutine") {
      return args?.routineId === "routine_imported" ? importedRoutine : savedRoutine;
    }
    const values: Record<string, unknown> = {
      "exercises:getExercises": exerciseCatalogFixture,
      "exercises:getMuscleGroups": muscleGroupsFixture,
      "users:getCurrentUser": { _id: "user_1", preferredUnits: "kg" },
      "entries:getExerciseHistory": [],
      "exercises:getWeightStep": null,
    };
    return values[name];
  });
}

async function saveMySplit() {
  await fireEvent.changeText(screen.getByPlaceholderText("e.g., Push Pull Legs"), "My Split");
  await addExercise("Bench Press");
  await fireEvent.press(screen.getByText("Save"));
}

describe("Routine builder opened from onboarding", () => {
  beforeEach(() => mockReadyQueries());

  it("after a save, shows day 1 and starts it with Show me day 1", async () => {
    mockSearchParams = { onboarding: "from_scratch" };
    await renderBuilder();

    await saveMySplit();

    expect(await screen.findByRole("button", { name: "Show me day 1" })).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByText("Next up · My Split")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Show me day 1" }));

    await waitFor(() =>
      expect(createWorkout).toHaveBeenCalledWith({
        title: "Day 1",
        routineId: "routine_new",
        routineDayIndex: 0,
      }),
    );
    // Onboarding is over: the workout replaces the builder instead of
    // stacking on top of it.
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(app)/workout/active"));
    expect(mockPush).not.toHaveBeenCalled();
    expect(analytics.capture).toHaveBeenCalledWith(
      "workout_started",
      expect.objectContaining({ source: "routine", day_index: 0, entry_point: "onboarding" }),
    );
  });

  it("lets the lifter skip day 1 and go home", async () => {
    mockSearchParams = { onboarding: "from_scratch" };
    await renderBuilder();
    await saveMySplit();

    await fireEvent.press(await screen.findByRole("button", { name: "Go to home" }));

    expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)");
    expect(createWorkout).not.toHaveBeenCalled();
  });

  it("Bring my program offers a paste and a CSV link to the web import", async () => {
    mockSearchParams = { onboarding: "bring_program" };
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await renderBuilder();

    await fireEvent.press(screen.getByRole("link", { name: /opentrainer\.app/ }));
    expect(openURL).toHaveBeenCalledWith("https://opentrainer.app/profile/import");

    await fireEvent.press(screen.getByRole("button", { name: /Paste a routine/ }));
    await fireEvent.changeText(screen.getByLabelText("Routine JSON"), validRoutineImportJson);
    await fireEvent.press(screen.getByRole("button", { name: "Import Routine" }));

    expect(importRoutine).toHaveBeenCalledWith({ json: validRoutineImportJson });
    await fireEvent.press(await screen.findByRole("button", { name: "Show me day 1" }));

    await waitFor(() =>
      expect(createWorkout).toHaveBeenCalledWith({
        title: "Push Day",
        routineId: "routine_imported",
        routineDayIndex: 0,
      }),
    );
    openURL.mockRestore();
  });

  it("Start from scratch shows only the builder, without paste or CSV", async () => {
    mockSearchParams = { onboarding: "from_scratch" };
    await renderBuilder();

    expect(screen.queryByRole("button", { name: /Paste a routine/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: /opentrainer\.app/ })).not.toBeOnTheScreen();
    expect(screen.getByPlaceholderText("e.g., Push Pull Legs")).toBeOnTheScreen();
  });

  it("outside onboarding, a save still returns to the routines list", async () => {
    await renderBuilder();

    await saveMySplit();

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Show me day 1" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Paste a routine/ })).not.toBeOnTheScreen();
  });
});
