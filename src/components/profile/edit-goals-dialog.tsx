"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dumbbell,
  TrendingUp,
  Timer,
  Scale,
  Target,
  type LucideIcon,
} from "lucide-react";

type Goal = "strength" | "hypertrophy" | "endurance" | "weight_loss" | "general_fitness";

const GOALS: Array<{ id: Goal; label: string; icon: LucideIcon }> = [
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
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Training Goals</DialogTitle>
          <DialogDescription>
            What are you training for? Select all that apply.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-4">
          {GOALS.map((goal) => {
            const isSelected = selected.includes(goal.id);
            return (
              <Label
                key={goal.id}
                htmlFor={goal.id}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <Checkbox
                  id={goal.id}
                  checked={isSelected}
                  onCheckedChange={() => toggleGoal(goal.id)}
                  className="sr-only"
                />
                <goal.icon className="h-6 w-6" />
                <span className="text-sm font-medium">{goal.label}</span>
              </Label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
