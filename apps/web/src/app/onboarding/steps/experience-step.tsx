"use client";

import { cn } from "@/lib/utils";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

const LEVELS: Array<{ id: ExperienceLevel; label: string; description: string }> = [
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

interface ExperienceStepProps {
  selected: ExperienceLevel | null;
  onSelect: (level: ExperienceLevel) => void;
}

export function ExperienceStep({ selected, onSelect }: ExperienceStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">How long have you been lifting?</h1>
        <p className="mt-2 text-muted-foreground">
          This helps us tailor recommendations to your level.
        </p>
      </div>

      <div className="space-y-3">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            type="button"
            onClick={() => onSelect(level.id)}
            className={cn(
              "w-full rounded-xl border-2 p-5 text-left transition-all",
              selected === level.id
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted/50 hover:border-muted-foreground/30"
            )}
          >
            <div className="font-semibold text-lg">{level.label}</div>
            <div className="text-sm text-muted-foreground mt-1">{level.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
