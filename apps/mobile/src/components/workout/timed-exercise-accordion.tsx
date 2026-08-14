import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Check, MessageSquare, Shuffle } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoteSheet } from "./note-sheet";
import { RpeSelector } from "./rpe-selector";
import { useHaptic } from "@/hooks/use-haptic";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

type ExerciseStatus = "completed" | "current" | "upcoming";

export interface TimedSetData {
  entryId?: string;
  setNumber: number;
  durationSeconds: number;
  rpe?: number | null;
  isWarmup?: boolean;
}

interface TimedExerciseAccordionProps {
  exerciseName: string;
  sets: TimedSetData[];
  status: ExerciseStatus;
  targetSets?: number;
  targetDurationSeconds?: number;
  lastSession?: {
    date: string;
    sets: { durationSeconds: number }[];
  };
  note?: string;
  onAddSet: (set: {
    durationSeconds: number;
    rpe?: number | null;
  }) => Promise<void>;
  onEditSet?: (set: TimedSetData) => void;
  onSwap?: () => void;
  onNoteChange?: (note: string) => void;
  onSelect?: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}

function formatHistoryDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function TimedExerciseAccordion({
  exerciseName,
  sets,
  status,
  targetSets,
  targetDurationSeconds = 30,
  lastSession,
  note,
  onAddSet,
  onEditSet,
  onSwap,
  onNoteChange,
  onSelect,
}: TimedExerciseAccordionProps) {
  const { vibrate } = useHaptic();
  const { colors } = useTheme();
  const [durationSeconds, setDurationSeconds] = useState(
    sets.at(-1)?.durationSeconds ?? targetDurationSeconds,
  );
  const [rpe, setRpe] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNoteSheet, setShowNoteSheet] = useState(false);

  const loggedCount = sets.length;
  const isComplete = targetSets !== undefined && loggedCount >= targetSets;
  const isExpanded = status === "current";

  const handleSubmit = async () => {
    if (!Number.isFinite(durationSeconds) || durationSeconds < 1) {
      setError("Enter a duration of at least 1 second.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onAddSet({ durationSeconds, rpe });
      setRpe(null);
      vibrate("success");
    } catch {
      setError("This set could not be saved. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      className={cn(
        // shadow-none: see exercise-accordion.tsx (css-interop variable upgrade).
        "rounded-lg border shadow-none",
        status === "current" && "border-primary/30 bg-card shadow-lg",
        status === "completed" && "border-transparent bg-muted/20",
        status === "upcoming" && "border-muted/50 bg-card/50 opacity-70",
      )}
    >
      <View className="flex-row items-center gap-3 p-4">
        <Pressable
          onPress={status === "current" ? undefined : onSelect}
          disabled={status === "current" || !onSelect}
          className="min-h-12 min-w-0 flex-1 flex-row items-center gap-3 rounded-md"
          accessibilityRole="button"
        >
          <View
            className={cn(
              "h-6 w-6 shrink-0 items-center justify-center rounded",
              status === "current" && "bg-primary",
              status === "completed" && "bg-primary/20",
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
            <Text numberOfLines={1} className="font-semibold text-foreground">
              {exerciseName}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Timed hold · {formatDuration(targetDurationSeconds)} target
            </Text>
          </View>
          <Text className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
            {targetSets === undefined
              ? loggedCount
              : `${loggedCount}/${targetSets}`}
          </Text>
        </Pressable>

        {isExpanded && onSwap && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onPress={onSwap}
            accessibilityLabel="Swap exercise"
          >
            <Shuffle size={16} color={colors.foreground} />
          </Button>
        )}
        {isExpanded && onNoteChange && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onPress={() => setShowNoteSheet(true)}
            accessibilityLabel="Add note"
          >
            <MessageSquare
              size={16}
              color={note ? colors.primary : colors.foreground}
              fill={note ? colors.primary : "none"}
            />
          </Button>
        )}
      </View>

      {isExpanded && (
        <View className="gap-4 px-4 pb-4">
          {lastSession && (
            <Text className="rounded border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Last {formatHistoryDate(lastSession.date)}:{" "}
              {lastSession.sets
                .map((set) => formatDuration(set.durationSeconds))
                .join(", ")}
            </Text>
          )}

          {sets.length > 0 && (
            <View className="gap-1" accessibilityLabel="Logged timed sets">
              {sets.map((set) => (
                <Pressable
                  key={set.setNumber}
                  onPress={() => onEditSet?.(set)}
                  disabled={!onEditSet || !set.entryId}
                  className="min-h-11 w-full flex-row items-center justify-between rounded border border-transparent bg-muted/40 px-3 active:border-border active:bg-muted"
                  accessibilityRole="button"
                >
                  <Text className="text-sm text-muted-foreground">
                    Set {set.setNumber}
                  </Text>
                  <Text className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {formatDuration(set.durationSeconds)}
                  </Text>
                  <Check size={16} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          )}

          <View className="gap-2">
            <Label>Duration (seconds)</Label>
            <Input
              keyboardType="number-pad"
              returnKeyType="done"
              value={String(durationSeconds)}
              onChangeText={(text) => {
                setError(null);
                setDurationSeconds(Number(text));
              }}
              className="h-12 text-center font-mono text-lg"
            />
          </View>

          <RpeSelector value={rpe} onChange={setRpe} />

          {error && (
            <Text
              className="text-sm text-destructive"
              accessibilityRole="alert"
            >
              {error}
            </Text>
          )}

          <Button
            size="lg"
            className="h-12 w-full"
            onPress={handleSubmit}
            disabled={isComplete || isSubmitting}
          >
            {isComplete
              ? "COMPLETE"
              : isSubmitting
                ? "SAVING…"
                : targetSets === undefined
                  ? `LOG SET ${loggedCount + 1}`
                  : `LOG SET ${loggedCount + 1}/${targetSets}`}
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
    </View>
  );
}
