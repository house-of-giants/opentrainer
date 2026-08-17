import { useState, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  MessageSquare,
} from "lucide-react-native";
import { CardioSaveBlockedError } from "@opentrainer/lib/cardio-persistence";
import {
  getCardioDisplaySummary,
  type PersistedCardioSummary,
} from "@opentrainer/lib/cardio-display";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RpeSlider } from "./rpe-slider";
import { NoteSheet } from "./note-sheet";
import { SetStepper } from "./set-stepper";
import { useHaptic } from "@/hooks/use-haptic";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

type ExerciseStatus = "completed" | "current" | "upcoming";

export type CardioLogData = {
  durationSeconds: number;
  distance?: number;
  distanceUnit?: "km" | "mi";
  rpe?: number;
  vestWeight?: number;
  vestWeightUnit?: "kg" | "lb";
  intensity?: number;
};

export type PersistedCardioLogData = Omit<CardioLogData, "distanceUnit"> &
  PersistedCardioSummary;

interface CardioExerciseCardProps {
  exerciseName: string;
  primaryMetric: "duration" | "distance";
  status?: ExerciseStatus;
  unit?: "lb" | "kg";
  distanceUnit?: "km" | "mi";
  defaultMinutes?: number;
  note?: string;
  loggedData?: PersistedCardioLogData;
  onLog: (data: CardioLogData) => Promise<void>;
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
  disabled?: boolean;
  formatDisplay?: (value: number) => string;
}

function EditableValue({
  value,
  onChange,
  label,
  min = 0,
  max = 9999,
  step = 1,
  disabled = false,
  formatDisplay,
}: EditableValueProps) {
  const { vibrate } = useHaptic();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const handlePress = () => {
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

  const displayValue = formatDisplay ? formatDisplay(value) : value.toString();

  return (
    <View className="flex-row items-center gap-1">
      <Button
        variant="outline"
        size="lg"
        className="h-12 w-12 px-0"
        textClassName="text-xl font-bold"
        onPress={handleDecrement}
        disabled={disabled || value <= min}
        accessibilityLabel={`Decrease ${label}`}
      >
        −
      </Button>

      <View className="w-16 items-center">
        {isEditing ? (
          <Input
            autoFocus
            selectTextOnFocus
            keyboardType="decimal-pad"
            returnKeyType="done"
            value={inputValue}
            onChangeText={setInputValue}
            onBlur={commitValue}
            onSubmitEditing={commitValue}
            className="h-10 w-full text-center font-mono text-2xl font-bold"
          />
        ) : (
          <Pressable
            onPress={handlePress}
            disabled={disabled}
            className="w-full flex-col items-center rounded-md px-1 py-1 active:bg-muted"
            accessibilityRole="button"
            accessibilityLabel={`Edit ${label}`}
          >
            <Text className="font-mono text-3xl font-bold tabular-nums text-foreground">
              {displayValue}
            </Text>
            <Text className="text-xs text-muted-foreground">{label}</Text>
          </Pressable>
        )}
      </View>

      <Button
        variant="outline"
        size="lg"
        className="h-12 w-12 px-0"
        textClassName="text-xl font-bold"
        onPress={handleIncrement}
        disabled={disabled || value >= max}
        accessibilityLabel={`Increase ${label}`}
      >
        +
      </Button>
    </View>
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
  loggedData,
  onLog,
  onNoteChange,
  onSelect,
}: CardioExerciseCardProps) {
  const { vibrate } = useHaptic();
  const { colors } = useTheme();

  const [minutes, setMinutes] = useState(defaultMinutes);
  const [seconds, setSeconds] = useState(0);
  const [distance, setDistance] = useState(1);
  const [rpe, setRpe] = useState(5);
  const [showEquipment, setShowEquipment] = useState(false);
  const [useVest, setUseVest] = useState(false);
  const [vestWeight, setVestWeight] = useState(unit === "kg" ? 10 : 20);
  const [hasAcknowledgedLog, setHasAcknowledgedLog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [showNoteSheet, setShowNoteSheet] = useState(false);
  const isSavingRef = useRef(false);

  const totalSeconds = minutes * 60 + seconds;
  const canLog = primaryMetric === "duration" ? totalSeconds > 0 : distance > 0;
  const isLogged = loggedData !== undefined || hasAcknowledgedLog;
  const loggedSummary = getCardioDisplaySummary(loggedData, {
    durationSeconds: totalSeconds,
    distance,
    distanceUnit,
    rpe,
  });
  const loggedVestWeight = loggedData?.vestWeight ?? vestWeight;
  const loggedVestWeightUnit = loggedData?.vestWeightUnit ?? unit;
  const hasLoggedVest = loggedData
    ? loggedData.vestWeight !== undefined
    : useVest;

  const isExpanded = status === "current";
  const displayStatus = isLogged && status !== "current" ? "completed" : status;
  const isClickable = status !== "current" && !!onSelect;

  const handleCardPress = () => {
    if (isClickable) {
      vibrate("light");
      onSelect?.();
    }
  };

  const handleLog = async () => {
    if (!canLog || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    setLogError(null);

    try {
      await onLog({
        durationSeconds: totalSeconds,
        distance: primaryMetric === "distance" ? distance : undefined,
        distanceUnit: primaryMetric === "distance" ? distanceUnit : undefined,
        rpe,
        vestWeight: useVest ? vestWeight : undefined,
        vestWeightUnit: useVest ? unit : undefined,
        intensity: rpe,
      });

      setHasAcknowledgedLog(true);
      vibrate("success");
    } catch (error) {
      setLogError(
        error instanceof CardioSaveBlockedError
          ? "The workout is already finishing, so this cardio wasn't saved."
          : "Cardio wasn't saved. Check your connection and try again.",
      );
      vibrate("warning");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
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
    <Pressable
      onPress={isClickable ? handleCardPress : undefined}
      disabled={!isClickable}
      className={cn(
        // shadow-none: see exercise-accordion.tsx (css-interop variable upgrade).
        "rounded-lg border shadow-none",
        displayStatus === "current" && "border-primary/30 bg-card shadow-lg",
        displayStatus === "completed" && "border-transparent bg-muted/20",
        displayStatus === "upcoming" && "border-muted/50 bg-card/50 opacity-70",
      )}
    >
      <View
        className={cn(
          "flex-row items-center justify-between gap-3 p-4",
          displayStatus === "current" && !isLogged && "pb-2",
        )}
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View
            className={cn(
              "h-6 w-6 shrink-0 items-center justify-center rounded",
              displayStatus === "completed" && "bg-primary/20",
              displayStatus === "current" && "bg-primary",
              displayStatus === "upcoming" && "bg-muted",
            )}
          >
            {displayStatus === "completed" ? (
              <Check size={14} color={colors.primary} />
            ) : (
              <Text
                className={cn(
                  "font-mono text-xs font-bold",
                  displayStatus === "current"
                    ? "text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                C
              </Text>
            )}
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text
                numberOfLines={1}
                className={cn(
                  "min-w-0 flex-1 font-semibold text-foreground",
                  displayStatus === "current" && "text-lg",
                  displayStatus === "completed" &&
                    "text-sm text-muted-foreground",
                  displayStatus === "upcoming" && "text-base",
                )}
              >
                {exerciseName}
              </Text>
              {displayStatus === "current" && onNoteChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 px-0"
                  onPress={() => {
                    vibrate("light");
                    setShowNoteSheet(true);
                  }}
                  accessibilityLabel="Add note"
                >
                  <MessageSquare
                    size={14}
                    color={note ? colors.primary : colors.mutedForeground}
                    fill={note ? colors.primary : "none"}
                  />
                </Button>
              )}
            </View>

            {displayStatus === "completed" && isLogged && (
              <Text className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatDuration(loggedSummary.durationSeconds)}
                {primaryMetric === "distance" &&
                loggedSummary.distance !== undefined &&
                loggedSummary.distance > 0 &&
                loggedSummary.distanceUnit !== undefined
                  ? ` · ${loggedSummary.distance} ${loggedSummary.distanceUnit}`
                  : ""}
                {loggedSummary.rpe !== undefined
                  ? ` · RPE ${loggedSummary.rpe}`
                  : ""}
              </Text>
            )}
          </View>
        </View>

        <Text
          className={cn(
            "shrink-0 font-mono text-sm tabular-nums",
            displayStatus === "current"
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {isLogged ? "done" : "—"}
        </Text>
      </View>

      {isExpanded &&
        (isLogged ? (
          <View className="gap-3 px-4 pb-4 pt-2">
            <View className="rounded-md bg-muted/40 p-4">
              <View className="flex-row items-center justify-between">
                <View className="gap-1">
                  <Text className="font-mono text-2xl tabular-nums text-foreground">
                    {formatDuration(loggedSummary.durationSeconds)}
                  </Text>
                  {primaryMetric === "distance" &&
                    loggedSummary.distance !== undefined &&
                    loggedSummary.distance > 0 &&
                    loggedSummary.distanceUnit !== undefined && (
                      <Text className="font-mono text-lg tabular-nums text-muted-foreground">
                        {loggedSummary.distance} {loggedSummary.distanceUnit}
                      </Text>
                    )}
                </View>
                {loggedSummary.rpe !== undefined && (
                  <View className="items-end">
                    <Text className="text-sm text-muted-foreground">RPE</Text>
                    <Text className="font-mono text-2xl tabular-nums text-foreground">
                      {loggedSummary.rpe}
                    </Text>
                  </View>
                )}
              </View>
              {hasLoggedVest && (
                <View className="mt-3 flex-row items-center gap-2 border-t border-border pt-3">
                  <Dumbbell size={16} color={colors.mutedForeground} />
                  <Text className="text-sm text-muted-foreground">
                    Vest: {loggedVestWeight} {loggedVestWeightUnit}
                  </Text>
                </View>
              )}
            </View>
            {note ? (
              <View className="flex-row items-start gap-2">
                <MessageSquare size={16} color={colors.mutedForeground} />
                <Text className="flex-1 text-sm text-muted-foreground">
                  {note}
                </Text>
              </View>
            ) : null}
            <View className="flex-row items-center justify-center pt-2">
              <Check size={20} color={colors.primary} />
              <Text className="ml-2 text-sm font-medium text-muted-foreground">
                Logged
              </Text>
            </View>
          </View>
        ) : (
          <View className="gap-4 px-4 pb-4 pt-2">
            {primaryMetric === "duration" ? (
              <View>
                <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Duration
                </Text>
                <View className="flex-row items-center justify-center gap-2">
                  <EditableValue
                    value={minutes}
                    onChange={setMinutes}
                    label="min"
                    min={0}
                    max={999}
                    step={1}
                    disabled={isSaving}
                  />
                  <Text className="text-2xl font-bold text-foreground">:</Text>
                  <EditableValue
                    value={seconds}
                    onChange={handleSecondsChange}
                    label="sec"
                    min={0}
                    max={59}
                    step={5}
                    disabled={isSaving}
                    formatDisplay={(v) => v.toString().padStart(2, "0")}
                  />
                </View>
              </View>
            ) : (
              <View>
                <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Distance
                </Text>
                <View className="flex-row items-center justify-center">
                  <EditableValue
                    value={distance}
                    onChange={setDistance}
                    label={distanceUnit}
                    min={0}
                    max={999}
                    step={0.5}
                    disabled={isSaving}
                  />
                </View>
              </View>
            )}

            {primaryMetric === "distance" && (
              <View>
                <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Duration (optional)
                </Text>
                <View className="flex-row items-center justify-center gap-2">
                  <EditableValue
                    value={minutes}
                    onChange={setMinutes}
                    label="min"
                    min={0}
                    max={999}
                    step={1}
                    disabled={isSaving}
                  />
                  <Text className="text-xl font-bold text-foreground">:</Text>
                  <EditableValue
                    value={seconds}
                    onChange={handleSecondsChange}
                    label="sec"
                    min={0}
                    max={59}
                    step={5}
                    disabled={isSaving}
                    formatDisplay={(v) => v.toString().padStart(2, "0")}
                  />
                </View>
              </View>
            )}

            <RpeSlider value={rpe} onChange={setRpe} />

            <Pressable
              onPress={() => setShowEquipment(!showEquipment)}
              className="w-full flex-row items-center justify-between rounded-md px-3 py-2 active:bg-muted/30"
              accessibilityRole="button"
            >
              <View className="flex-row items-center gap-2">
                <Dumbbell size={14} color={colors.mutedForeground} />
                <Text className="text-xs uppercase tracking-wide text-muted-foreground">
                  Equipment
                </Text>
              </View>
              {showEquipment ? (
                <ChevronUp size={14} color={colors.mutedForeground} />
              ) : (
                <ChevronDown size={14} color={colors.mutedForeground} />
              )}
            </Pressable>

            {showEquipment && (
              <View className="gap-3 rounded-md bg-muted/20 p-3">
                <Pressable
                  className="flex-row items-center gap-3"
                  onPress={() => setUseVest(!useVest)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: useVest }}
                >
                  <Checkbox checked={useVest} onCheckedChange={setUseVest} />
                  <Text className="text-sm font-medium text-foreground">
                    Weighted Vest
                  </Text>
                </Pressable>

                {useVest && (
                  <View className="pl-8">
                    <SetStepper
                      label="Vest"
                      value={vestWeight}
                      onChange={setVestWeight}
                      step={unit === "lb" ? 5 : 2.5}
                      min={0}
                      unit={unit}
                    />
                  </View>
                )}
              </View>
            )}

            <Button
              size="lg"
              className="mt-2 h-14 w-full"
              textClassName="text-base font-semibold tracking-wide"
              onPress={handleLog}
              disabled={!canLog || isSaving}
            >
              {isSaving ? "SAVING CARDIO..." : "LOG CARDIO"}
            </Button>
            {logError && (
              <Text
                className="text-sm text-destructive"
                accessibilityRole="alert"
              >
                {logError}
              </Text>
            )}
          </View>
        ))}

      {onNoteChange && (
        <NoteSheet
          open={showNoteSheet}
          onOpenChange={setShowNoteSheet}
          exerciseName={exerciseName}
          note={note ?? ""}
          onSave={onNoteChange}
        />
      )}
    </Pressable>
  );
}
