import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Shuffle,
  Dumbbell,
  User,
} from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { SetStepper } from "./set-stepper";
import { RpeSelector } from "./rpe-selector";
import { NoteSheet } from "./note-sheet";
import { useHaptic } from "@/hooks/use-haptic";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

type ExerciseStatus = "completed" | "current" | "upcoming";

interface SetData {
  entryId?: string;
  setNumber: number;
  reps: number;
  weight: number;
  unit: "lb" | "kg";
  isBodyweight?: boolean;
  rpe?: number | null;
}

type WeightMode = "weighted-only" | "bodyweight-only" | "bodyweight-optional";

function getWeightMode(equipment?: string[]): WeightMode {
  if (!equipment || equipment.length === 0) {
    return "bodyweight-optional";
  }
  const hasBodyweight = equipment.includes("bodyweight");
  const hasOtherEquipment = equipment.some((e) => e !== "bodyweight");

  if (hasBodyweight && !hasOtherEquipment) {
    return "bodyweight-only";
  }
  if (hasBodyweight && hasOtherEquipment) {
    return "bodyweight-optional";
  }
  return "weighted-only";
}

interface GhostSetData {
  weight: number;
  reps: number;
  rpe: number | null;
  date: string;
  unit: "lb" | "kg";
}

interface ProgressionSuggestionData {
  type: "increase_weight" | "increase_reps" | "hold" | "deload";
  targetWeight: number | null;
  targetReps: number | null;
  reasoning: string | null;
}

interface ExerciseAccordionProps {
  exerciseName: string;
  sets: SetData[];
  status: ExerciseStatus;
  equipment?: string[];
  defaultWeight?: number;
  defaultReps?: number;
  unit?: "lb" | "kg";
  targetSets?: number;
  targetReps?: string;
  note?: string;
  lastSession?: GhostSetData;
  progressionSuggestion?: ProgressionSuggestionData;
  onAddSet: (
    set: Omit<SetData, "setNumber" | "entryId"> & { rpe?: number | null },
  ) => void;
  onEditSet?: (set: SetData) => void;
  onSwap?: () => void;
  onNoteChange?: (note: string) => void;
  onSelect?: () => void;
}

function SegmentedProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <View className="flex-row gap-0.5">
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={cn(
            "h-1.5 w-3",
            i === 0 && "rounded-l-sm",
            i === total - 1 && "rounded-r-sm",
            i < current ? "bg-primary" : "bg-muted-foreground/20",
          )}
        />
      ))}
    </View>
  );
}

function SetRowCompact({ sets }: { sets: SetData[] }) {
  if (sets.length === 0) return null;

  const weight = sets[0].weight;
  const unit = sets[0].unit;
  const isBodyweight = sets[0].isBodyweight;
  const reps = sets.map((s) => s.reps).join(",");

  const weightDisplay =
    isBodyweight && weight === 0
      ? "BW"
      : isBodyweight && weight > 0
        ? `BW+${weight}`
        : `${weight}`;

  return (
    <Text className="font-mono text-xs tabular-nums text-muted-foreground">
      {weightDisplay}
      {!isBodyweight || weight > 0 ? ` ${unit}` : ""} x {reps}
    </Text>
  );
}

function GhostSetBox({
  lastSession,
  suggestion,
  isCompact,
  onToggle,
}: {
  lastSession: GhostSetData;
  suggestion?: ProgressionSuggestionData;
  isCompact?: boolean;
  onToggle?: () => void;
}) {
  const { colors } = useTheme();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const goalDisplay =
    suggestion?.targetWeight && suggestion?.targetReps
      ? `${suggestion.targetWeight}${lastSession.unit}×${suggestion.targetReps}`
      : `${lastSession.weight}${lastSession.unit}×${lastSession.reps}`;

  const typeColor = cn(
    suggestion?.type === "increase_weight" &&
      "text-green-600 dark:text-green-400",
    suggestion?.type === "increase_reps" && "text-blue-600 dark:text-blue-400",
    suggestion?.type === "hold" && "text-muted-foreground",
    suggestion?.type === "deload" && "text-orange-600 dark:text-orange-400",
    !suggestion && "text-muted-foreground",
  );

  if (isCompact) {
    return (
      <Pressable
        onPress={onToggle}
        className={cn(
          "mb-2 w-full rounded border border-dashed border-muted-foreground/20 bg-muted/10 px-2 py-1.5",
          "flex-row items-center justify-between gap-2",
          "active:bg-muted/20",
        )}
        accessibilityRole="button"
      >
        <View className="min-w-0 flex-row items-center gap-1.5">
          <Text className={cn("shrink-0 text-xs font-medium", typeColor)}>
            Goal
          </Text>
          <Text className="font-mono text-xs tabular-nums text-foreground">
            {goalDisplay}
          </Text>
        </View>
        <ChevronDown size={12} color={colors.mutedForeground} />
      </Pressable>
    );
  }

  const rpeDisplay = lastSession.rpe ? `@ RPE ${lastSession.rpe}` : "";
  const targetDisplay =
    suggestion?.targetWeight && suggestion?.targetReps
      ? `${suggestion.targetWeight} ${lastSession.unit} × ${suggestion.targetReps}`
      : null;

  return (
    <Pressable
      className={cn(
        "mb-2 rounded border border-dashed border-muted-foreground/30 bg-muted/20 px-2.5 py-2",
        onToggle && "active:bg-muted/30",
      )}
      onPress={onToggle}
      disabled={!onToggle}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text className="text-[11px] text-muted-foreground opacity-70">
            Last:
          </Text>
          <Text className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {lastSession.weight}
            {lastSession.unit} × {lastSession.reps}
            {rpeDisplay ? (
              <Text className="opacity-70"> {rpeDisplay}</Text>
            ) : null}
          </Text>
          <Text className="text-[11px] text-muted-foreground opacity-50">
            ({formatDate(lastSession.date)})
          </Text>
        </View>
        {onToggle && <ChevronUp size={12} color={colors.mutedForeground} />}
      </View>
      {targetDisplay && suggestion && (
        <View className="mt-1 flex-row items-center gap-1.5">
          <Text className={cn("text-[11px] font-medium", typeColor)}>
            Goal:
          </Text>
          <Text className="font-mono text-[11px] tabular-nums text-foreground">
            {targetDisplay}
          </Text>
          {suggestion.reasoning && (
            <Text
              className="flex-1 text-[11px] text-muted-foreground/60"
              numberOfLines={1}
            >
              — {suggestion.reasoning}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

// Web uses react-fast-marquee for long names on the current exercise; on
// native we fall back to a single-line ellipsis (minor degradation).
function ExerciseTitle({
  name,
  status,
}: {
  name: string;
  status: ExerciseStatus;
}) {
  return (
    <View className="min-w-0 flex-1">
      <Text
        numberOfLines={1}
        className={cn(
          "font-semibold text-foreground",
          status === "current" && "text-lg",
          status === "completed" && "text-sm text-muted-foreground",
          status === "upcoming" && "text-base",
        )}
      >
        {name}
      </Text>
    </View>
  );
}

function GoalBadge({
  lastSession,
  suggestion,
}: {
  lastSession: GhostSetData;
  suggestion?: ProgressionSuggestionData;
}) {
  if (!suggestion?.targetWeight || !suggestion?.targetReps) return null;

  const weightDiff = suggestion.targetWeight - lastSession.weight;
  const repsDiff = suggestion.targetReps - lastSession.reps;

  let badgeText: string;
  let badgeLabel: string;

  if (suggestion.type === "deload") {
    badgeText = `${Math.abs(weightDiff)} ${lastSession.unit}`;
    badgeLabel = "Ease up";
  } else if (suggestion.type === "increase_weight" && weightDiff > 0) {
    badgeText = `+${weightDiff} ${lastSession.unit}`;
    badgeLabel = "Add weight";
  } else if (suggestion.type === "increase_reps" && repsDiff > 0) {
    badgeText = `+${repsDiff}`;
    badgeLabel = repsDiff > 1 ? "More reps" : "One more";
  } else {
    badgeText = "=";
    badgeLabel = "Maintain";
  }

  const containerColor = cn(
    "flex-row items-center gap-1 rounded px-1.5 py-0.5",
    suggestion.type === "increase_weight" && "bg-green-500/10",
    suggestion.type === "increase_reps" && "bg-blue-500/10",
    suggestion.type === "hold" && "bg-muted",
    suggestion.type === "deload" && "bg-orange-500/10",
  );
  const textColor = cn(
    "text-[10px] font-medium",
    suggestion.type === "increase_weight" &&
      "text-green-600 dark:text-green-400",
    suggestion.type === "increase_reps" && "text-blue-600 dark:text-blue-400",
    suggestion.type === "hold" && "text-muted-foreground",
    suggestion.type === "deload" && "text-orange-600 dark:text-orange-400",
  );

  return (
    <View className={containerColor}>
      <Text className={cn(textColor, "opacity-70")}>{badgeLabel}</Text>
      <Text className={cn(textColor, "font-bold")}>{badgeText}</Text>
    </View>
  );
}

function formatLoggedSet(set: SetData) {
  return set.isBodyweight && set.weight === 0
    ? `BW × ${set.reps}`
    : set.isBodyweight && set.weight > 0
      ? `BW+${set.weight}${set.unit} × ${set.reps}`
      : `${set.weight}${set.unit} × ${set.reps}`;
}

export function ExerciseAccordion({
  exerciseName,
  sets,
  status,
  equipment,
  defaultWeight,
  defaultReps = 8,
  unit = "lb",
  targetSets,
  targetReps,
  note,
  lastSession,
  progressionSuggestion,
  onAddSet,
  onEditSet,
  onSwap,
  onNoteChange,
  onSelect,
}: ExerciseAccordionProps) {
  const weightMode = getWeightMode(equipment);
  const resolvedUnit =
    sets.length > 0 ? sets[sets.length - 1].unit : (lastSession?.unit ?? unit);
  const resolvedWeightStep = resolvedUnit === "kg" ? 2.5 : 5;
  const resolvedDefaultWeight =
    defaultWeight ?? (resolvedUnit === "kg" ? 20 : 45);

  const initialWeight =
    sets.length > 0
      ? sets[sets.length - 1].weight
      : (progressionSuggestion?.targetWeight ??
        lastSession?.weight ??
        resolvedDefaultWeight);
  const initialReps =
    sets.length > 0
      ? sets[sets.length - 1].reps
      : (progressionSuggestion?.targetReps ?? lastSession?.reps ?? defaultReps);

  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [rpe, setRpe] = useState<number | null>(null);
  const [hasEditedWeight, setHasEditedWeight] = useState(false);
  const [hasEditedReps, setHasEditedReps] = useState(false);
  const [isBodyweight, setIsBodyweight] = useState(
    weightMode === "bodyweight-only" ||
      (sets.length > 0 && sets[sets.length - 1].isBodyweight === true),
  );
  const [showAddedWeight, setShowAddedWeight] = useState(false);
  const [showNoteSheet, setShowNoteSheet] = useState(false);
  const [ghostExpanded, setGhostExpanded] = useState(true);
  const { vibrate } = useHaptic();
  const { colors } = useTheme();

  const isExpanded = status === "current";
  const loggedCount = sets.length;
  const isComplete = targetSets !== undefined && loggedCount >= targetSets;
  const currentWeight =
    sets.length > 0 || hasEditedWeight ? weight : initialWeight;
  const currentReps = sets.length > 0 || hasEditedReps ? reps : initialReps;

  const handleWeightChange = (nextWeight: number) => {
    setHasEditedWeight(true);
    setWeight(nextWeight);
  };

  const handleRepsChange = (nextReps: number) => {
    setHasEditedReps(true);
    setReps(nextReps);
  };

  const handleAddSet = () => {
    vibrate("success");
    setWeight(currentWeight);
    setReps(currentReps);
    const effectiveWeight =
      isBodyweight && !showAddedWeight ? 0 : currentWeight;
    onAddSet({
      reps: currentReps,
      weight: effectiveWeight,
      unit: resolvedUnit,
      isBodyweight,
      rpe,
    });
    setRpe(null);
  };

  const handleBodyweightToggle = () => {
    vibrate("light");
    setIsBodyweight(!isBodyweight);
    if (!isBodyweight) {
      setShowAddedWeight(false);
    }
  };

  const handleCardPress = () => {
    if (status !== "current" && onSelect) {
      vibrate("light");
      onSelect();
    }
  };

  const isClickable = status !== "current" && !!onSelect;

  return (
    <Pressable
      onPress={isClickable ? handleCardPress : undefined}
      disabled={!isClickable}
      className={cn(
        // shadow-none establishes the --tw-shadow variables on first render;
        // gaining shadow-lg later is then a value change, not a css-interop
        // "variables" upgrade (which remounts, and whose dev warning crashes
        // on these props).
        "rounded-lg border shadow-none",
        status === "current" && "border-primary/30 bg-card shadow-lg",
        status === "completed" && "border-transparent bg-muted/20",
        status === "upcoming" && "border-muted/50 bg-card/50 opacity-70",
      )}
    >
      <View
        className={cn(
          "flex-row items-center justify-between gap-3 p-4",
          status === "current" && "pb-2",
        )}
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View
            className={cn(
              "h-6 w-6 shrink-0 items-center justify-center rounded",
              status === "completed" && "bg-primary/20",
              status === "current" && "bg-primary",
              status === "upcoming" && "bg-muted",
            )}
          >
            {status === "completed" ? (
              <Check size={14} color={colors.primary} />
            ) : (
              <Text
                className={cn(
                  "font-mono text-xs font-bold",
                  status === "current"
                    ? "text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {loggedCount}
              </Text>
            )}
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <ExerciseTitle name={exerciseName} status={status} />
              {status === "current" && lastSession && progressionSuggestion && (
                <GoalBadge
                  lastSession={lastSession}
                  suggestion={progressionSuggestion}
                />
              )}
              {status === "current" && onSwap && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 px-0"
                  onPress={onSwap}
                  accessibilityLabel="Swap exercise"
                >
                  <Shuffle size={14} color={colors.mutedForeground} />
                </Button>
              )}
              {status === "current" && onNoteChange && (
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

            {status === "completed" && sets.length > 0 && (
              <SetRowCompact sets={sets} />
            )}

            {status === "current" && targetSets ? (
              <View className="mt-1">
                <SegmentedProgress current={loggedCount} total={targetSets} />
              </View>
            ) : null}
          </View>
        </View>

        <Text
          className={cn(
            "shrink-0 font-mono text-sm tabular-nums",
            status === "current" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {targetSets !== undefined
            ? `${loggedCount}/${targetSets}`
            : `${loggedCount}`}
        </Text>
      </View>

      {isExpanded && (
        <View className="gap-2 px-3 pb-3 pt-1">
          {lastSession && (
            <GhostSetBox
              lastSession={lastSession}
              suggestion={progressionSuggestion}
              isCompact={sets.length > 0 && !ghostExpanded}
              onToggle={
                sets.length > 0
                  ? () => {
                      vibrate("light");
                      setGhostExpanded(!ghostExpanded);
                    }
                  : undefined
              }
            />
          )}
          {targetSets !== undefined ? (
            <View className="gap-1">
              {Array.from({ length: targetSets }, (_, i) => i + 1).map(
                (setNumber) => {
                  const loggedSet = sets.find((s) => s.setNumber === setNumber);
                  if (loggedSet) {
                    return (
                      <Pressable
                        key={setNumber}
                        onPress={() =>
                          onEditSet && loggedSet.entryId && onEditSet(loggedSet)
                        }
                        disabled={!onEditSet || !loggedSet.entryId}
                        className={cn(
                          "flex-row items-center justify-between rounded px-2.5 py-1.5",
                          "border border-transparent bg-muted/40",
                          onEditSet &&
                            loggedSet.entryId &&
                            "active:border-border active:bg-muted",
                        )}
                        accessibilityRole="button"
                      >
                        <Text className="font-mono text-[11px] text-muted-foreground">
                          {setNumber}
                        </Text>
                        <Text className="font-mono text-xs tabular-nums text-foreground">
                          {formatLoggedSet(loggedSet)}
                        </Text>
                        <Check size={14} color={colors.primary} />
                      </Pressable>
                    );
                  } else {
                    const displayReps =
                      targetReps || defaultReps?.toString() || "—";
                    return (
                      <View
                        key={setNumber}
                        className={cn(
                          "flex-row items-center justify-between rounded px-2.5 py-1.5",
                          "border border-dashed border-muted-foreground/20",
                        )}
                      >
                        <Text className="font-mono text-[11px] text-muted-foreground/50">
                          {setNumber}
                        </Text>
                        <Text className="font-mono text-xs tabular-nums text-muted-foreground/50">
                          — × {displayReps}
                        </Text>
                        <View className="h-3.5 w-3.5" />
                      </View>
                    );
                  }
                },
              )}
            </View>
          ) : sets.length > 0 ? (
            <View className="gap-1">
              {sets.map((set) => (
                <Pressable
                  key={set.setNumber}
                  onPress={() => onEditSet && set.entryId && onEditSet(set)}
                  disabled={!onEditSet || !set.entryId}
                  className={cn(
                    "flex-row items-center justify-between rounded px-2.5 py-1.5",
                    "border border-transparent bg-muted/40",
                    onEditSet &&
                      set.entryId &&
                      "active:border-border active:bg-muted",
                  )}
                  accessibilityRole="button"
                >
                  <Text className="font-mono text-[11px] text-muted-foreground">
                    {set.setNumber}
                  </Text>
                  <Text className="font-mono text-xs tabular-nums text-foreground">
                    {formatLoggedSet(set)}
                  </Text>
                  <Check size={14} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {weightMode === "bodyweight-optional" && (
            <View className="flex-row rounded border border-border bg-muted/20 p-0.5">
              <Pressable
                onPress={() => {
                  if (isBodyweight) handleBodyweightToggle();
                }}
                className={cn(
                  "flex-1 flex-row items-center justify-center gap-1.5 rounded-sm shadow-none px-2 py-1.5",
                  !isBodyweight && "bg-background shadow-sm",
                )}
                accessibilityRole="button"
                accessibilityState={{ selected: !isBodyweight }}
              >
                <Dumbbell
                  size={12}
                  color={
                    !isBodyweight ? colors.foreground : colors.mutedForeground
                  }
                />
                <Text
                  className={cn(
                    "text-[11px] font-medium",
                    !isBodyweight ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  Weighted
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!isBodyweight) handleBodyweightToggle();
                }}
                className={cn(
                  "flex-1 flex-row items-center justify-center gap-1.5 rounded-sm shadow-none px-2 py-1.5",
                  isBodyweight && "bg-background shadow-sm",
                )}
                accessibilityRole="button"
                accessibilityState={{ selected: isBodyweight }}
              >
                <User
                  size={12}
                  color={
                    isBodyweight ? colors.foreground : colors.mutedForeground
                  }
                />
                <Text
                  className={cn(
                    "text-[11px] font-medium",
                    isBodyweight ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  Bodyweight
                </Text>
              </Pressable>
            </View>
          )}

          {weightMode === "bodyweight-only" && (
            <Pressable
              onPress={() => {
                vibrate("light");
                setShowAddedWeight(!showAddedWeight);
                if (showAddedWeight) setWeight(0);
              }}
              className={cn(
                "w-full flex-row items-center justify-center gap-1.5 rounded border px-2 py-1.5",
                showAddedWeight
                  ? "border-primary/30 bg-primary/5"
                  : "border-dashed border-muted-foreground/30",
              )}
              accessibilityRole="button"
            >
              <Dumbbell
                size={12}
                color={
                  showAddedWeight ? colors.primary : colors.mutedForeground
                }
              />
              <Text
                className={cn(
                  "text-[11px] font-medium",
                  showAddedWeight ? "text-primary" : "text-muted-foreground",
                )}
              >
                {showAddedWeight ? "Added weight" : "+ Add weight (vest/belt)"}
              </Text>
              {showAddedWeight ? (
                <ChevronUp size={12} color={colors.primary} />
              ) : (
                <ChevronDown size={12} color={colors.mutedForeground} />
              )}
            </Pressable>
          )}

          <View className="flex-row items-end justify-center gap-6 pt-2">
            {(weightMode === "weighted-only" ||
              (weightMode === "bodyweight-optional" && !isBodyweight) ||
              (weightMode === "bodyweight-only" && showAddedWeight)) && (
              <SetStepper
                label={weightMode === "bodyweight-only" ? "ADDED" : "WEIGHT"}
                value={currentWeight}
                onChange={handleWeightChange}
                step={resolvedWeightStep}
                min={0}
                unit={resolvedUnit}
              />
            )}
            <SetStepper
              label="REPS"
              value={currentReps}
              onChange={handleRepsChange}
              step={1}
              min={1}
              max={100}
            />
          </View>

          <View className="pt-2">
            <RpeSelector value={rpe} onChange={setRpe} />
          </View>

          <Button
            size="lg"
            className="mt-3 h-12 w-full"
            textClassName="text-base font-semibold tracking-wide"
            onPress={handleAddSet}
            disabled={isComplete}
          >
            {isComplete
              ? "COMPLETE"
              : targetSets !== undefined
                ? `LOG SET ${loggedCount + 1}/${targetSets}`
                : `LOG SET ${loggedCount + 1}`}
          </Button>
        </View>
      )}

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
