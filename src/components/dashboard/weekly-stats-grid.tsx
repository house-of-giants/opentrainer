"use client";

import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeeklyStatsGridProps {
  workoutCount: number;
  workoutGoal: number;
  totalSets: number;
  totalVolume: number;
  totalDuration: number;
  unit: "kg" | "lb";
  currentWeek?: Array<{ date: string; dayName: string; hasWorkout: boolean }>;
  onEditGoal?: () => void;
}

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k`;
  }
  return volume.toLocaleString();
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function SegmentedProgress({ current, goal }: { current: number; goal: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: goal }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i < current ? "bg-primary" : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

function ActivityTracker({
  days,
}: {
  days: Array<{ date: string; dayName: string; hasWorkout: boolean }>;
}) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1 h-6">
        {days.map((day) => {
          const isToday = day.date === today;
          return (
            <div
              key={day.date}
              className={cn(
                "flex-1 border transition-colors",
                day.hasWorkout 
                  ? "bg-primary border-primary" 
                  : "bg-transparent border-muted-foreground/30",
                isToday && "ring-1 ring-primary ring-offset-2 ring-offset-background"
              )}
            />
          );
        })}
      </div>
      <div className="flex gap-1">
        {days.map((day) => (
          <span
            key={day.date}
            className="flex-1 text-center text-[10px] text-muted-foreground font-mono uppercase"
          >
            {day.dayName.charAt(0)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WeeklyStatsGrid({
  workoutCount,
  workoutGoal,
  totalSets,
  totalVolume,
  totalDuration,
  unit,
  currentWeek = [],
  onEditGoal,
}: WeeklyStatsGridProps) {
  const showDurationInsteadOfVolume = totalVolume === 0 && totalDuration > 0;
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          This Week
        </span>
        {onEditGoal && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onEditGoal}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-mono font-bold tabular-nums">
              {workoutCount}
            </span>
            <span className="text-xl text-muted-foreground font-mono">
              /{workoutGoal}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">workouts</div>
        </div>

        <div className="flex gap-6">
          <div className="text-right">
            <div className="text-2xl font-mono font-semibold tabular-nums">
              {totalSets}
            </div>
            <div className="text-xs text-muted-foreground">sets</div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-mono font-semibold tabular-nums">
              {showDurationInsteadOfVolume ? formatDuration(totalDuration) : formatVolume(totalVolume)}
            </div>
            <div className="text-xs text-muted-foreground">
              {showDurationInsteadOfVolume ? "time" : unit}
            </div>
          </div>
        </div>
      </div>

      <SegmentedProgress current={workoutCount} goal={workoutGoal} />

      {currentWeek.length > 0 && (
        <div className="pt-3 border-t border-border/50">
          <ActivityTracker days={currentWeek} />
        </div>
      )}
    </div>
  );
}
