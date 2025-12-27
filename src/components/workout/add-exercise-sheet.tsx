"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useHaptic } from "@/hooks/use-haptic";

const COMMON_EXERCISES = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull-ups",
  "Dips",
  "Lat Pulldown",
  "Leg Press",
  "Romanian Deadlift",
  "Incline Bench Press",
  "Cable Fly",
  "Tricep Pushdown",
  "Bicep Curl",
  "Lateral Raise",
];

interface AddExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectExercise: (name: string) => void;
}

export function AddExerciseSheet({
  open,
  onOpenChange,
  onSelectExercise,
}: AddExerciseSheetProps) {
  const [customExercise, setCustomExercise] = useState("");
  const { vibrate } = useHaptic();

  const handleSelect = (name: string) => {
    vibrate("medium");
    onSelectExercise(name);
    onOpenChange(false);
    setCustomExercise("");
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customExercise.trim()) {
      handleSelect(customExercise.trim());
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle>Add Exercise</SheetTitle>
          <SheetDescription>
            Select from common exercises or add your own
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <Input
              placeholder="Custom exercise name..."
              value={customExercise}
              onChange={(e) => setCustomExercise(e.target.value)}
              className="h-12"
            />
            <Button
              type="submit"
              size="lg"
              className="h-12 px-6"
              disabled={!customExercise.trim()}
            >
              Add
            </Button>
          </form>

          <div className="grid grid-cols-1 gap-2">
            {COMMON_EXERCISES.map((exercise) => (
              <Button
                key={exercise}
                variant="outline"
                size="lg"
                className="h-14 justify-start text-left"
                onClick={() => handleSelect(exercise)}
              >
                {exercise}
              </Button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
