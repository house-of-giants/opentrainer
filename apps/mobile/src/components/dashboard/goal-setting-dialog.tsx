import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

// Port of apps/web/src/components/dashboard/goal-setting-dialog.tsx.
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
  // Radix unmounts its content on close, so the web version's `useState(
  // currentGoal)` re-seeds on every open. RN's Modal keeps the tree mounted,
  // so the slider value is a nullable draft that falls back to the prop —
  // clearing it on close reproduces the web's re-seed without an effect.
  const [draft, setDraft] = useState<number | null>(null);
  const goal = draft ?? currentGoal;

  const handleOpenChange = (next: boolean) => {
    if (!next) setDraft(null);
    onOpenChange(next);
  };

  const handleSave = () => {
    onSave(goal);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogHeader>
        <DialogTitle>Weekly Workout Goal</DialogTitle>
        <DialogDescription>
          How many workouts do you want to complete each week?
        </DialogDescription>
      </DialogHeader>

      <View className="gap-6 py-4">
        <View className="items-center gap-4">
          <Text className="text-5xl font-bold text-foreground">{goal}</Text>
          <Text className="text-sm text-muted-foreground">workouts per week</Text>
        </View>

        <Slider
          value={goal}
          onValueChange={setDraft}
          min={1}
          max={7}
          step={1}
          testID="goal-slider"
        />

        <View className="flex-row justify-between">
          <Text className="text-xs text-muted-foreground">1</Text>
          <Text className="text-xs text-muted-foreground">7</Text>
        </View>
      </View>

      <DialogFooter>
        <Button variant="outline" onPress={() => handleOpenChange(false)}>
          Cancel
        </Button>
        <Button onPress={handleSave}>Save Goal</Button>
      </DialogFooter>
    </Dialog>
  );
}
