import { fireEvent, render, screen } from "@testing-library/react-native";
import { buildRepLiftingUpdate } from "@opentrainer/lib/workout-set-edit";
import type { EditableLiftingSet } from "@opentrainer/lib/workout-set-edit";

import {
  EditSetSheet,
  type EditableSet,
} from "@/components/workout/edit-set-sheet";
import { ThemeProvider } from "@/theme/theme-provider";

const warmupSet: EditableSet = {
  entryId: "entry1",
  exerciseName: "Bench Press",
  setNumber: 2,
  reps: 8,
  weight: 135,
  unit: "lb",
  storedWeight: 135,
  storedUnit: "lb",
  isWarmup: true,
  rpe: 8,
};

async function renderSheet(overrides: Partial<Parameters<typeof EditSetSheet>[0]>) {
  const onOpenChange = jest.fn();
  const onSave = jest.fn();
  const onDelete = jest.fn();
  await render(
    <ThemeProvider>
      <EditSetSheet
        set={warmupSet}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onDelete={onDelete}
        {...overrides}
      />
    </ThemeProvider>,
  );
  return { onOpenChange, onSave, onDelete };
}

describe("EditSetSheet", () => {
  it("saves a rep edit preserving the warmup flag", async () => {
    const { onSave, onOpenChange } = await renderSheet({});

    await fireEvent.press(screen.getByLabelText("Increase Reps"));
    await fireEvent.press(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith("entry1", {
      reps: 9,
      weight: 135,
      rpe: 8,
      isWarmup: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("produces correct updateLiftingEntry args through the workout-set-edit builder", async () => {
    // Wired exactly like the active screen's handleUpdateSet.
    let mutationArgs: unknown;
    const editingSet: EditableLiftingSet = warmupSet;
    const { onSave } = await renderSheet({
      onSave: (entryId, data) => {
        mutationArgs = {
          entryId,
          lifting: buildRepLiftingUpdate(editingSet, data),
        };
      },
    });

    await fireEvent.press(screen.getByLabelText("Increase Reps"));
    await fireEvent.press(screen.getByText("Save"));

    expect(onSave).not.toHaveBeenCalled(); // default spy replaced by wiring
    expect(mutationArgs).toEqual({
      entryId: "entry1",
      lifting: {
        setNumber: 2,
        reps: 9,
        weight: 135,
        unit: "lb",
        isBodyweight: undefined,
        rpe: 8,
        isWarmup: true,
      },
    });
  });

  it("clears the warmup flag when the checkbox is unchecked", async () => {
    const { onSave } = await renderSheet({});

    await fireEvent.press(screen.getByLabelText("Warmup set"));
    await fireEvent.press(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith("entry1", {
      reps: 8,
      weight: 135,
      rpe: 8,
      isWarmup: false,
    });
  });

  it("deletes through onDelete", async () => {
    const { onDelete, onOpenChange } = await renderSheet({});

    await fireEvent.press(screen.getByText("Delete Set"));

    expect(onDelete).toHaveBeenCalledWith("entry1");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sends a duration update for timed sets", async () => {
    const { onSave } = await renderSheet({
      set: {
        ...warmupSet,
        durationSeconds: 30,
        isWarmup: false,
      },
    });

    await fireEvent.press(screen.getByLabelText("Increase Duration"));
    await fireEvent.press(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith("entry1", {
      durationSeconds: 35,
      rpe: 8,
      isWarmup: false,
    });
  });
});
