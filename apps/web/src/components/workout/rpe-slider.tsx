"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/use-haptic";

const RPE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Very Light", color: "text-green-500" },
  2: { label: "Light", color: "text-green-500" },
  3: { label: "Light", color: "text-green-400" },
  4: { label: "Moderate", color: "text-yellow-500" },
  5: { label: "Moderate", color: "text-yellow-500" },
  6: { label: "Somewhat Hard", color: "text-orange-400" },
  7: { label: "Hard", color: "text-orange-500" },
  8: { label: "Very Hard", color: "text-red-400" },
  9: { label: "Very Hard", color: "text-red-500" },
  10: { label: "Max Effort", color: "text-red-600" },
};

interface RpeSliderProps {
  value?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function RpeSlider({ value = 5, onChange, className }: RpeSliderProps) {
  const { vibrate } = useHaptic();
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (values: number[]) => {
    const newValue = values[0];
    if (newValue !== localValue) {
      vibrate("light");
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const rpeInfo = RPE_LABELS[localValue] ?? RPE_LABELS[5];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Intensity (RPE)
        </span>
        <div className="text-right">
          <span className={cn("text-2xl font-bold font-mono", rpeInfo.color)}>
            {localValue}
          </span>
          <span className="text-xs text-muted-foreground ml-1">/10</span>
        </div>
      </div>

      <Slider
        value={[localValue]}
        onValueChange={handleChange}
        min={1}
        max={10}
        step={1}
        className="py-2"
      />

      <p className={cn("text-sm text-center font-medium", rpeInfo.color)}>
        {rpeInfo.label}
      </p>
    </div>
  );
}
