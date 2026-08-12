import { useState } from "react";
import { Text, View } from "react-native";
import {
  buildWorkoutTimeEditRange,
  getLocalDateInputValue,
  getLocalTimeInputValue,
  validateWorkoutTimeEditRange,
} from "@opentrainer/lib/workout-time-edit";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

interface WorkoutTimeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStartedAt: number;
  initialCompletedAt: number;
  mode: "finish" | "edit";
  onSubmit: (startedAt: number, completedAt: number) => Promise<void>;
  isSubmitting: boolean;
}

function formatDuration(startedAt: number, completedAt: number) {
  const totalMinutes = Math.round((completedAt - startedAt) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

function formatWorkoutDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Web uses native <input type="date"/"time"> pickers; RN has no built-in
// equivalent, so the same "YYYY-MM-DD" / "HH:MM" string values are edited as
// text and validated by the shared @opentrainer/lib/workout-time-edit logic.
export function WorkoutTimeEditorDialog({
  open,
  onOpenChange,
  initialStartedAt,
  initialCompletedAt,
  mode,
  onSubmit,
  isSubmitting,
}: WorkoutTimeEditorDialogProps) {
  const [openedAt] = useState(() => Date.now());
  const [workoutDateValue, setWorkoutDateValue] = useState(() =>
    getLocalDateInputValue(initialStartedAt),
  );
  const [startedAtValue, setStartedAtValue] = useState(() =>
    getLocalTimeInputValue(initialStartedAt),
  );
  const [completedAtValue, setCompletedAtValue] = useState(() =>
    getLocalTimeInputValue(initialCompletedAt),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const workoutDateLabel = formatWorkoutDate(initialStartedAt);
  const selectedWorkoutDateValue =
    mode === "edit" ? workoutDateValue : getLocalDateInputValue(initialStartedAt);
  const parsedRange = buildWorkoutTimeEditRange({
    initialStartedAt,
    initialCompletedAt,
    dateValue: selectedWorkoutDateValue,
    startedAtTimeValue: startedAtValue,
    completedAtTimeValue: completedAtValue,
  });
  const validationState = validateWorkoutTimeEditRange(parsedRange, openedAt);
  const { startedAt: parsedStartedAt, completedAt: parsedCompletedAt } =
    parsedRange;

  const durationPreview =
    parsedStartedAt !== null &&
    parsedCompletedAt !== null &&
    parsedCompletedAt > parsedStartedAt
      ? formatDuration(parsedStartedAt, parsedCompletedAt)
      : null;

  const title =
    mode === "finish" ? "Edit workout time" : "Edit workout date/time";
  const description =
    mode === "finish"
      ? "Fix the start and end time before finishing this workout."
      : "Correct the workout date, start time, and end time.";
  const submitLabel = mode === "finish" ? "Finish Workout" : "Save";

  const handleSubmit = async () => {
    // Event handler, not render: re-validate against the actual submit time.
    // eslint-disable-next-line react-hooks/purity
    const submittedAt = Date.now();
    const submissionValidationState = validateWorkoutTimeEditRange(
      parsedRange,
      submittedAt,
    );

    if (submissionValidationState.message) {
      setSubmitError(submissionValidationState.message);
      return;
    }

    if (parsedStartedAt === null || parsedCompletedAt === null) {
      setSubmitError("Choose a valid workout date and times");
      return;
    }

    setSubmitError(null);

    try {
      await onSubmit(parsedStartedAt, parsedCompletedAt);
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update workout",
      );
    }
  };

  const errorMessage = submitError ?? validationState.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <View className="gap-4">
        {mode === "edit" ? (
          <View className="gap-2">
            <Label>Date</Label>
            <Input
              value={workoutDateValue}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              onChangeText={(value) => {
                setWorkoutDateValue(value);
                setSubmitError(null);
              }}
              className={cn(validationState.dateInvalid && "border-destructive")}
              editable={!isSubmitting}
            />
          </View>
        ) : (
          <View className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-sm text-muted-foreground">Date</Text>
              <Text className="font-mono text-sm font-medium text-foreground">
                {workoutDateLabel}
              </Text>
            </View>
          </View>
        )}

        <View className="gap-2">
          <Label>Start</Label>
          <Input
            value={startedAtValue}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
            onChangeText={(value) => {
              setStartedAtValue(value);
              setSubmitError(null);
            }}
            className={cn(validationState.startInvalid && "border-destructive")}
            editable={!isSubmitting}
          />
        </View>

        <View className="gap-2">
          <Label>End</Label>
          <Input
            value={completedAtValue}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
            onChangeText={(value) => {
              setCompletedAtValue(value);
              setSubmitError(null);
            }}
            className={cn(validationState.endInvalid && "border-destructive")}
            editable={!isSubmitting}
          />
        </View>

        <View className="rounded-md border border-border bg-muted/30 px-3 py-2">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-sm text-muted-foreground">Duration</Text>
            <Text className="font-mono text-sm font-medium tabular-nums text-foreground">
              {durationPreview ?? "--"}
            </Text>
          </View>
        </View>

        {errorMessage && (
          <Text className="text-sm text-destructive">{errorMessage}</Text>
        )}
      </View>

      <DialogFooter>
        <Button
          variant="outline"
          onPress={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
