import { Text, View } from "react-native";
import { Pencil } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/dashboard/weekly-stats-grid.tsx.
interface WeeklyStatsGridProps {
  workoutCount: number;
  workoutGoal: number;
  totalSets: number;
  totalVolume: number;
  totalDuration: number;
  unit: "kg" | "lb";
  currentWeek?: { date: string; dayName: string; hasWorkout: boolean }[];
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
    <View className="flex-row gap-1">
      {Array.from({ length: goal }).map((_, i) => (
        <View
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            i < current ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </View>
  );
}

function ActivityTracker({
  days,
}: {
  days: { date: string; dayName: string; hasWorkout: boolean }[];
}) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <View className="gap-1.5">
      <View className="h-6 flex-row gap-1">
        {days.map((day) => {
          const isToday = day.date === today;
          return (
            <View
              key={day.date}
              className={cn(
                "flex-1 border",
                day.hasWorkout
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30 bg-transparent",
                // RN has no ring utilities; today's marker uses a thicker
                // primary border instead of the web's offset ring.
                isToday && "border-2 border-primary",
              )}
            />
          );
        })}
      </View>
      <View className="flex-row gap-1">
        {days.map((day) => (
          <Text
            key={day.date}
            className="flex-1 text-center font-mono text-[10px] uppercase text-muted-foreground"
          >
            {day.dayName.charAt(0)}
          </Text>
        ))}
      </View>
    </View>
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
  const { colors } = useTheme();
  // Show duration for cardio-only weeks (no lifting volume), volume otherwise
  const showDurationInsteadOfVolume = totalVolume === 0 && totalDuration > 0;

  return (
    <View className="gap-4 rounded-lg border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          This Week
        </Text>
        {onEditGoal && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            accessibilityLabel="Edit weekly goal"
            onPress={onEditGoal}
          >
            <Pencil size={12} color={colors.mutedForeground} />
          </Button>
        )}
      </View>

      <View className="flex-row items-end justify-between">
        <View>
          <View className="flex-row items-baseline gap-1">
            <Text className="font-mono text-4xl font-bold text-foreground">
              {workoutCount}
            </Text>
            <Text className="font-mono text-xl text-muted-foreground">
              /{workoutGoal}
            </Text>
          </View>
          <Text className="mt-0.5 text-xs text-muted-foreground">workouts</Text>
        </View>

        <View className="flex-row gap-6">
          <View className="items-end">
            <Text className="font-mono text-2xl font-semibold text-foreground">
              {totalSets}
            </Text>
            <Text className="text-xs text-muted-foreground">sets</Text>
          </View>

          <View className="items-end">
            <Text className="font-mono text-2xl font-semibold text-foreground">
              {showDurationInsteadOfVolume
                ? formatDuration(totalDuration)
                : formatVolume(totalVolume)}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {showDurationInsteadOfVolume ? "time" : unit}
            </Text>
          </View>
        </View>
      </View>

      <SegmentedProgress current={workoutCount} goal={workoutGoal} />

      {currentWeek.length > 0 && (
        <View className="border-t border-border/50 pt-3">
          <ActivityTracker days={currentWeek} />
        </View>
      )}
    </View>
  );
}
