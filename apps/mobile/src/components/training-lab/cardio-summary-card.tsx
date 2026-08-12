import { Text, View } from "react-native";
import { Activity, Route, Timer } from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/training-lab/cardio-summary-card.tsx. The
// web card's cyan→blue CSS gradient becomes the flat cyan tint it resolves to
// (same convention as training-lab-card.tsx).
const CYAN = "#06b6d4"; // cyan-500

interface CardioSummaryCardProps {
  totalMinutes: number;
  totalDistance: number;
  distanceUnit: "km" | "mi";
  avgRpe: number;
  topModality: string | null;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatModality(modality: string): string {
  return modality
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const WEEKLY_CARDIO_TARGET = 150;

export function CardioSummaryCard({
  totalMinutes,
  totalDistance,
  distanceUnit,
  avgRpe,
  topModality,
}: CardioSummaryCardProps) {
  const { colors } = useTheme();
  const progressPercent = Math.min((totalMinutes / WEEKLY_CARDIO_TARGET) * 100, 100);
  const isTargetMet = totalMinutes >= WEEKLY_CARDIO_TARGET;

  return (
    <Card className="border-cyan-500/20 bg-cyan-500/10 p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Activity size={20} color={CYAN} />
          <Text className="font-semibold text-cyan-600 dark:text-cyan-400">
            Cardio This Week
          </Text>
        </View>
        {topModality && (
          <Badge
            variant="outline"
            className="border-cyan-500/20 bg-cyan-500/10"
            textClassName="text-cyan-600"
          >
            {formatModality(topModality)}
          </Badge>
        )}
      </View>

      <View className="mb-3 flex-row gap-4">
        <View className="flex-1 flex-row items-center gap-2">
          <Timer size={16} color={colors.mutedForeground} />
          <View>
            <Text className="font-mono text-xl font-bold text-foreground">
              {formatDuration(totalMinutes)}
            </Text>
            <Text className="text-xs text-muted-foreground">Duration</Text>
          </View>
        </View>
        {totalDistance > 0 && (
          <View className="flex-1 flex-row items-center gap-2">
            <Route size={16} color={colors.mutedForeground} />
            <View>
              <Text className="font-mono text-xl font-bold text-foreground">
                {totalDistance.toFixed(1)}{" "}
                <Text className="text-sm font-normal">{distanceUnit}</Text>
              </Text>
              <Text className="text-xs text-muted-foreground">Distance</Text>
            </View>
          </View>
        )}
      </View>

      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-muted-foreground">
            Weekly goal (150 min)
          </Text>
          <Text
            className={
              isTargetMet
                ? "text-xs font-medium text-green-500"
                : "text-xs text-muted-foreground"
            }
          >
            {Math.round(progressPercent)}%
          </Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-muted">
          <View
            className={isTargetMet ? "h-full bg-green-500" : "h-full bg-cyan-500"}
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      </View>

      {avgRpe > 0 && (
        <View className="mt-3 border-t border-cyan-500/10 pt-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">Avg Intensity</Text>
            <Badge variant="outline" textClassName="font-mono">
              {`RPE ${avgRpe}`}
            </Badge>
          </View>
        </View>
      )}
    </Card>
  );
}
