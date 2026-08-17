import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  EditCardioSheet,
  type EditableCardio,
} from "@/components/workout/edit-cardio-sheet";
import { ThemeProvider } from "@/theme/theme-provider";

const entry: EditableCardio = {
  entryId: "entry_4",
  exerciseName: "Treadmill",
  cardio: {
    mode: "steady",
    durationSeconds: 1_530,
    intensity: 6,
    vestWeight: 20,
    vestWeightUnit: "lb",
  },
  displayVestUnit: "lb",
};

async function renderSheet() {
  const onSave = jest.fn();
  const onDelete = jest.fn();
  const onOpenChange = jest.fn();
  await render(
    <ThemeProvider>
      <EditCardioSheet
        entry={entry}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onDelete={onDelete}
      />
    </ThemeProvider>,
  );
  return { onSave, onDelete, onOpenChange };
}

describe("EditCardioSheet", () => {
  it("keeps second-precision duration when the minutes stepper is untouched", async () => {
    const { onSave, onOpenChange } = await renderSheet();

    await fireEvent.press(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith("entry_4", {
      durationSeconds: 1_530,
      intensity: 6,
      vestWeight: 20,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("converts the stepper value to seconds once duration is edited", async () => {
    const { onSave } = await renderSheet();

    await fireEvent.press(screen.getByLabelText("Increase Duration"));
    await fireEvent.press(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith("entry_4", {
      durationSeconds: 27 * 60,
      intensity: 6,
      vestWeight: 20,
    });
  });

  it("deletes the entry and closes", async () => {
    const { onDelete, onOpenChange } = await renderSheet();

    await fireEvent.press(screen.getByText("Delete Entry"));

    expect(onDelete).toHaveBeenCalledWith("entry_4");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
