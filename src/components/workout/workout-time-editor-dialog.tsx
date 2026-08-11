"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildWorkoutTimeEditRange,
  getLocalDateInputValue,
  getLocalTimeInputValue,
  validateWorkoutTimeEditRange,
} from "@/lib/workout-time-edit";

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
    getLocalDateInputValue(initialStartedAt)
  );
  const [startedAtValue, setStartedAtValue] = useState(() =>
    getLocalTimeInputValue(initialStartedAt)
  );
  const [completedAtValue, setCompletedAtValue] = useState(() =>
    getLocalTimeInputValue(initialCompletedAt)
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
  const todayDateValue = getLocalDateInputValue(openedAt);

  const handleSubmit = async () => {
    const submissionValidationState = validateWorkoutTimeEditRange(
      parsedRange,
      Date.now()
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
        error instanceof Error ? error.message : "Failed to update workout"
      );
    }
  };

  const errorMessage = submitError ?? validationState.message;
  const dateInputInvalid = validationState.dateInvalid ? true : undefined;
  const startInputInvalid = validationState.startInvalid ? true : undefined;
  const endInputInvalid = validationState.endInvalid ? true : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "edit" ? (
            <div className="space-y-2">
              <Label htmlFor="workout-date">Date</Label>
              <Input
                id="workout-date"
                type="date"
                value={workoutDateValue}
                max={todayDateValue}
                onChange={(event) => {
                  setWorkoutDateValue(event.target.value);
                  setSubmitError(null);
                }}
                aria-invalid={dateInputInvalid}
                disabled={isSubmitting}
              />
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium font-mono">
                  {workoutDateLabel}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="workout-start-time">Start</Label>
            <Input
              id="workout-start-time"
              type="time"
              value={startedAtValue}
              onChange={(event) => {
                setStartedAtValue(event.target.value);
                setSubmitError(null);
              }}
              aria-invalid={startInputInvalid}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workout-end-time">End</Label>
            <Input
              id="workout-end-time"
              type="time"
              value={completedAtValue}
              onChange={(event) => {
                setCompletedAtValue(event.target.value);
                setSubmitError(null);
              }}
              aria-invalid={endInputInvalid}
              disabled={isSubmitting}
            />
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium font-mono tabular-nums">
                {durationPreview ?? "--"}
              </span>
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
