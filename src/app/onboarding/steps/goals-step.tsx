"use client";

import { cn } from "@/lib/utils";
import {
  Dumbbell,
  TrendingUp,
  Timer,
  Scale,
  Target,
  type LucideIcon,
} from "lucide-react";

export type Goal = "strength" | "hypertrophy" | "endurance" | "weight_loss" | "general_fitness";

const GOALS: Array<{ id: Goal; label: string; icon: LucideIcon }> = [
  { id: "strength", label: "Strength", icon: Dumbbell },
  { id: "hypertrophy", label: "Hypertrophy", icon: TrendingUp },
  { id: "endurance", label: "Endurance", icon: Timer },
  { id: "weight_loss", label: "Weight Loss", icon: Scale },
  { id: "general_fitness", label: "General Fitness", icon: Target },
];

interface GoalsStepProps {
  selected: Goal[];
  onSelect: (goals: Goal[]) => void;
}

export function GoalsStep({ selected, onSelect }: GoalsStepProps) {
  const toggleGoal = (goal: Goal) => {
    if (selected.includes(goal)) {
      onSelect(selected.filter((g) => g !== goal));
    } else {
      onSelect([...selected, goal]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">What are you training for?</h1>
        <p className="mt-2 text-muted-foreground">
          Select all that apply. This helps us personalize your experience.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GOALS.map((goal) => (
          <button
            key={goal.id}
            type="button"
            onClick={() => toggleGoal(goal.id)}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all",
              selected.includes(goal.id)
                ? "border-primary bg-primary/10 scale-[1.02]"
                : "border-border hover:bg-muted/50 hover:border-muted-foreground/30"
            )}
          >
            <goal.icon className={cn(
              "h-8 w-8",
              selected.includes(goal.id) ? "text-primary" : "text-muted-foreground"
            )} />
            <span className="font-medium">{goal.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
