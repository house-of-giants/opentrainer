import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { SetStepper } from "@/components/workout/set-stepper";
import { ThemeProvider } from "@/theme/theme-provider";

async function renderWithTheme(ui: React.ReactElement) {
  await render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("SetStepper", () => {
  it("steps weight by the +5 lb quick adjust and fires onChange", async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <SetStepper
        label="WEIGHT"
        value={135}
        onChange={onChange}
        step={5}
        min={0}
        unit="lb"
      />,
    );

    await fireEvent.press(screen.getByLabelText("Increase WEIGHT"));
    expect(onChange).toHaveBeenCalledWith(140);

    await fireEvent.press(screen.getByLabelText("Decrease WEIGHT"));
    expect(onChange).toHaveBeenCalledWith(130);
  });

  it("steps reps by +1 and clamps at min", async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <SetStepper
        label="REPS"
        value={1}
        onChange={onChange}
        step={1}
        min={1}
        max={100}
      />,
    );

    await fireEvent.press(screen.getByLabelText("Increase REPS"));
    expect(onChange).toHaveBeenCalledWith(2);

    onChange.mockClear();
    // At min, the decrement button is disabled and must not fire.
    await fireEvent.press(screen.getByLabelText("Decrease REPS"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps at max", async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <SetStepper
        label="REPS"
        value={100}
        onChange={onChange}
        step={1}
        min={1}
        max={100}
      />,
    );

    await fireEvent.press(screen.getByLabelText("Increase REPS"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("commits a typed value, clamped to bounds", async () => {
    function Harness({ onChange }: { onChange: (value: number) => void }) {
      const [value, setValue] = useState(135);
      return (
        <SetStepper
          label="WEIGHT"
          value={value}
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
          step={5}
          min={0}
          max={9999}
          unit="lb"
        />
      );
    }

    const onChange = jest.fn();
    await renderWithTheme(<Harness onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText("Edit WEIGHT"));
    // Edit mode starts empty (no clearing needed to type a new weight);
    // the current value is the placeholder.
    const input = screen.getByPlaceholderText("135");
    await fireEvent.changeText(input, "225");
    await fireEvent(input, "blur");

    expect(onChange).toHaveBeenCalledWith(225);
    expect(screen.getByText("225")).toBeOnTheScreen();
  });

  it("keeps the current value when edit mode is left empty", async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <SetStepper
        label="WEIGHT"
        value={135}
        onChange={onChange}
        step={5}
        unit="lb"
      />
    );

    await fireEvent.press(screen.getByLabelText("Edit WEIGHT"));
    const input = screen.getByPlaceholderText("135");
    await fireEvent(input, "blur");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("135")).toBeOnTheScreen();
  });
});
