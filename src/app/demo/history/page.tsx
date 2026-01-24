"use client";

import { Card } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { MOCK_WORKOUTS } from "@/lib/demo-data";

type GroupedWorkouts = {
  key: string;
  label: string;
  workouts: typeof MOCK_WORKOUTS;
};

export default function DemoHistory() {
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

  const groupWorkoutsByMonth = (): GroupedWorkouts[] => {
    const groups: Record<string, typeof MOCK_WORKOUTS> = {};

    for (const workout of MOCK_WORKOUTS) {
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
          year: "numeric",
        }),
        workouts: items,
      }));
  };

  const groupedWorkouts = groupWorkoutsByMonth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center px-4">
          <h1 className="font-semibold text-lg">Workout History</h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        <div className="space-y-6">
          {groupedWorkouts.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 text-sm font-mono uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.workouts.map((workout) => (
                  <Card key={workout.id} className="p-4 transition-colors hover:bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{workout.title}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(workout.startedAt)}
                          </span>
                          {formatDuration(workout.totalDurationMinutes) && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(workout.totalDurationMinutes)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-medium tabular-nums">
                          {workout.totalSets > 0 ? `${workout.totalSets} sets` : `${workout.exerciseCount} exercises`}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono tabular-nums">
                          {workout.totalSets > 0 ? `${workout.exerciseCount} exercises` : ""}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
