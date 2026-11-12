"use client";

import type { WeightUnit } from "@opentrainer/lib/units";
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as WeightUnit)}
        aria-labelledby="units-label"
        className="grid-cols-2"
      >
        {UNITS.map((unit) => (
          <FieldLabel key={unit.id}>
            <Field orientation="horizontal">
              <RadioGroupItem value={unit.id} />
              <FieldTitle>{unit.label}</FieldTitle>
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </div>
  );
}
