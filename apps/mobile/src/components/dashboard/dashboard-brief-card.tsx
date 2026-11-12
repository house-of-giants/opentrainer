import { Text, View } from "react-native";
import { ArrowRight, CalendarClock, Dumbbell, Flame, Play } from "lucide-react-native";
import type { WeightUnit } from "@opentrainer/lib/units";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NextSessionPreview } from "@/components/workout/next-session-preview";
import type { NextRoutineDay } from "@/hooks/use-next-session";
import { formatDuration } from "@/lib/utils";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/dashboard/dashboard-brief-card.tsx.
// The web card switches to a row layout at `sm:`; phones only ever get the
// stacked layout, so the responsive variants are dropped.
type DashboardBriefCardProps = {
  weeklyWorkoutCount: number;
  weeklyGoal: number;
  weeklyTotalSets: number;
  weeklyTotalDuration?: number;
  hasActiveWorkout: boolean;
  hasHistory: boolean;
  /** The next day of the lifter's routine; null without a routine. */
  nextSession: NextRoutineDay | null;
  unit: WeightUnit;
  isStartingNextSession: boolean;
  onStartNextSession: () => void;
  onStartWorkout: () => void;
  onContinueWorkout: () => void;
};

export function DashboardBriefCard({
  weeklyWorkoutCount,
  weeklyGoal,
  weeklyTotalSets,
  weeklyTotalDuration,
  hasActiveWorkout,
  hasHistory,
  nextSession,
  unit,
  isStartingNextSession,
  onStartNextSession,
  onStartWorkout,
  onContinueWorkout,
}: DashboardBriefCardProps) {
  const { colors } = useTheme();
  const workoutsLeft = Math.max(weeklyGoal - weeklyWorkoutCount, 0);
  const brief = hasActiveWorkout
    ? "Workout in progress. Pick up where you left off."
    : workoutsLeft === 0
      ? "Weekly goal complete. Anything extra is a bonus."
      : hasHistory
        ? `${workoutsLeft} session${workoutsLeft === 1 ? "" : "s"} left to hit this week's goal.`
        : "Log your first workout to start building history.";
  const cta = hasActiveWorkout ? "Continue workout" : "Start workout";
  const onPress = hasActiveWorkout ? onContinueWorkout : onStartWorkout;

  return (
    <Card className="gap-4 border-primary/30 bg-primary/5 p-4">
      {!hasActiveWorkout && nextSession ? (
        <View className="gap-3">
          <NextSessionPreview next={nextSession} unit={unit} />
          <Button
            size="sm"
            className="w-full"
            onPress={onStartNextSession}
            disabled={isStartingNextSession}
          >
            <Play size={14} color={colors.primaryForeground} />
            <Text className="text-sm font-medium text-primary-foreground">
              Start Day {nextSession.dayIndex + 1}
            </Text>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onPress={onStartWorkout}
            disabled={isStartingNextSession}
          >
            <Text className="text-sm text-muted-foreground">
              Pick another workout
            </Text>
          </Button>
        </View>
      ) : (
        <View className="gap-3">
          <View>
            <Text className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Today&apos;s brief
            </Text>
            <Text className="mt-1 text-lg font-semibold leading-tight text-foreground">
              {brief}
            </Text>
          </View>
          <Button size="sm" className="w-full" onPress={onPress}>
            <Text className="text-sm font-medium text-primary-foreground">{cta}</Text>
            <ArrowRight size={14} color={colors.primaryForeground} />
          </Button>
        </View>
      )}

      <View className="flex-row gap-2">
        <BriefMetric
          icon={Flame}
          label="Week"
          value={`${weeklyWorkoutCount}/${weeklyGoal}`}
        />
        <BriefMetric icon={Dumbbell} label="Sets" value={String(weeklyTotalSets)} />
        <BriefMetric
          icon={CalendarClock}
          label="Time"
          value={formatDuration(weeklyTotalDuration)}
        />
      </View>
    </Card>
  );
}

function BriefMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View className="flex-1 rounded-lg border border-border bg-background px-2.5 py-2">
      <Icon size={14} color={colors.mutedForeground} />
      <Text
        numberOfLines={1}
        className="mt-1 font-mono text-sm font-semibold text-foreground"
      >
        {value}
      </Text>
      <Text
        numberOfLines={1}
        className="text-[10px] uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </Text>
    </View>
  );
}
