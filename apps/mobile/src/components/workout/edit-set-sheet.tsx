import { useState } from "react";
import { Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SetStepper } from "./set-stepper";
import { RpeSelector } from "./rpe-selector";

export interface EditableSet {
  entryId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  durationSeconds?: number;
  unit: "lb" | "kg";
  storedWeight?: number;
  storedUnit?: "lb" | "kg";
  isBodyweight?: boolean;
  isWarmup?: boolean;
  rpe?: number | null;
}

interface EditSetSheetProps {
  set: EditableSet | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    entryId: string,
    data: {
      reps?: number;
      weight?: number;
      durationSeconds?: number;
      rpe?: number | null;
      isWarmup?: boolean;
    },
  ) => void;
  onDelete: (entryId: string) => void;
}

function EditSetContent({
  set,
  onOpenChange,
  onSave,
  onDelete,
}: {
  set: EditableSet;
  onOpenChange: (open: boolean) => void;
  onSave: EditSetSheetProps["onSave"];
  onDelete: (entryId: string) => void;
}) {
  const [weight, setWeight] = useState(set.weight);
  const [reps, setReps] = useState(set.reps);
  const [durationSeconds, setDurationSeconds] = useState(
    set.durationSeconds ?? 30,
  );
  const [rpe, setRpe] = useState<number | null>(set.rpe ?? null);
  const [isWarmup, setIsWarmup] = useState(set.isWarmup ?? false);

  const handleSave = () => {
    onSave(
      set.entryId,
      set.durationSeconds !== undefined
        ? { durationSeconds, rpe, isWarmup }
        : { reps, weight, rpe, isWarmup },
    );
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(set.entryId);
    onOpenChange(false);
  };

  const formatSetDisplay = () => {
    if (set.durationSeconds !== undefined) {
      return `${durationSeconds} seconds`;
    }
    if (set.isBodyweight && weight === 0) {
      return `BW × ${reps}`;
    }
    if (set.isBodyweight && weight > 0) {
      return `BW+${weight} ${set.unit} × ${reps}`;
    }
    return `${weight} ${set.unit} × ${reps}`;
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit Set {set.setNumber}</SheetTitle>
        <SheetDescription>
          {set.exerciseName} — {formatSetDisplay()}
        </SheetDescription>
      </SheetHeader>

      <View className="py-6">
        <View className="flex-row flex-wrap items-end justify-center gap-6">
          {set.durationSeconds !== undefined ? (
            <SetStepper
              label="Duration"
              value={durationSeconds}
              onChange={setDurationSeconds}
              step={5}
              min={1}
              max={3600}
              unit="seconds"
            />
          ) : (
            <>
              {(!set.isBodyweight || weight > 0) && (
                <SetStepper
                  label={set.isBodyweight ? "Added Weight" : "Weight"}
                  value={weight}
                  onChange={setWeight}
                  step={set.unit === "kg" ? 2.5 : 5}
                  min={0}
                  unit={set.unit}
                />
              )}
              <SetStepper
                label="Reps"
                value={reps}
                onChange={setReps}
                step={1}
                min={1}
                max={100}
              />
            </>
          )}
        </View>

        <View className="mt-6 flex-row items-center justify-center gap-2">
          <Checkbox
            checked={isWarmup}
            onCheckedChange={(checked) => setIsWarmup(checked === true)}
            accessibilityLabel="Warmup set"
          />
          <Label className="text-muted-foreground" onPress={() => setIsWarmup(!isWarmup)}>
            Warmup set
          </Label>
        </View>

        <View className="mt-6">
          <RpeSelector value={rpe} onChange={setRpe} />
        </View>

        <Button
          variant="ghost"
          className="mt-8 w-full"
          onPress={handleDelete}
          accessibilityLabel="Delete set"
        >
          <Trash2 size={16} color="#ef4444" />
          <Text className="text-sm font-medium text-destructive">
            Delete Set
          </Text>
        </Button>
      </View>

      <View className="flex-row gap-2 pb-4">
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

export function EditSetSheet({
  set,
  onOpenChange,
  onSave,
  onDelete,
}: EditSetSheetProps) {
  return (
    <Sheet open={!!set} onOpenChange={onOpenChange}>
      {set && (
        <EditSetContent
          key={set.entryId}
          set={set}
          onOpenChange={onOpenChange}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </Sheet>
  );
}
