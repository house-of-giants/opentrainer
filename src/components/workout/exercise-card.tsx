"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SetStepper } from "./set-stepper";
import { useHaptic } from "@/hooks/use-haptic";

interface SetData {
  setNumber: number;
  reps: number;
  weight: number;
  unit: "lb" | "kg";
}

interface ExerciseCardProps {
  exerciseName: string;
  sets: SetData[];
  defaultWeight?: number;
  defaultReps?: number;
  unit?: "lb" | "kg";
  onAddSet: (set: Omit<SetData, "setNumber">) => void;
}

export function ExerciseCard({
  exerciseName,
  sets,
  defaultWeight = 45,
  defaultReps = 8,
  unit = "lb",
  onAddSet,
}: ExerciseCardProps) {
  const [weight, setWeight] = useState(
    sets.length > 0 ? sets[sets.length - 1].weight : defaultWeight
  );
  const [reps, setReps] = useState(
    sets.length > 0 ? sets[sets.length - 1].reps : defaultReps
  );
  const { vibrate } = useHaptic();

  const handleAddSet = () => {
    vibrate("success");
    onAddSet({ reps, weight, unit });
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{exerciseName}</h3>
        <span className="text-sm text-muted-foreground">
          {sets.length} {sets.length === 1 ? "set" : "sets"}
        </span>
      </div>

      {sets.length > 0 && (
        <div className="mb-4 space-y-1">
          {sets.map((set) => (
            <div
              key={set.setNumber}
              className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
            >
              <span className="font-medium">Set {set.setNumber}</span>
              <span className="tabular-nums">
                {set.weight} {set.unit} × {set.reps}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end justify-between gap-4">
        <SetStepper
          label="Weight"
          value={weight}
          onChange={setWeight}
          step={5}
          min={0}
          unit={unit}
        />
        <SetStepper
          label="Reps"
          value={reps}
          onChange={setReps}
          step={1}
          min={1}
          max={100}
        />
      </div>

      <Button
        size="lg"
        className="mt-4 h-14 w-full text-lg"
        onClick={handleAddSet}
      >
        Log Set {sets.length + 1}
      </Button>
    </Card>
  );
}
