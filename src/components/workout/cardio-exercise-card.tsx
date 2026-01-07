"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RpeSlider } from "./rpe-slider";
import { NoteSheet } from "./note-sheet";
import { useHaptic } from "@/hooks/use-haptic";
import { Check, ChevronDown, ChevronUp, Dumbbell, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type ExerciseStatus = "completed" | "current" | "upcoming";

interface CardioExerciseCardProps {
  exerciseName: string;
  primaryMetric: "duration" | "distance";
  status?: ExerciseStatus;
  unit?: "lb" | "kg";
  distanceUnit?: "km" | "mi";
  defaultMinutes?: number;
  note?: string;
  onLog: (data: {
    durationSeconds: number;
    distance?: number;
    distanceUnit?: "km" | "mi";
    rpe?: number;
    vestWeight?: number;
    vestWeightUnit?: "kg" | "lb";
    intensity?: number;
  }) => void;
  onNoteChange?: (note: string) => void;
  onSelect?: () => void;
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
  status = "current",
  unit = "lb",
  distanceUnit = "mi",
  defaultMinutes = 20,
  note,
  onLog,
  onNoteChange,
  onSelect,
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
  const [showNoteSheet, setShowNoteSheet] = useState(false);

  const totalSeconds = minutes * 60 + seconds;
  const canLog = primaryMetric === "duration" ? totalSeconds > 0 : distance > 0;

  const isExpanded = status === "current";
  const displayStatus = isLogged && status !== "current" ? "completed" : status;
  const isClickable = status !== "current" && onSelect;

  const handleCardClick = () => {
    if (isClickable) {
      vibrate("light");
      onSelect?.();
    }
  };

  const handleLog = () => {
    if (!canLog) return;
    vibrate("success");

    onLog({
      durationSeconds: totalSeconds,
      distance: primaryMetric === "distance" ? distance : undefined,
      distanceUnit: primaryMetric === "distance" ? distanceUnit : undefined,
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

  return (
    <div
      onClick={isClickable ? handleCardClick : undefined}
      className={cn(
        "rounded-lg border transition-all duration-300 ease-out",
        displayStatus === "current" && [
          "bg-card shadow-lg",
          "border-primary/30",
          "ring-1 ring-primary/10",
        ],
        displayStatus === "completed" && [
          "bg-muted/20 border-transparent",
          isClickable && "hover:bg-muted/30 hover:border-muted cursor-pointer",
        ],
        displayStatus === "upcoming" && [
          "bg-card/50 border-muted/50 opacity-70",
          isClickable && "hover:opacity-90 hover:border-muted cursor-pointer",
        ]
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 p-4",
          displayStatus === "current" && !isLogged && "pb-2"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded",
              "font-mono text-xs font-bold",
              "transition-colors duration-200",
              displayStatus === "completed" && "bg-primary/20 text-primary",
              displayStatus === "current" && "bg-primary text-primary-foreground",
              displayStatus === "upcoming" && "bg-muted text-muted-foreground"
            )}
          >
            {displayStatus === "completed" ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <span>C</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "font-semibold truncate transition-all duration-200",
                  displayStatus === "current" && "text-lg",
                  displayStatus === "completed" && "text-sm text-muted-foreground",
                  displayStatus === "upcoming" && "text-base"
                )}
              >
                {exerciseName}
              </h3>
              {displayStatus === "current" && onNoteChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    vibrate("light");
                    setShowNoteSheet(true);
                  }}
                >
                  <MessageSquare
                    className={cn(
                      "h-3.5 w-3.5",
                      note ? "fill-primary text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="sr-only">Add note</span>
                </Button>
              )}
            </div>

            {displayStatus === "completed" && isLogged && (
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {formatDuration(totalSeconds)}
                {distance > 0 && ` · ${distance} ${distanceUnit}`}
                {` · RPE ${rpe}`}
              </span>
            )}
          </div>
        </div>

        <div
          className={cn(
            "shrink-0 font-mono text-sm tabular-nums",
            displayStatus === "completed" && "text-muted-foreground",
            displayStatus === "current" && "text-foreground",
            displayStatus === "upcoming" && "text-muted-foreground"
          )}
        >
          {isLogged ? "done" : "—"}
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          {isLogged ? (
            <div className="space-y-3 px-4 pb-4 pt-2">
              <div className="rounded-md bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-mono text-2xl tabular-nums">
                      {formatDuration(totalSeconds)}
                    </div>
                    {distance > 0 && (
                      <div className="font-mono text-lg tabular-nums text-muted-foreground">
                        {distance} {distanceUnit}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">RPE</div>
                    <div className="font-mono text-2xl tabular-nums">{rpe}</div>
                  </div>
                </div>
                {useVest && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
                    <Dumbbell className="h-4 w-4" />
                    <span>Vest: {vestWeight} {unit}</span>
                  </div>
                )}
              </div>
              {note && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{note}</span>
                </div>
              )}
              <div className="flex items-center justify-center pt-2">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span className="text-sm font-medium text-muted-foreground">Logged</span>
              </div>
            </div>
          ) : (
          <div className="space-y-4 px-4 pb-4 pt-2">
            {primaryMetric === "duration" ? (
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
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

            <div>
              <RpeSlider value={rpe} onChange={setRpe} />
            </div>

            <button
              type="button"
              onClick={() => setShowEquipment(!showEquipment)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2",
                "text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
              )}
            >
              <div className="flex items-center gap-2">
                <Dumbbell className="h-3.5 w-3.5" />
                <span className="uppercase tracking-wide">Equipment</span>
              </div>
              {showEquipment ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showEquipment && (
              <div className="space-y-3 rounded-md bg-muted/20 p-3">
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

            <Button
              size="lg"
              className={cn(
                "mt-2 h-14 w-full text-base font-semibold tracking-wide",
                "transition-all duration-200"
              )}
              onClick={handleLog}
              disabled={!canLog}
            >
              LOG CARDIO
            </Button>
          </div>
          )}
        </div>
      </div>

      {onNoteChange && (
        <NoteSheet
          open={showNoteSheet}
          onOpenChange={setShowNoteSheet}
          exerciseName={exerciseName}
          note={note ?? ""}
          onSave={onNoteChange}
        />
      )}
    </div>
  );
}
