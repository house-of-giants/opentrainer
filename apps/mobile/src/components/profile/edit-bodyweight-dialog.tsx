import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import { displayWeight, type WeightUnit } from "@opentrainer/lib/units";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

// Port of apps/web/src/components/profile/edit-bodyweight-dialog.tsx.
interface EditBodyweightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeight: number | undefined;
  storedUnit: WeightUnit | undefined;
  preferredUnit: WeightUnit;
}

export function EditBodyweightDialog({
  open,
  onOpenChange,
  currentWeight,
  storedUnit,
  preferredUnit,
}: EditBodyweightDialogProps) {
  const [weight, setWeight] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const updatePreferences = useMutation(api.users.updatePreferences);

  useEffect(() => {
    if (open && currentWeight !== undefined) {
      const fromUnit = storedUnit ?? "lb";
      const converted = displayWeight(currentWeight, fromUnit, preferredUnit);
      setWeight(converted.toString());
    } else if (open) {
      setWeight("");
    }
  }, [open, currentWeight, storedUnit, preferredUnit]);

  const handleSave = async () => {
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    setIsSaving(true);
    try {
      await updatePreferences({
        bodyweight: weightValue,
        bodyweightUnit: preferredUnit,
      });
      toast.success("Bodyweight updated");
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
        <DialogTitle>Bodyweight</DialogTitle>
        <DialogDescription>
          Track your current bodyweight for progress monitoring.
        </DialogDescription>
      </DialogHeader>

      <View className="py-4">
        <View className="flex-row items-center justify-center gap-3">
          <Input
            keyboardType="decimal-pad"
            placeholder="Enter weight"
            value={weight}
            onChangeText={setWeight}
            className="h-14 w-32 text-center text-2xl"
            accessibilityLabel="Bodyweight"
            autoFocus
          />
          <Text className="text-lg font-medium text-muted-foreground">
            {preferredUnit}
          </Text>
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
