"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Download, Dumbbell, MessageSquare, Route, Timer, Weight } from "lucide-react";
import Link from "next/link";
import { ExportWorkoutDialog } from "@/components/workout/export-workout-dialog";

type LiftingEntry = {
  _id: string;
  exerciseName: string;
  kind: "lifting";
  lifting: {
    setNumber: number;
    reps?: number;
    weight?: number;
    unit: "kg" | "lb";
    rpe?: number;
    isWarmup?: boolean;
  };
  createdAt: number;
};

type CardioEntry = {
  _id: string;
  exerciseName: string;
  kind: "cardio";
  cardio: {
    mode: "steady" | "intervals";
    durationSeconds: number;
    intensity?: number;
  };
  createdAt: number;
};

type Entry = LiftingEntry | CardioEntry;

type GroupedExercise = {
  name: string;
  entries: Entry[];
};

export default function WorkoutDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.id as Id<"workouts">;
  const [showExportDialog, setShowExportDialog] = useState(false);

  const workout = useQuery(api.workouts.getWorkoutWithEntries, { workoutId });
  const user = useQuery(api.users.getCurrentUser);
  const isPro = user?.tier === "pro";

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatCardioDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${mins}m`;
  };

  const formatCardioSummaryDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const formatDistance = (km: number) => {
    if (km >= 1) {
      return `${km.toFixed(1)} km`;
    }
    return `${Math.round(km * 1000)} m`;
  };

  const groupEntriesByExercise = (entries: Entry[]): GroupedExercise[] => {
    const groups: Record<string, Entry[]> = {};
    const order: string[] = [];

    for (const entry of entries) {
      if (!groups[entry.exerciseName]) {
        groups[entry.exerciseName] = [];
        order.push(entry.exerciseName);
      }
      groups[entry.exerciseName].push(entry);
    }

    return order.map((name) => ({
      name,
      entries: groups[name].sort((a, b) => a.createdAt - b.createdAt),
    }));
  };

  if (workout === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center gap-4 px-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <main className="flex-1 p-4">
          <Skeleton className="mb-4 h-24 w-full" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (workout === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-xl font-semibold">Workout not found</h1>
        <p className="mb-4 text-muted-foreground">
          This workout doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Button onClick={() => router.push("/history")}>
          Back to History
        </Button>
      </div>
    );
  }

  const groupedExercises = groupEntriesByExercise(workout.entries as Entry[]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/history">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">
              {workout.title ?? "Workout"}
            </h1>
          </div>
          {isPro && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          {workout.status === "cancelled" && (
            <Badge variant="secondary">Cancelled</Badge>
          )}
        </div>
      </header>

      <main className="flex-1 p-4">
        <Card className="mb-6 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium font-mono">{formatDate(workout.startedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time</p>
              <p className="font-medium font-mono tabular-nums">
                {formatTime(workout.startedAt)}
                {workout.completedAt && ` - ${formatTime(workout.completedAt)}`}
              </p>
            </div>
            {workout.summary?.totalDurationMinutes && (
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium font-mono tabular-nums flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(workout.summary.totalDurationMinutes)}
                </p>
              </div>
            )}
            {(workout.summary?.totalVolume ?? 0) > 0 && (
              <div>
                <p className="text-muted-foreground">Volume</p>
                <p className="font-medium font-mono tabular-nums flex items-center gap-1">
                  <Weight className="h-4 w-4" />
                  {workout.summary!.totalVolume} lb
                </p>
              </div>
            )}
            {(workout.summary?.totalCardioDurationSeconds ?? 0) > 0 && (
              <div>
                <p className="text-muted-foreground">Cardio</p>
                <p className="font-medium font-mono tabular-nums flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  {formatCardioSummaryDuration(workout.summary!.totalCardioDurationSeconds!)}
                </p>
              </div>
            )}
            {(workout.summary?.totalDistanceKm ?? 0) > 0 && (
              <div>
                <p className="text-muted-foreground">Distance</p>
                <p className="font-medium font-mono tabular-nums flex items-center gap-1">
                  <Route className="h-4 w-4" />
                  {formatDistance(workout.summary!.totalDistanceKm!)}
                </p>
              </div>
            )}
          </div>
          {workout.notes && (
            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm">{workout.notes}</p>
            </div>
          )}
        </Card>

        {groupedExercises.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <p>No exercises logged in this workout.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupedExercises.map((exercise) => {
              const exerciseNote = workout.exerciseNotes?.find(
                (n) => n.exerciseName === exercise.name
              )?.note;

              return (
                <Card key={exercise.name} className="p-4">
                  <h3 className="mb-3 font-semibold">{exercise.name}</h3>
                  <div className="space-y-2">
                    {exercise.entries.map((entry) => {
                      if (entry.kind === "lifting" && entry.lifting) {
                        return (
                          <div
                            key={entry._id}
                            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                          >
                            <span className="text-muted-foreground">
                              Set {entry.lifting.setNumber}
                              {entry.lifting.isWarmup && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Warmup
                                </Badge>
                              )}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-medium font-mono tabular-nums">
                                {entry.lifting.weight ?? 0} {entry.lifting.unit}
                              </span>
                              <span className="text-muted-foreground">x</span>
                              <span className="font-medium font-mono tabular-nums">
                                {entry.lifting.reps ?? 0} reps
                              </span>
                              {entry.lifting.rpe && (
                                <Badge variant="secondary" className="text-xs">
                                  RPE {entry.lifting.rpe}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (entry.kind === "cardio" && entry.cardio) {
                        return (
                          <div
                            key={entry._id}
                            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                          >
                            <span className="text-muted-foreground capitalize">
                              {entry.cardio.mode}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-medium font-mono tabular-nums">
                                {formatCardioDuration(entry.cardio.durationSeconds)}
                              </span>
                              {entry.cardio.intensity && (
                                <Badge variant="secondary" className="text-xs">
                                  Level {entry.cardio.intensity}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                  {exerciseNote && (
                    <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm">
                      <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{exerciseNote}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <ExportWorkoutDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        workoutId={workoutId}
      />
    </div >
  );
}
