import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import EditRoutineScreen from "@/app/(app)/routines/[id]/edit";
import {
  editorRoutineFixture,
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
  useLocalSearchParams: () => ({ id: "routine_1" }),
}));

jest.mock("react-native-draggable-flatlist", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use import
  require("../test-utils/draggable-flatlist-mock"),
);

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;

const updateRoutine = jest.fn().mockResolvedValue(null);
const importDay = jest.fn().mockResolvedValue({ dayIndex: 2 });

function mockQueries(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "routines:getRoutine": editorRoutineFixture,
    "exercises:getExercises": exerciseCatalogFixture,
    "exercises:getMuscleGroups": muscleGroupsFixture,
    "exercises:getExercise": null,
    ...overrides,
  };
  mockUseQuery.mockImplementation((ref: unknown) => values[getFunctionName(ref as never)]);
}

beforeEach(() => {
  jest.clearAllMocks();
  dragState.reset();
  mockQueries();
  const mutations: Record<string, jest.Mock> = {
    "routines:updateRoutine": updateRoutine,
    "routines:importDayToRoutine": importDay,
  };
  mockUseMutation.mockImplementation(
    (ref: unknown) => mutations[getFunctionName(ref as never)] ?? jest.fn(),
  );
});

async function renderEditor() {
  await render(
    <ThemeProvider>
      <EditRoutineScreen />
    </ThemeProvider>,
  );
}

// Everything the editor round-trips for the unchanged fixture.
const expectedDaysPayload = [
  {
    name: "Push",
    exercises: [
      {
        exerciseId: "ex_bench",
        exerciseName: "Bench Press",
        kind: "lifting",
        targetSets: 4,
        targetReps: "6-8",
        measurementType: undefined,
        targetDuration: undefined,
        targetHoldSeconds: undefined,
        perSide: undefined,
      },
      {
        exerciseId: undefined,
        exerciseName: "Overhead Press",
        kind: "lifting",
        targetSets: 3,
        targetReps: "8-10",
        measurementType: undefined,
        targetDuration: undefined,
        targetHoldSeconds: undefined,
        perSide: undefined,
      },
    ],
  },
  {
    name: "Pull",
    exercises: [
      {
        exerciseId: "ex_row",
        exerciseName: "Barbell Row",
        kind: "lifting",
        targetSets: 3,
        targetReps: "8-12",
        measurementType: undefined,
        targetDuration: undefined,
        targetHoldSeconds: undefined,
        perSide: undefined,
      },
    ],
  },
];

describe("Routine editor", () => {
  it("loads the routine into the form with the first day expanded", async () => {
    await renderEditor();

    expect(screen.getByDisplayValue("Push Pull Legs")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Classic 3-day split")).toBeOnTheScreen();
    expect(screen.getByText("Push")).toBeOnTheScreen();
    expect(screen.getByText("Pull")).toBeOnTheScreen();
    // First day expanded: its exercise rows and summaries are visible.
    // (Scoped to the drag list: the exercise picker sheet also lists the
    // catalog because the bottom-sheet jest mock always renders children.)
    const dayList = within(screen.getByTestId("day-exercise-list-0"));
    expect(dayList.getByText("Bench Press")).toBeOnTheScreen();
    expect(dayList.getByText("4×6-8")).toBeOnTheScreen();
    expect(dayList.getByText("Overhead Press")).toBeOnTheScreen();
    // Second day collapsed: its drag list is not mounted.
    expect(screen.queryByTestId("day-exercise-list-1")).toBeNull();
  });

  it("shows the not-found state for a deleted routine", async () => {
    mockQueries({ "routines:getRoutine": null });
    await renderEditor();

    expect(screen.getByText("Routine not found")).toBeOnTheScreen();
  });

  it("renames a day and saves the exact updateRoutine args", async () => {
    await renderEditor();

    await fireEvent.press(screen.getByLabelText("Rename Push"));
    await fireEvent.changeText(screen.getByLabelText("Day name"), "Push A");
    await fireEvent.press(screen.getByLabelText("Done renaming day"));
    expect(screen.getByText("Push A")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(updateRoutine).toHaveBeenCalledWith({
        routineId: "routine_1",
        name: "Push Pull Legs",
        description: "Classic 3-day split",
        days: [
          { ...expectedDaysPayload[0], name: "Push A" },
          expectedDaysPayload[1],
        ],
      }),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it("persists a reorder produced by the drag list's onDragEnd", async () => {
    await renderEditor();

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

    await waitFor(() => expect(updateRoutine).toHaveBeenCalled());
    const days = updateRoutine.mock.calls[0][0].days;
    expect(days[0].exercises.map((e: { exerciseName: string }) => e.exerciseName)).toEqual([
      "Overhead Press",
      "Bench Press",
    ]);
  });
});
