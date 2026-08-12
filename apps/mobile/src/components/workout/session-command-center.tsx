import { Text, View } from "react-native";
import {
  ArrowDown,
  CheckCircle2,
  Dumbbell,
  Gauge,
  Target,
  type LucideIcon,
} from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

type SessionCommandCenterProps = {
  duration: string;
  exerciseCount: number;
  currentExerciseName?: string;
  nextExerciseName?: string;
  loggedSets: number;
  targetSets: number;
  totalVolume: number;
  unit: "lb" | "kg";
  onJumpToCurrent: () => void;
};

function formatVolume(volume: number, unit: "lb" | "kg") {
  if (volume <= 0) return `0 ${unit}`;
  if (volume >= 1000) return `${Math.round(volume / 100) / 10}k ${unit}`;
  return `${Math.round(volume)} ${unit}`;
}

export function SessionCommandCenter({
  duration,
  exerciseCount,
  currentExerciseName,
  nextExerciseName,
  loggedSets,
  targetSets,
  totalVolume,
  unit,
  onJumpToCurrent,
}: SessionCommandCenterProps) {
  const { colors } = useTheme();
  const hasPlan = exerciseCount > 0;
  const progress =
    targetSets > 0
      ? Math.min(100, Math.round((loggedSets / targetSets) * 100))
      : loggedSets > 0
        ? 100
        : 0;
  const setsRemaining = Math.max(targetSets - loggedSets, 0);
  const nextAction = !hasPlan
    ? "Add an exercise to get started."
    : setsRemaining === 0
      ? "All planned sets logged. Finish up or add extra work."
      : currentExerciseName
        ? `Log ${currentExerciseName}`
        : "Choose your first exercise.";

  return (
    <Card className="gap-4 border-primary/30 bg-primary/10 p-4">
      <View className="gap-2">
        <View className="min-w-0">
          <Text className="font-mono text-xs uppercase tracking-[2px] text-muted-foreground">
            Session overview
          </Text>
          <Text
            numberOfLines={1}
            className="mt-1 text-lg font-semibold text-foreground"
          >
            {nextAction}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-sm text-muted-foreground">
            {nextExerciseName
              ? `Up next: ${nextExerciseName}.`
              : "Log sets as you go."}
          </Text>
        </View>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onPress={onJumpToCurrent}
          disabled={!hasPlan || !currentExerciseName}
        >
          <ArrowDown size={14} color={colors.foreground} />
          <Text className="text-sm font-medium text-foreground">
            Current exercise
          </Text>
        </Button>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-muted-foreground">
            {loggedSets}/{targetSets || loggedSets} planned sets
          </Text>
          <Text className="text-xs text-muted-foreground">{progress}%</Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-muted">
          <View
            className={cn(
              "h-full rounded-full bg-primary",
              progress === 100 && "bg-green-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Metric icon={Gauge} label="Time" value={duration || "0m"} />
        <Metric
          icon={CheckCircle2}
          label="Left"
          value={targetSets > 0 ? String(setsRemaining) : "—"}
        />
        <Metric icon={Dumbbell} label="Volume" value={formatVolume(totalVolume, unit)} />
        <Metric icon={Target} label="Moves" value={String(exerciseCount)} />
      </View>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View className="min-w-0 flex-1 basis-[22%] items-center rounded-lg border border-border bg-background/70 px-2 py-2">
      <Icon size={14} color={colors.mutedForeground} />
      <Text
        numberOfLines={1}
        className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground"
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
