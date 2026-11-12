"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type OnboardingPath = "bring_program" | "from_scratch" | "generate";

const PATHS: Array<{ id: OnboardingPath; label: string; description: string }> = [
  {
    id: "bring_program",
    label: "Bring my program",
    description: "Import your workout history from a CSV, or enter the routine you already run.",
  },
  {
    id: "from_scratch",
    label: "Start from scratch",
    description: "Build a routine one exercise at a time.",
  },
  {
    id: "generate",
    label: "Generate one",
    description: "Answer a few questions about your goals and equipment.",
  },
];

interface PathStepProps {
  selected: OnboardingPath | null;
  onSelect: (path: OnboardingPath) => void;
}

export function PathStep({ selected, onSelect }: PathStepProps) {
  return (
    <div className="space-y-6">
      <h1 id="path-label" className="text-center text-2xl font-bold">
        How do you want to start?
      </h1>
      <RadioGroup
        value={selected ?? ""}
        onValueChange={(next) => onSelect(next as OnboardingPath)}
        aria-labelledby="path-label"
      >
        {PATHS.map((path) => (
          <FieldLabel key={path.id}>
            <Field orientation="horizontal">
              <RadioGroupItem value={path.id} />
              <FieldContent>
                <FieldTitle className="text-base">{path.label}</FieldTitle>
                <FieldDescription>{path.description}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </div>
  );
}
