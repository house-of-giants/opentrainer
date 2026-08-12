import { useState } from "react";
import { Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import type { Doc } from "@opentrainer/backend";
import { displayWeight } from "@opentrainer/lib/units";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTheme } from "@/theme/theme-provider";

import { SetStepper } from "./set-stepper";

// Port of apps/web/src/components/workout/edit-cardio-sheet.tsx (vaul drawer
// → bottom sheet). Props and save semantics are identical.
export interface EditableCardio {
  entryId: string;
  exerciseName: string;
  cardio: NonNullable<Doc<"entries">["cardio"]>;
  displayVestUnit: "lb" | "kg";
}

interface EditCardioSheetProps {
  entry: EditableCardio | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    entryId: string,
    data: { durationSeconds: number; intensity?: number; vestWeight?: number },
  ) => void;
  onDelete: (entryId: string) => void;
}

function EditCardioContent({
  entry,
  onOpenChange,
  onSave,
  onDelete,
}: {
  entry: EditableCardio;
  onOpenChange: (open: boolean) => void;
  onSave: (
    entryId: string,
    data: { durationSeconds: number; intensity?: number; vestWeight?: number },
  ) => void;
  onDelete: (entryId: string) => void;
}) {
  const { colors } = useTheme();
  const hasIntensity = entry.cardio.intensity !== undefined;
  const hasVest = entry.cardio.vestWeight !== undefined;

  const initialMinutes = Math.max(
    1,
    Math.round(entry.cardio.durationSeconds / 60),
  );
  const [minutes, setMinutes] = useState(initialMinutes);
  const [intensity, setIntensity] = useState(entry.cardio.intensity ?? 0);
  const [vestWeight, setVestWeight] = useState(
    displayWeight(
      entry.cardio.vestWeight ?? 0,
      entry.cardio.vestWeightUnit ?? "lb",
      entry.displayVestUnit,
    ),
  );

  const handleSave = () => {
    onSave(entry.entryId, {
      // Preserve second-precision durations when the minutes stepper is untouched.
      durationSeconds:
        minutes === initialMinutes ? entry.cardio.durationSeconds : minutes * 60,
      intensity: hasIntensity ? intensity : undefined,
      vestWeight: hasVest ? vestWeight : undefined,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(entry.entryId);
    onOpenChange(false);
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit Cardio</SheetTitle>
        <SheetDescription>
          {entry.exerciseName} — {minutes} min
        </SheetDescription>
      </SheetHeader>

      <View className="py-6">
        <View className="flex-row flex-wrap items-end justify-center gap-6">
          <SetStepper
            label="Duration"
            value={minutes}
            onChange={setMinutes}
            step={1}
            min={1}
            max={600}
            unit="min"
          />
          {hasIntensity && (
            <SetStepper
              label="Intensity"
              value={intensity}
              onChange={setIntensity}
              step={1}
              min={1}
              max={20}
            />
          )}
          {hasVest && (
            <SetStepper
              label="Vest Weight"
              value={vestWeight}
              onChange={setVestWeight}
              step={entry.displayVestUnit === "kg" ? 2.5 : 5}
              min={0}
              unit={entry.displayVestUnit}
            />
          )}
        </View>

        <Button
          variant="ghost"
          className="mt-8 w-full active:bg-destructive/10"
          onPress={handleDelete}
        >
          <Trash2 size={16} color={colors.destructive} />
          <Text className="text-sm font-medium text-destructive">
            Delete Entry
          </Text>
        </Button>
      </View>

      <View className="flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onPress={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button className="flex-1" onPress={handleSave}>
          Save
        </Button>
      </View>
    </>
  );
}

export function EditCardioSheet({
  entry,
  onOpenChange,
  onSave,
  onDelete,
}: EditCardioSheetProps) {
  return (
    <Sheet open={!!entry} onOpenChange={onOpenChange}>
      {entry && (
        <EditCardioContent
          key={entry.entryId}
          entry={entry}
          onOpenChange={onOpenChange}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </Sheet>
  );
}
