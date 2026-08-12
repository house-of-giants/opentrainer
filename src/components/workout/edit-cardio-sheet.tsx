"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SetStepper } from "./set-stepper";
import { Trash2 } from "lucide-react";
import { Doc } from "../../../convex/_generated/dataModel";
import { displayWeight } from "@/lib/units";

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
    data: { durationSeconds: number; intensity?: number; vestWeight?: number }
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
    data: { durationSeconds: number; intensity?: number; vestWeight?: number }
  ) => void;
  onDelete: (entryId: string) => void;
}) {
  const hasIntensity = entry.cardio.intensity !== undefined;
  const hasVest = entry.cardio.vestWeight !== undefined;

  const initialMinutes = Math.max(
    1,
    Math.round(entry.cardio.durationSeconds / 60)
  );
  const [minutes, setMinutes] = useState(initialMinutes);
  const [intensity, setIntensity] = useState(entry.cardio.intensity ?? 0);
  const [vestWeight, setVestWeight] = useState(
    displayWeight(
      entry.cardio.vestWeight ?? 0,
      entry.cardio.vestWeightUnit ?? "lb",
      entry.displayVestUnit
    )
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
    <DrawerContent className="flex flex-col">
      <DrawerHeader>
        <DrawerTitle>Edit Cardio</DrawerTitle>
        <DrawerDescription>
          {entry.exerciseName} — {minutes} min
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex-1 px-4 py-6">
        <div className="flex flex-wrap items-end justify-center gap-6">
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
        </div>

        <Button
          variant="ghost"
          className="mt-8 w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Entry
        </Button>
      </div>

      <DrawerFooter className="flex-row gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSave}>
          Save
        </Button>
      </DrawerFooter>
    </DrawerContent>
  );
}

export function EditCardioSheet({
  entry,
  onOpenChange,
  onSave,
  onDelete,
}: EditCardioSheetProps) {
  return (
    <Drawer open={!!entry} onOpenChange={onOpenChange}>
      {entry && (
        <EditCardioContent
          key={entry.entryId}
          entry={entry}
          onOpenChange={onOpenChange}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </Drawer>
  );
}
