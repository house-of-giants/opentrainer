"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";

interface SetStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  unit?: string;
  formatValue?: (value: number) => string;
}

export function SetStepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  max = 9999,
  unit,
  formatValue,
}: SetStepperProps) {
  const { vibrate } = useHaptic();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    if (newValue !== value) {
      vibrate("light");
      onChange(newValue);
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    if (newValue !== value) {
      vibrate("light");
      onChange(newValue);
    }
  };

  const handleValueClick = () => {
    vibrate("light");
    setInputValue(value.toString());
    setIsEditing(true);
  };

  const commitValue = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
      vibrate("medium");
    }
    setIsEditing(false);
  };

  const handleInputBlur = () => {
    commitValue();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitValue();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 w-11 text-xl font-bold"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          −
        </Button>

        <div className="flex min-w-[64px] flex-col items-center justify-center">
          {isEditing ? (
            <Input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="h-10 w-20 text-center text-xl font-mono font-bold tabular-nums"
              min={min}
              max={max}
            />
          ) : (
            <button
              type="button"
              onClick={handleValueClick}
              className={cn(
                "flex flex-col items-center rounded-md px-2 py-0.5",
                "hover:bg-muted/50 active:bg-muted transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            >
              <span className="text-2xl font-mono font-bold tabular-nums">{displayValue}</span>
              {unit && <span className="text-[10px] text-muted-foreground -mt-0.5">{unit}</span>}
            </button>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 w-11 text-xl font-bold"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          +
        </Button>
      </div>
    </div>
  );
}
