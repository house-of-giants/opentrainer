"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SetStepper } from "./set-stepper";
import { useHaptic } from "@/hooks/use-haptic";
import { ChevronDown, ChevronUp, Dumbbell, Shuffle, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetData {
  setNumber: number;
  reps: number;
  weight: number;
  unit: "lb" | "kg";
  isBodyweight?: boolean;
}

type WeightMode = "weighted-only" | "bodyweight-only" | "bodyweight-optional";

function getWeightMode(equipment?: string[]): WeightMode {
  if (!equipment || equipment.length === 0) {
    return "bodyweight-optional";
  }
  const hasBodyweight = equipment.includes("bodyweight");
  const hasOtherEquipment = equipment.some((e) => e !== "bodyweight");

  if (hasBodyweight && !hasOtherEquipment) {
    return "bodyweight-only";
  }
  if (hasBodyweight && hasOtherEquipment) {
    return "bodyweight-optional";
  }
  return "weighted-only";
}

interface ExerciseCardProps {
  exerciseName: string;
  sets: SetData[];
  equipment?: string[];
  defaultWeight?: number;
  defaultReps?: number;
  unit?: "lb" | "kg";
  onAddSet: (set: Omit<SetData, "setNumber">) => void;
  onSwap?: () => void;
}

export function ExerciseCard({
  exerciseName,
  sets,
  equipment,
  defaultWeight = 45,
  defaultReps = 8,
  unit = "lb",
  onAddSet,
  onSwap,
}: ExerciseCardProps) {
  const weightMode = getWeightMode(equipment);
  const [weight, setWeight] = useState(
    sets.length > 0 ? sets[sets.length - 1].weight : defaultWeight
  );
  const [reps, setReps] = useState(
    sets.length > 0 ? sets[sets.length - 1].reps : defaultReps
  );
  const [isBodyweight, setIsBodyweight] = useState(
    weightMode === "bodyweight-only" ||
    (sets.length > 0 && sets[sets.length - 1].isBodyweight === true)
  );
  const [showAddedWeight, setShowAddedWeight] = useState(false);
  const { vibrate } = useHaptic();

  const handleAddSet = () => {
    vibrate("success");
    const effectiveWeight = isBodyweight && !showAddedWeight ? 0 : weight;
    onAddSet({ reps, weight: effectiveWeight, unit, isBodyweight });
  };

  const handleBodyweightToggle = () => {
    vibrate("light");
    setIsBodyweight(!isBodyweight);
    if (!isBodyweight) {
      setShowAddedWeight(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{exerciseName}</h3>
          {onSwap && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onSwap}
            >
              <Shuffle className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Swap exercise</span>
            </Button>
          )}
        </div>
        <span className="text-sm text-muted-foreground font-mono tabular-nums">
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
              <span className="font-mono tabular-nums">
                {set.isBodyweight && set.weight === 0
                  ? `BW × ${set.reps}`
                  : set.isBodyweight && set.weight > 0
                    ? `BW+${set.weight} ${set.unit} × ${set.reps}`
                    : `${set.weight} ${set.unit} × ${set.reps}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {weightMode === "bodyweight-optional" && (
        <div className="mb-4">
          <div className="flex rounded-lg border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => {
                if (isBodyweight) handleBodyweightToggle();
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
                !isBodyweight
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Dumbbell className="h-4 w-4" />
              Weighted
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isBodyweight) handleBodyweightToggle();
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
                isBodyweight
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="h-4 w-4" />
              Bodyweight
            </button>
          </div>
        </div>
      )}

      {weightMode === "bodyweight-only" && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              vibrate("light");
              setShowAddedWeight(!showAddedWeight);
              if (showAddedWeight) setWeight(0);
            }}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
              showAddedWeight
                ? "border-primary/50 bg-primary/5 text-primary"
                : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
            )}
          >
            <Dumbbell className="h-4 w-4" />
            {showAddedWeight ? "Added weight" : "Add weight (vest/belt)"}
            {showAddedWeight ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
          </button>
        </div>
      )}

      <div className="flex items-end justify-between gap-4">
        {(weightMode === "weighted-only" || 
          (weightMode === "bodyweight-optional" && !isBodyweight) ||
          (weightMode === "bodyweight-only" && showAddedWeight)) && (
          <SetStepper
            label={weightMode === "bodyweight-only" ? "Added Weight" : "Weight"}
            value={weight}
            onChange={setWeight}
            step={5}
            min={0}
            unit={unit}
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
