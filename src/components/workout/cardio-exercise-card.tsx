"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RpeSlider } from "./rpe-slider";
import { useHaptic } from "@/hooks/use-haptic";
import { ChevronDown, ChevronUp, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardioExerciseCardProps {
  exerciseName: string;
  primaryMetric: "duration" | "distance";
  unit?: "lb" | "kg";
  distanceUnit?: "km" | "mi";
  defaultMinutes?: number;
  onLog: (data: {
    durationSeconds: number;
    distance?: number;
    distanceUnit?: "km" | "mi";
    rpe?: number;
    vestWeight?: number;
    vestWeightUnit?: "kg" | "lb";
    intensity?: number;
  }) => void;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface EditableValueProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  formatDisplay?: (value: number) => string;
}

function EditableValue({
  value,
  onChange,
  label,
  min = 0,
  max = 9999,
  step = 1,
  formatDisplay,
}: EditableValueProps) {
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

  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  const handleClick = useCallback(() => {
    vibrate("light");
    setIsEditing(true);
    setInputValue(value.toString());
  }, [vibrate, value]);

  const commitValue = useCallback(() => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
      vibrate("medium");
    }
    setIsEditing(false);
  }, [inputValue, max, min, onChange, vibrate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitValue();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue(value.toString());
    }
  }, [commitValue, value]);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(min, value - step);
    if (newValue !== value) {
      vibrate("light");
      onChange(newValue);
    }
  }, [min, value, step, vibrate, onChange]);

  const handleIncrement = useCallback(() => {
    const newValue = Math.min(max, value + step);
    if (newValue !== value) {
      vibrate("light");
      onChange(newValue);
    }
  }, [max, value, step, vibrate, onChange]);

  const displayValue = formatDisplay ? formatDisplay(value) : value.toString();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="lg"
        className="h-12 w-12 text-xl font-bold"
        onClick={handleDecrement}
        disabled={value <= min}
      >
        −
      </Button>

      <div className="w-16 text-center">
        {isEditing ? (
          <Input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={commitValue}
            onKeyDown={handleKeyDown}
            className="h-10 w-full text-center text-2xl font-mono font-bold tabular-nums"
            min={min}
            max={max}
          />
        ) : (
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              "flex w-full flex-col items-center rounded-md px-1 py-1",
              "hover:bg-muted/50 active:bg-muted transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring"
            )}
          >
            <span className="text-3xl font-mono font-bold tabular-nums">
              {displayValue}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </button>
        )}
      </div>

      <Button
        variant="outline"
        size="lg"
        className="h-12 w-12 text-xl font-bold"
        onClick={handleIncrement}
        disabled={value >= max}
      >
        +
      </Button>
    </div>
  );
}

export function CardioExerciseCard({
  exerciseName,
  primaryMetric,
  unit = "lb",
  distanceUnit = "mi",
  defaultMinutes = 20,
  onLog,
}: CardioExerciseCardProps) {
  const { vibrate } = useHaptic();

  const [minutes, setMinutes] = useState(defaultMinutes);
  const [seconds, setSeconds] = useState(0);
  const [distance, setDistance] = useState(1);
  const [rpe, setRpe] = useState(5);
  const [showEquipment, setShowEquipment] = useState(false);
  const [useVest, setUseVest] = useState(false);
  const [vestWeight, setVestWeight] = useState(20);
  const [isLogged, setIsLogged] = useState(false);

  const totalSeconds = minutes * 60 + seconds;
  const canLog = primaryMetric === "duration" ? totalSeconds > 0 : distance > 0;

  const handleLog = () => {
    if (!canLog) return;
    vibrate("success");

    onLog({
      durationSeconds: totalSeconds,
      distance: primaryMetric === "distance" || distance > 0 ? distance : undefined,
      distanceUnit,
      rpe,
      vestWeight: useVest ? vestWeight : undefined,
      vestWeightUnit: useVest ? unit : undefined,
      intensity: rpe,
    });

    setIsLogged(true);
  };

  const handleSecondsChange = (newSeconds: number) => {
    if (newSeconds >= 60) {
      setMinutes((m) => m + Math.floor(newSeconds / 60));
      setSeconds(newSeconds % 60);
    } else if (newSeconds < 0) {
      if (minutes > 0) {
        setMinutes((m) => m - 1);
        setSeconds(60 + newSeconds);
      } else {
        setSeconds(0);
      }
    } else {
      setSeconds(newSeconds);
    }
  };

  if (isLogged) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{exerciseName}</h3>
          <span className="text-sm text-muted-foreground">Logged</span>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-4">
            <span className="font-mono tabular-nums">
              {formatDuration(totalSeconds)}
            </span>
            {distance > 0 && (
              <span className="font-mono tabular-nums">
                {distance} {distanceUnit}
              </span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">RPE {rpe}</span>
        </div>
        {useVest && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell className="h-4 w-4" />
            <span>Vest: {vestWeight} {unit}</span>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{exerciseName}</h3>
      </div>

      {primaryMetric === "duration" ? (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Duration
          </label>
          <div className="flex items-center justify-center gap-2">
            <EditableValue
              value={minutes}
              onChange={setMinutes}
              label="min"
              min={0}
              max={999}
              step={1}
            />

            <span className="text-2xl font-bold">:</span>

            <EditableValue
              value={seconds}
              onChange={handleSecondsChange}
              label="sec"
              min={0}
              max={59}
              step={5}
              formatDisplay={(v) => v.toString().padStart(2, "0")}
            />
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Distance
          </label>
          <div className="flex items-center justify-center">
            <EditableValue
              value={distance}
              onChange={setDistance}
              label={distanceUnit}
              min={0}
              max={999}
              step={0.5}
            />
          </div>
        </div>
      )}

      {primaryMetric === "distance" && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Duration (optional)
          </label>
          <div className="flex items-center justify-center gap-2">
            <EditableValue
              value={minutes}
              onChange={setMinutes}
              label="min"
              min={0}
              max={999}
              step={1}
            />
            <span className="text-xl font-bold">:</span>
            <EditableValue
              value={seconds}
              onChange={handleSecondsChange}
              label="sec"
              min={0}
              max={59}
              step={5}
              formatDisplay={(v) => v.toString().padStart(2, "0")}
            />
          </div>
        </div>
      )}

      <div className="mb-6">
        <RpeSlider value={rpe} onChange={setRpe} />
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowEquipment(!showEquipment)}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-3 py-2",
            "text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          )}
        >
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            <span>Equipment</span>
          </div>
          {showEquipment ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showEquipment && (
          <div className="mt-3 space-y-3 rounded-md bg-muted/30 p-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={useVest}
                onChange={(e) => setUseVest(e.target.checked)}
                className="h-5 w-5 rounded border-input"
              />
              <span className="text-sm font-medium">Weighted Vest</span>
            </label>

            {useVest && (
              <div className="flex items-center gap-2 pl-8">
                <Input
                  type="number"
                  value={vestWeight}
                  onChange={(e) => setVestWeight(Number(e.target.value))}
                  className="h-10 w-20 text-center font-mono"
                  min={0}
                />
                <span className="text-sm text-muted-foreground">{unit}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Button
        size="lg"
        className="h-14 w-full text-lg"
        onClick={handleLog}
        disabled={!canLog}
      >
        Log Cardio
      </Button>
    </Card>
  );
}
