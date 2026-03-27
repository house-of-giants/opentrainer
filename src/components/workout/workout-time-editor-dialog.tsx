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

interface WorkoutTimeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStartedAt: number;
  initialCompletedAt: number;
  mode: "finish" | "edit";
  onSubmit: (startedAt: number, completedAt: number) => Promise<void>;
  isSubmitting: boolean;
}

function toTimeValue(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildTimestampForWorkoutDate(baseTimestamp: number, timeValue: string) {
  if (!timeValue) return null;

  const [hoursString, minutesString] = timeValue.split(":");
  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const date = new Date(baseTimestamp);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
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

type ValidationState = {
  message: string | null;
  startInvalid?: boolean;
  endInvalid?: boolean;
};

function validateValues(
  startedAt: number | null,
  completedAt: number | null
): ValidationState {
  if (startedAt === null) {
    return { message: "Choose a start time", startInvalid: true };
  }

  if (completedAt === null) {
    return { message: "Choose an end time", endInvalid: true };
  }

  if (startedAt >= completedAt) {
    return { message: "End time must be after start time", endInvalid: true };
  }

  const now = Date.now();
  if (startedAt > now || completedAt > now) {
    return {
      message: "Times can't be in the future",
      startInvalid: startedAt > now,
      endInvalid: completedAt > now,
    };
  }

  return { message: null };
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
  const [startedAtValue, setStartedAtValue] = useState(() =>
    toTimeValue(initialStartedAt)
  );
  const [completedAtValue, setCompletedAtValue] = useState(() =>
    toTimeValue(initialCompletedAt)
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const workoutDateLabel = formatWorkoutDate(initialStartedAt);
  const parsedStartedAt = buildTimestampForWorkoutDate(
    initialStartedAt,
    startedAtValue
  );
  const parsedCompletedAt = buildTimestampForWorkoutDate(
    initialCompletedAt,
    completedAtValue
  );
  const validationState = validateValues(parsedStartedAt, parsedCompletedAt);

  const durationPreview =
    parsedStartedAt !== null &&
    parsedCompletedAt !== null &&
    parsedCompletedAt > parsedStartedAt
      ? formatDuration(parsedStartedAt, parsedCompletedAt)
      : null;

  const title = mode === "finish" ? "Edit workout time" : "Edit workout times";
  const description =
    mode === "finish"
      ? "Fix the start and end time before finishing this workout."
      : "Correct the workout start and end time.";
  const submitLabel = mode === "finish" ? "Finish Workout" : "Save";

  const handleSubmit = async () => {
    if (validationState.message) {
      setSubmitError(validationState.message);
      return;
    }

    if (parsedStartedAt === null || parsedCompletedAt === null) {
      setSubmitError("Choose a valid start and end time");
      return;
    }

    setSubmitError(null);

    try {
      await onSubmit(parsedStartedAt, parsedCompletedAt);
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update workout times"
      );
    }
  };

  const errorMessage = submitError ?? validationState.message;
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
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium font-mono">{workoutDateLabel}</span>
            </div>
          </div>

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
