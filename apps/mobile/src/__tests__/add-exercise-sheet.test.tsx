import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import { AddExerciseSheet } from "@/components/workout/add-exercise-sheet";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;

const updateExercise = jest.fn().mockResolvedValue("ex_imported");

// An imported custom exercise (CSV import makes these without muscle groups),
// a mapped custom exercise, and a system exercise.
const exercises = [
  {
    _id: "ex_bench",
    name: "Bench Press",
    category: "lifting" as const,
    muscleGroups: ["chest", "triceps"],
    isSystemExercise: true,
  },
  {
    _id: "ex_imported",
    name: "Strict Press",
    category: "lifting" as const,
    isSystemExercise: false,
  },
  {
    _id: "ex_mapped",
    name: "Cable Pullover",
    category: "lifting" as const,
    muscleGroups: ["back"],
    isSystemExercise: false,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  const queries: Record<string, unknown> = {
    "exercises:getExercises": exercises,
    "exercises:getMuscleGroups": ["back", "chest", "shoulders", "triceps"],
  };
  mockUseQuery.mockImplementation(
    (ref: unknown) => queries[getFunctionName(ref as never)],
  );
  mockUseMutation.mockImplementation((ref: unknown) =>
    getFunctionName(ref as never) === "exercises:updateExercise"
      ? updateExercise
      : jest.fn(),
  );
});

async function renderSheet() {
  await render(
    <ThemeProvider>
      <AddExerciseSheet
        open
        onOpenChange={jest.fn()}
        onSelectExercise={jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe("AddExerciseSheet custom exercise muscle groups", () => {
  it("marks only custom lifting exercises that have no muscle groups", async () => {
    await renderSheet();

    // One row (Strict Press) has no muscle groups; the mapped custom
    // exercise and the system exercise do not get the label.
    expect(screen.getAllByText("No muscle groups")).toHaveLength(1);
  });

  it("saves the muscle groups chosen for an imported custom exercise", async () => {
    await renderSheet();

    await fireEvent.press(screen.getByLabelText("Edit Strict Press"));
    expect(screen.getByText("Edit Exercise")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("shoulders"));
    await fireEvent.press(screen.getByText("triceps"));
    await fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(updateExercise).toHaveBeenCalledTimes(1));
    expect(updateExercise).toHaveBeenCalledWith({
      id: "ex_imported",
      name: "Strict Press",
      muscleGroups: ["shoulders", "triceps"],
      measurementType: "reps",
    });
    // The sheet returns to the list after a successful save.
    await waitFor(() =>
      expect(screen.getByText("Add Exercise")).toBeOnTheScreen(),
    );
  });

  it("does not save a lifting exercise with no muscle groups", async () => {
    await renderSheet();

    await fireEvent.press(screen.getByLabelText("Edit Strict Press"));
    await fireEvent.press(screen.getByText("Save"));

    expect(
      screen.getByText("Select at least one muscle group"),
    ).toBeOnTheScreen();
    expect(updateExercise).not.toHaveBeenCalled();
  });
});
