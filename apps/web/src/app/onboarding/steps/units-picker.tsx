"use client";

import type { WeightUnit } from "@opentrainer/lib/units";
import { cn } from "@/lib/utils";

const UNITS: Array<{ id: WeightUnit; label: string }> = [
  { id: "kg", label: "Kilograms (kg)" },
  { id: "lb", label: "Pounds (lb)" },
];

interface UnitsPickerProps {
  value: WeightUnit;
  onChange: (unit: WeightUnit) => void;
}

export function UnitsPicker({ value, onChange }: UnitsPickerProps) {
  return (
    <div className="space-y-3">
      <p id="units-label" className="font-medium">
        Weight units
      </p>
      <div role="radiogroup" aria-labelledby="units-label" className="grid grid-cols-2 gap-3">
        {UNITS.map((unit) => (
          <button
            key={unit.id}
            type="button"
            role="radio"
            aria-checked={value === unit.id}
            onClick={() => onChange(unit.id)}
            className={cn(
              "rounded-xl border-2 p-4 font-medium transition-all",
              value === unit.id
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted/50 hover:border-muted-foreground/30"
            )}
          >
            {unit.label}
          </button>
        ))}
      </div>
    </div>
  );
}
