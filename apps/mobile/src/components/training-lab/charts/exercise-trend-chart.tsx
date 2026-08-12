import { Text, View } from "react-native";
import { Minus, TrendingDown, TrendingUp } from "lucide-react-native";
import type { WeightUnit } from "@opentrainer/lib/units";

import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

import { formatTopWeight } from "./transforms";

// Port of apps/web/src/components/training-lab/charts/exercise-trend-chart.tsx.
// The web component is a card list, not a plotted chart, so no chart library is
// needed. The unused ExerciseSparkline export was not ported.
const GREEN = "#22c55e"; // green-500
const RED = "#ef4444"; // red-500

export interface ExerciseTrendData {
  exercise: string;
  sessions: number;
  trend: "up" | "down" | "flat";
  topWeight: number;
  weightUnit?: WeightUnit;
  avgRpe: number;
}

interface ExerciseTrendChartProps {
  data: ExerciseTrendData[];
  weightUnit?: WeightUnit;
}

function TrendBadge({ trend }: { trend: "up" | "down" | "flat" }) {
  const { colors } = useTheme();
  const containerClass = {
    up: "bg-green-500/10 border-green-500/20",
    down: "bg-red-500/10 border-red-500/20",
    flat: "bg-muted border-muted-foreground/20",
  }[trend];
  const textClass = {
    up: "text-green-500",
    down: "text-red-500",
    flat: "text-muted-foreground",
  }[trend];
  const icon =
    trend === "up" ? (
      <TrendingUp size={14} color={GREEN} />
    ) : trend === "down" ? (
      <TrendingDown size={14} color={RED} />
    ) : (
      <Minus size={14} color={colors.mutedForeground} />
    );

  return (
    <View
      className={cn(
        "flex-row items-center gap-1 rounded-full border px-2 py-0.5",
        containerClass,
      )}
    >
      {icon}
      <Text className={cn("text-xs font-medium", textClass)}>
        {trend === "up" ? "Progressing" : trend === "down" ? "Declining" : "Steady"}
      </Text>
    </View>
  );
}

export function ExerciseTrendChart({ data, weightUnit }: ExerciseTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <View className="h-[200px] items-center justify-center">
        <Text className="text-sm text-muted-foreground">
          No exercise trend data available
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {data.slice(0, 6).map((exercise) => {
        const topWeight = formatTopWeight(
          exercise.topWeight,
          exercise.weightUnit ?? weightUnit,
        );

        return (
          <View
            key={exercise.exercise}
            className="flex-row items-center justify-between rounded-lg border border-border bg-card p-3"
          >
            <View className="min-w-0 flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text
                  numberOfLines={1}
                  className="shrink font-medium text-foreground"
                >
                  {exercise.exercise}
                </Text>
                <TrendBadge trend={exercise.trend} />
              </View>
              <View className="mt-1 flex-row items-center gap-3">
                <Text className="text-sm text-muted-foreground">
                  {exercise.sessions} sessions
                </Text>
                {exercise.avgRpe > 0 && (
                  <Text className="text-sm text-muted-foreground">
                    Avg RPE: {exercise.avgRpe.toFixed(1)}
                  </Text>
                )}
              </View>
            </View>
            <View className="items-end">
              {exercise.topWeight > 0 ? (
                <>
                  <Text className="font-mono font-semibold text-foreground">
                    {topWeight.label}
                  </Text>
                  {topWeight.unitUnavailable && (
                    <Text className="text-xs text-muted-foreground">
                      Stored unit unavailable
                    </Text>
                  )}
                </>
              ) : (
                <Text className="text-sm text-muted-foreground">—</Text>
              )}
              <Text className="text-xs text-muted-foreground">Top weight</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
