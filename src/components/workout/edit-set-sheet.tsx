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
import { RpeSelector } from "./rpe-selector";
import { Trash2 } from "lucide-react";

export interface EditableSet {
  entryId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  unit: "lb" | "kg";
  isBodyweight?: boolean;
  rpe?: number | null;
}

interface EditSetSheetProps {
  set: EditableSet | null;
  onOpenChange: (open: boolean) => void;
  onSave: (entryId: string, data: { reps: number; weight: number; rpe?: number | null }) => void;
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
  onSave: (entryId: string, data: { reps: number; weight: number; rpe?: number | null }) => void;
  onDelete: (entryId: string) => void;
}) {
  const [weight, setWeight] = useState(set.weight);
  const [reps, setReps] = useState(set.reps);
  const [rpe, setRpe] = useState<number | null>(set.rpe ?? null);

  const handleSave = () => {
    onSave(set.entryId, { reps, weight, rpe });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(set.entryId);
    onOpenChange(false);
  };

  const formatSetDisplay = () => {
    if (set.isBodyweight && weight === 0) {
      return `BW × ${reps}`;
    }
    if (set.isBodyweight && weight > 0) {
      return `BW+${weight} ${set.unit} × ${reps}`;
    }
    return `${weight} ${set.unit} × ${reps}`;
  };

  return (
    <DrawerContent className="flex flex-col">
      <DrawerHeader>
        <DrawerTitle>Edit Set {set.setNumber}</DrawerTitle>
        <DrawerDescription>
          {set.exerciseName} — {formatSetDisplay()}
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex-1 px-4 py-6">
        <div className="flex flex-wrap items-end justify-center gap-6">
          {(!set.isBodyweight || weight > 0) && (
            <SetStepper
              label={set.isBodyweight ? "Added Weight" : "Weight"}
              value={weight}
              onChange={setWeight}
              step={5}
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
        </div>

        <div className="mt-6">
          <RpeSelector value={rpe} onChange={setRpe} />
        </div>

        <Button
          variant="ghost"
          className="mt-8 w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Set
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

export function EditSetSheet({
  set,
  onOpenChange,
  onSave,
  onDelete,
}: EditSetSheetProps) {
  return (
    <Drawer open={!!set} onOpenChange={onOpenChange}>
      {set && (
        <EditSetContent
          key={set.entryId}
          set={set}
          onOpenChange={onOpenChange}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </Drawer>
  );
}
