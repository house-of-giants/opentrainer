import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import {
  Dumbbell,
  Scale,
  Target,
  Timer,
  TrendingUp,
  type LucideIcon,
} from "lucide-react-native";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/profile/edit-goals-dialog.tsx.
type Goal = "strength" | "hypertrophy" | "endurance" | "weight_loss" | "general_fitness";

const GOALS: { id: Goal; label: string; icon: LucideIcon }[] = [
  { id: "strength", label: "Strength", icon: Dumbbell },
  { id: "hypertrophy", label: "Hypertrophy", icon: TrendingUp },
  { id: "endurance", label: "Endurance", icon: Timer },
  { id: "weight_loss", label: "Weight Loss", icon: Scale },
  { id: "general_fitness", label: "General Fitness", icon: Target },
];

interface EditGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoals: Goal[];
}

export function EditGoalsDialog({
  open,
  onOpenChange,
  currentGoals,
}: EditGoalsDialogProps) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<Goal[]>(currentGoals);
  const [isSaving, setIsSaving] = useState(false);
  const updateOnboarding = useMutation(api.users.updateOnboarding);

  useEffect(() => {
    if (open) {
      setSelected(currentGoals);
    }
  }, [open, currentGoals]);

  const toggleGoal = (goal: Goal) => {
    setSelected((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one goal");
      return;
    }

    setIsSaving(true);
    try {
      await updateOnboarding({ goals: selected });
      toast.success("Goals updated");
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
        <DialogTitle>Training Goals</DialogTitle>
        <DialogDescription>
          What are you training for? Select all that apply.
        </DialogDescription>
      </DialogHeader>

      <View className="flex-row flex-wrap gap-2 py-4">
        {GOALS.map((goal) => {
          const isSelected = selected.includes(goal.id);
          const Icon = goal.icon;
          return (
            // Web renders a visually-hidden Checkbox inside a <Label>; the tile
            // itself is the control here, so the checkbox role moves onto it.
            <Pressable
              key={goal.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              onPress={() => toggleGoal(goal.id)}
              className={cn(
                "w-[48%] items-center gap-2 rounded-lg border p-4",
                isSelected ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <Icon size={24} color={colors.foreground} />
              <Text className="text-sm font-medium text-foreground">
                {goal.label}
              </Text>
            </Pressable>
          );
        })}
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
