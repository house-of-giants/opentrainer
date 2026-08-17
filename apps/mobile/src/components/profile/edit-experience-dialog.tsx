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

// Port of apps/web/src/components/profile/edit-experience-dialog.tsx.
type ExperienceLevel = "beginner" | "intermediate" | "advanced";

const LEVELS: { id: ExperienceLevel; label: string; description: string }[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Less than 1 year of consistent training",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "1-3 years, comfortable with main lifts",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "3+ years, structured programming experience",
  },
];

interface EditExperienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLevel: ExperienceLevel | undefined;
}

export function EditExperienceDialog({
  open,
  onOpenChange,
  currentLevel,
}: EditExperienceDialogProps) {
  const [selected, setSelected] = useState<ExperienceLevel | undefined>(currentLevel);
  const [isSaving, setIsSaving] = useState(false);
  const updateOnboarding = useMutation(api.users.updateOnboarding);

  useEffect(() => {
    if (open) {
      setSelected(currentLevel);
    }
  }, [open, currentLevel]);

  const handleSave = async () => {
    if (!selected) {
      toast.error("Select an experience level");
      return;
    }

    setIsSaving(true);
    try {
      await updateOnboarding({ experienceLevel: selected });
      toast.success("Experience level updated");
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
        <DialogTitle>Experience Level</DialogTitle>
        <DialogDescription>How long have you been lifting?</DialogDescription>
      </DialogHeader>

      <RadioGroup
        value={selected ?? null}
        onValueChange={(value) => setSelected(value as ExperienceLevel)}
        className="py-4"
      >
        {LEVELS.map((level) => (
          // Web wraps each row in a <FieldLabel>, which forwards clicks to the
          // radio; on native the row Pressable does that directly.
          <Pressable
            key={level.id}
            accessibilityRole="button"
            className="flex-row items-center gap-3"
            onPress={() => setSelected(level.id)}
          >
            <RadioGroupItem value={level.id} />
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">
                {level.label}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {level.description}
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
