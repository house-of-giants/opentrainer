import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";

import { ExerciseAccordion } from "@/components/workout/exercise-accordion";
import { ThemeProvider } from "@/theme/theme-provider";

type AccordionProps = React.ComponentProps<typeof ExerciseAccordion>;

async function renderCard(props: Partial<AccordionProps> = {}) {
  await render(
    <ThemeProvider>
      <ExerciseAccordion
        exerciseName="Lateral Raise"
        sets={[]}
        status="current"
        equipment={["dumbbell"]}
        defaultWeight={20}
        unit="lb"
        effortScale="rpe"
        onAddSet={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

function weightValue() {
  return within(screen.getByLabelText("Edit WEIGHT"));
}

describe("ExerciseAccordion weight step", () => {
  it("steps weight by 5 lb when the user has set no step", async () => {
    await renderCard({ weightStepSetting: null });

    await fireEvent.press(screen.getByLabelText("Increase WEIGHT"));

    expect(weightValue().getByText("25")).toBeOnTheScreen();
  });

  it("steps weight by the saved 2.5 lb step", async () => {
    await renderCard({ weightStepSetting: { weightStep: 2.5, unit: "lb" } });

    await fireEvent.press(screen.getByLabelText("Increase WEIGHT"));
    expect(weightValue().getByText("22.5")).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText("Decrease WEIGHT"));
    await fireEvent.press(screen.getByLabelText("Decrease WEIGHT"));
    expect(weightValue().getByText("17.5")).toBeOnTheScreen();
  });

  it("uses the default step when the saved step is in another unit", async () => {
    await renderCard({ weightStepSetting: { weightStep: 1.25, unit: "kg" } });

    await fireEvent.press(screen.getByLabelText("Increase WEIGHT"));

    expect(weightValue().getByText("25")).toBeOnTheScreen();
  });

  it("saves a preset step for this exercise from the step sheet", async () => {
    const onWeightStepChange = jest.fn();
    await renderCard({ weightStepSetting: null, onWeightStepChange });

    await fireEvent.press(screen.getByLabelText("Weight step, 5 lb"));
    await fireEvent.press(screen.getByRole("button", { name: "2.5 lb" }));
    expect(onWeightStepChange).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onWeightStepChange).toHaveBeenCalledTimes(1);
    expect(onWeightStepChange).toHaveBeenCalledWith({
      weightStep: 2.5,
      unit: "lb",
    });
  });

  it("saves a typed custom step and rejects an invalid one", async () => {
    const onWeightStepChange = jest.fn();
    await renderCard({ weightStepSetting: null, onWeightStepChange });

    await fireEvent.press(screen.getByLabelText("Weight step, 5 lb"));
    const input = screen.getByLabelText("Custom step in lb");

    await fireEvent.changeText(input, "0");
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onWeightStepChange).not.toHaveBeenCalled();
    expect(
      screen.getByText("Enter a step more than 0 and at most 50."),
    ).toBeOnTheScreen();

    await fireEvent.changeText(input, "1.");
    expect(screen.getByDisplayValue("1.")).toBeOnTheScreen();
    await fireEvent.changeText(input, "1.25");
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onWeightStepChange).toHaveBeenCalledTimes(1);
    expect(onWeightStepChange).toHaveBeenCalledWith({
      weightStep: 1.25,
      unit: "lb",
    });
  });

  it("clears a saved step back to the default", async () => {
    const onWeightStepChange = jest.fn();
    await renderCard({
      weightStepSetting: { weightStep: 2.5, unit: "lb" },
      onWeightStepChange,
    });

    await fireEvent.press(screen.getByLabelText("Weight step, 2.5 lb"));
    await fireEvent.press(
      screen.getByRole("button", { name: "Use default (5 lb)" }),
    );

    expect(onWeightStepChange).toHaveBeenCalledTimes(1);
    expect(onWeightStepChange).toHaveBeenCalledWith(null);
  });
});
