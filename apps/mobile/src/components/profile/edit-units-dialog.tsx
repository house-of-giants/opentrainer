import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/toast";

// Port of apps/web/src/components/profile/edit-units-dialog.tsx.
type WeightUnit = "lb" | "kg";

const UNITS: { id: WeightUnit; title: string; description: string }[] = [
  { id: "lb", title: "Imperial (lb)", description: "Pounds" },
  { id: "kg", title: "Metric (kg)", description: "Kilograms" },
];

interface EditUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUnit: WeightUnit | undefined;
}

export function EditUnitsDialog({
  open,
  onOpenChange,
  currentUnit,
}: EditUnitsDialogProps) {
  const [unit, setUnit] = useState<WeightUnit>(currentUnit ?? "lb");
  const [isSaving, setIsSaving] = useState(false);
  const updatePreferences = useMutation(api.users.updatePreferences);

  useEffect(() => {
    if (open) {
      setUnit(currentUnit ?? "lb");
    }
  }, [open, currentUnit]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({
        preferredUnits: unit,
      });
      toast.success("Units updated");
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
        <DialogTitle>Weight Units</DialogTitle>
        <DialogDescription>
          Choose your preferred unit for tracking weights.
        </DialogDescription>
      </DialogHeader>

      <RadioGroup
        value={unit}
        onValueChange={(value) => setUnit(value as WeightUnit)}
        className="py-4"
      >
        {UNITS.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            className="flex-row items-center gap-3"
            onPress={() => setUnit(option.id)}
          >
            <RadioGroupItem value={option.id} />
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">
                {option.title}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {option.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </RadioGroup>

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
