import { useState } from "react";
import { View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

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

  const createRoutineFromWorkout = useMutation(
    api.routines.createRoutineFromWorkout,
  );

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
      <DialogHeader>
        <DialogTitle>Save as Routine?</DialogTitle>
        <DialogDescription>
          Save this workout as a template to quickly start similar workouts in
          the future.
        </DialogDescription>
      </DialogHeader>

      <View className="gap-4 py-4">
        <View className="gap-2">
          <Label>Routine Name</Label>
          <Input
            placeholder="e.g., Push Day, Upper Body"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>
      </View>

      <DialogFooter>
        <Button variant="ghost" onPress={handleSkip} disabled={isSaving}>
          Skip
        </Button>
        <Button onPress={handleSave} disabled={isSaving || !name.trim()}>
          {isSaving ? "Saving..." : "Save Routine"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
