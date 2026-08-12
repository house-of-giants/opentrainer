import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import NewRoutineScreen from "@/app/(app)/routines/new";
import {
  exerciseCatalogFixture,
  muscleGroupsFixture,
} from "@/components/workout/__fixtures__/routine-fixtures";
import { ThemeProvider } from "@/theme/theme-provider";
import { dragState } from "../test-utils/draggable-flatlist-mock";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
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
  mockQueries();
  const mutations: Record<string, jest.Mock> = {
    "routines:createRoutine": createRoutine,
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
              },
            ],
          },
        ],
      }),
    );
    expect(mockBack).toHaveBeenCalled();
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
