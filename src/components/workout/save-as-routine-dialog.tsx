"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type SaveAsRoutineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: Id<"workouts">;
  workoutTitle?: string;
  onComplete: () => void;
};

export function SaveAsRoutineDialog({
  open,
  onOpenChange,
  workoutId,
  workoutTitle,
  onComplete,
}: SaveAsRoutineDialogProps) {
  const [name, setName] = useState(workoutTitle ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const createRoutineFromWorkout = useMutation(api.routines.createRoutineFromWorkout);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a routine name");
      return;
    }

    setIsSaving(true);
    try {
      await createRoutineFromWorkout({
        workoutId,
        name: name.trim(),
      });
      toast.success("Routine saved!");
      onOpenChange(false);
      onComplete();
    } catch (error) {
      toast.error("Failed to save routine");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Routine?</DialogTitle>
          <DialogDescription>
            Save this workout as a template to quickly start similar workouts in the future.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="routine-name">Routine Name</Label>
            <Input
              id="routine-name"
              placeholder="e.g., Push Day, Upper Body"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            Skip
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="w-full sm:w-auto"
          >
            {isSaving ? "Saving..." : "Save Routine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
