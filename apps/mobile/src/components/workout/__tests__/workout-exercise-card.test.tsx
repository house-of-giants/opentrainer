import { fireEvent, render, screen } from "@testing-library/react-native";

import { WorkoutExerciseCard } from "@/components/workout/workout-exercise-card";
import { ThemeProvider } from "@/theme/theme-provider";

import {
  cardioEntry,
  liftingEntries,
  mobilityEntry,
} from "../__fixtures__/workout-fixtures";

async function renderWithTheme(ui: React.ReactElement) {
  await render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("WorkoutExerciseCard", () => {
  it("renders every lifting set row, including warmup, RPE and holds", async () => {
    const onEditSet = jest.fn();
    await renderWithTheme(
      <WorkoutExerciseCard
        exercise={{ name: "Bench Press", entries: liftingEntries }}
        note="Pause at chest"
        preferredUnit="lb"
        editable
        onEditSet={onEditSet}
        onEditCardio={jest.fn()}
        onEditNote={jest.fn()}
      />,
    );

    expect(screen.getByText("Bench Press")).toBeOnTheScreen();
    expect(screen.getByText("Set 1")).toBeOnTheScreen();
    expect(screen.getByText("Warmup")).toBeOnTheScreen();
    expect(screen.getByText("RPE 8")).toBeOnTheScreen();
    expect(screen.getByText("1:30 hold")).toBeOnTheScreen();
    expect(screen.getByText("Pause at chest")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByLabelText("Edit set 2 of Bench Press"),
    );
    expect(onEditSet).toHaveBeenCalledWith(liftingEntries[1]);
  });

  it("renders a cardio entry with mode, duration, intensity and vest weight", async () => {
    const onEditCardio = jest.fn();
    await renderWithTheme(
      <WorkoutExerciseCard
        exercise={{ name: "Treadmill", entries: [cardioEntry] }}
        preferredUnit="lb"
        editable
        onEditSet={jest.fn()}
        onEditCardio={onEditCardio}
        onEditNote={jest.fn()}
      />,
    );

    expect(screen.getByText("steady")).toBeOnTheScreen();
    expect(screen.getByText("25:30")).toBeOnTheScreen();
    expect(screen.getByText("Level 6")).toBeOnTheScreen();
    expect(screen.getByText(/Vest/)).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByLabelText("Edit cardio entry for Treadmill"),
    );
    expect(onEditCardio).toHaveBeenCalledWith(cardioEntry);
  });

  it("renders mobility entries and hides edit affordances when not editable", async () => {
    await renderWithTheme(
      <WorkoutExerciseCard
        exercise={{ name: "Couch Stretch", entries: [mobilityEntry] }}
        note="Knee down"
        preferredUnit="lb"
        editable={false}
        onEditSet={jest.fn()}
        onEditCardio={jest.fn()}
        onEditNote={jest.fn()}
      />,
    );

    expect(screen.getByText("Mobility")).toBeOnTheScreen();
    expect(screen.getByText("Per side")).toBeOnTheScreen();
    expect(screen.getByText("2 sets · 1m hold")).toBeOnTheScreen();
    expect(
      screen.queryByLabelText("Edit note for Couch Stretch"),
    ).not.toBeOnTheScreen();
  });
});
