import { fireEvent, render, screen } from "@testing-library/react-native";
import type { EffortScale } from "@opentrainer/lib/effort";

import { RpeSelector } from "@/components/workout/rpe-selector";

async function renderSelector(value: number | null, scale: EffortScale) {
  const onChange = jest.fn();
  await render(<RpeSelector value={value} onChange={onChange} scale={scale} />);
  return onChange;
}

describe("RpeSelector", () => {
  // The old control stored only 6, 8, 9, and 10.
  it.each([
    [6, "RPE 6", "RPE 6 · 4+ reps left"],
    [8, "RPE 8", "RPE 8 · 2 reps left"],
    [9, "RPE 9", "RPE 9 · 1 rep left"],
    [10, "RPE 10", "RPE 10 · 0 reps left"],
  ])("shows legacy RPE %s on the RPE scale", async (value, chip, text) => {
    await renderSelector(value, "rpe");

    expect(screen.getByLabelText(chip)).toBeSelected();
    expect(screen.getByText(text)).toBeOnTheScreen();
    expect(screen.getByLabelText("Half step")).not.toBeSelected();
  });

  it.each([
    [6, "4 reps in reserve", "4 reps left"],
    [8, "2 reps in reserve", "2 reps left"],
    [9, "1 rep in reserve", "1 rep left"],
    [10, "0 reps in reserve", "0 reps left"],
  ])("shows legacy RPE %s as RIR on the RIR scale", async (value, chip, text) => {
    await renderSelector(value, "rir");

    expect(screen.getByLabelText(chip)).toBeSelected();
    expect(screen.getByText(text)).toBeOnTheScreen();
  });

  it("shows a half-step RPE on the RPE scale as the whole step plus the half", async () => {
    await renderSelector(8.5, "rpe");

    expect(screen.getByLabelText("RPE 8")).toBeSelected();
    expect(screen.getByLabelText("Half step")).toBeSelected();
    expect(screen.getByText("RPE 8.5 · 1–2 reps left")).toBeOnTheScreen();
  });

  it("does not show a half-step RPE as a whole RIR on the RIR scale", async () => {
    await renderSelector(8.5, "rir");

    for (const rir of ["4 reps", "3 reps", "2 reps", "1 rep", "0 reps"]) {
      expect(screen.getByLabelText(`${rir} in reserve`)).not.toBeSelected();
    }
    expect(screen.getByText("RPE 8.5 · 1–2 reps left")).toBeOnTheScreen();
  });

  it("drops the half step when the whole step is tapped", async () => {
    const onChange = await renderSelector(8.5, "rpe");

    await fireEvent.press(screen.getByLabelText("RPE 8"));

    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("removes the half step when the half chip is tapped again", async () => {
    const onChange = await renderSelector(9.5, "rpe");

    await fireEvent.press(screen.getByLabelText("Half step"));

    expect(onChange).toHaveBeenCalledWith(9);
  });

  it("clears the effort when the selected chip is tapped", async () => {
    const onChange = await renderSelector(7, "rpe");

    await fireEvent.press(screen.getByLabelText("RPE 7"));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it.each([null, 10])("disables the half step for %s", async (value) => {
    const onChange = await renderSelector(value, "rpe");

    expect(screen.getByLabelText("Half step")).toBeDisabled();
    await fireEvent.press(screen.getByLabelText("Half step"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
