"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Dumbbell } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { StartWorkoutSheet } from "@/components/workout/start-workout-sheet";

type Workout = {
  _id: string;
  title?: string;
  status: "in_progress" | "completed" | "cancelled";
  startedAt: number;
  completedAt?: number;
  summary?: {
    totalVolume?: number;
    totalSets?: number;
    totalDurationMinutes?: number;
    exerciseCount?: number;
    totalCardioDurationSeconds?: number;
    totalDistanceKm?: number;
    hasCardio?: boolean;
    hasMobility?: boolean;
  };
};

export default function HistoryPage() {
  const [showStartSheet, setShowStartSheet] = useState(false);
  const workouts = useQuery(api.workouts.getWorkoutHistory, { 
    limit: 100,
    status: "all" 
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatCardioDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const groupWorkoutsByMonth = (workoutList: Workout[]) => {
    const groups: Record<string, Workout[]> = {};
    
    for (const workout of workoutList) {
      const date = new Date(workout.startedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(workout);
    }
    
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => ({
        key,
        label: new Date(items[0].startedAt).toLocaleDateString("en-US", { 
          month: "long", 
          year: "numeric" 
        }),
        workouts: items,
      }));
  };

  if (workouts === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center px-4">
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="flex-1 p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  const groupedWorkouts = groupWorkoutsByMonth(workouts);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center px-4">
          <h1 className="font-semibold text-lg">Workout History</h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        {workouts.length === 0 ? (
          <Card className="p-8 text-center">
            <Dumbbell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 font-semibold">No workouts yet</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Complete your first workout to see it here!
            </p>
            <Link href="/dashboard">
              <Button>Start a Workout</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedWorkouts.map((group) => (
              <section key={group.key}>
                <h2 className="mb-3 text-sm font-mono uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.workouts.map((workout) => (
                    <Link 
                      key={workout._id} 
                      href={`/workout/${workout._id}`}
                      className="block"
                    >
                      <Card className="p-4 transition-colors hover:bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {workout.title ?? "Workout"}
                              </p>
                              {workout.status === "cancelled" && (
                                <Badge variant="secondary" className="text-xs">
                                  Cancelled
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(workout.startedAt)}
                              </span>
                              {formatDuration(workout.summary?.totalDurationMinutes) && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatDuration(workout.summary?.totalDurationMinutes)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {workout.summary && (
                              <>
                                <p className="font-mono font-medium tabular-nums">
                                  {(workout.summary.totalSets ?? 0) > 0
                                    ? `${workout.summary.totalSets} sets`
                                    : workout.summary.totalCardioDurationSeconds
                                      ? formatCardioDuration(workout.summary.totalCardioDurationSeconds)
                                      : `${workout.summary.exerciseCount ?? 0} exercises`}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono tabular-nums">
                                  {(workout.summary.totalSets ?? 0) > 0
                                    ? `${workout.summary.exerciseCount ?? 0} exercises`
                                    : workout.summary.totalCardioDurationSeconds
                                      ? "cardio"
                                      : ""}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <BottomNav onStartWorkout={() => setShowStartSheet(true)} />
      <StartWorkoutSheet
        open={showStartSheet}
        onOpenChange={setShowStartSheet}
      />
    </div>
  );
}
