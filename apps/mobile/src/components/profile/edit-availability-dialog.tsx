import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/toast";

// Port of apps/web/src/components/profile/edit-availability-dialog.tsx.
interface EditAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDays: number | undefined;
  currentDuration: number | undefined;
}

export function EditAvailabilityDialog({
  open,
  onOpenChange,
  currentDays,
  currentDuration,
}: EditAvailabilityDialogProps) {
  const [days, setDays] = useState(currentDays ?? 4);
  const [duration, setDuration] = useState(currentDuration ?? 60);
  const [isSaving, setIsSaving] = useState(false);
  const updateOnboarding = useMutation(api.users.updateOnboarding);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateOnboarding({
        weeklyAvailability: days,
        sessionDuration: duration,
      });
      toast.success("Availability updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Training Availability</DialogTitle>
        <DialogDescription>How often can you train?</DialogDescription>
      </DialogHeader>

      <View className="gap-8 py-4">
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground">
              Days per week
            </Text>
            <Text className="text-2xl font-bold text-foreground">{days}</Text>
          </View>
          <Slider
            value={days}
            onValueChange={setDays}
            min={1}
            max={7}
            step={1}
            testID="availability-days-slider"
          />
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">1</Text>
            <Text className="text-xs text-muted-foreground">7</Text>
          </View>
        </View>

        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground">
              Session length
            </Text>
            <Text className="text-2xl font-bold text-foreground">
              {`${duration} min`}
            </Text>
          </View>
          <Slider
            value={duration}
            onValueChange={setDuration}
            min={30}
            max={120}
            step={15}
            testID="availability-duration-slider"
          />
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">30 min</Text>
            <Text className="text-xs text-muted-foreground">120 min</Text>
          </View>
        </View>
      </View>

      <DialogFooter>
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onPress={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
