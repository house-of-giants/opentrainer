"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface GoalSettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoal: number;
  onSave: (newGoal: number) => void;
}

export function GoalSettingDialog({
  open,
  onOpenChange,
  currentGoal,
  onSave,
}: GoalSettingDialogProps) {
  const [goal, setGoal] = useState(currentGoal);

  const handleSave = () => {
    onSave(goal);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Weekly Workout Goal</DialogTitle>
          <DialogDescription>
            How many workouts do you want to complete each week?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl font-bold tabular-nums">{goal}</div>
            <div className="text-sm text-muted-foreground">
              workouts per week
            </div>
          </div>

          <Slider
            value={[goal]}
            onValueChange={([value]) => setGoal(value)}
            min={1}
            max={7}
            step={1}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>7</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Goal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
