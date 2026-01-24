"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeeklyStatsGrid } from "@/components/dashboard";
import { AsciiLogo } from "@/components/ui/ascii-logo";
import { Plus } from "lucide-react";
import { StartWorkoutSheetDemo } from "@/components/demo/start-workout-sheet-demo";
import { TrainingLabCardDemo } from "@/components/demo/training-lab-card-demo";
import { MOCK_WORKOUTS, MOCK_DASHBOARD_STATS } from "@/lib/demo-data";

export default function DemoDashboard() {
  const [showStartSheet, setShowStartSheet] = useState(false);
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "—";
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <AsciiLogo />
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Demo
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4 pb-24">
        <div>
          <h1 className="text-2xl font-bold">Hey, Demo User!</h1>
          <p className="text-muted-foreground">Ready to train?</p>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={() => setShowStartSheet(true)}
        >
          <Plus className="mr-2 h-5 w-5" />
          Start Workout
        </Button>

        <WeeklyStatsGrid
          workoutCount={MOCK_DASHBOARD_STATS.weeklyWorkoutCount}
          workoutGoal={MOCK_DASHBOARD_STATS.weeklyGoal}
          totalSets={MOCK_DASHBOARD_STATS.weeklyTotalSets}
          totalVolume={MOCK_DASHBOARD_STATS.weeklyTotalVolume}
          totalDuration={MOCK_DASHBOARD_STATS.weeklyTotalDuration}
          unit={MOCK_DASHBOARD_STATS.preferredUnits}
          currentWeek={MOCK_DASHBOARD_STATS.currentWeek}
          onEditGoal={() => {}}
        />

        <TrainingLabCardDemo />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              Recent
            </h2>
            <Link
              href="/demo/history"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {MOCK_WORKOUTS.slice(0, 3).map((workout) => (
              <div key={workout.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">{workout.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workout.startedAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-4 border-t pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-mono font-medium">
                      {formatDuration(workout.totalDurationMinutes)}
                    </p>
                  </div>
                  {workout.totalSets > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Sets</p>
                      <p className="font-mono font-medium">{workout.totalSets}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Exercises</p>
                    <p className="font-mono font-medium">{workout.exerciseCount}</p>
                  </div>
                </div>
              </div>
          ))}
        </div>
      </section>
    </main>

    <StartWorkoutSheetDemo open={showStartSheet} onOpenChange={setShowStartSheet} />
  </div>
);
}
