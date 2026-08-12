import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Activity,
  Dumbbell,
  Info,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

// Port of apps/web/src/components/training-lab/training-load-card.tsx.
const AMBER = "#f59e0b"; // amber-500
const CYAN = "#06b6d4"; // cyan-500
const GREEN = "#22c55e"; // green-500
const RED = "#ef4444"; // red-500

type TrainingProfile = "strength_focused" | "cardio_focused" | "hybrid" | "general_fitness";

interface TrainingLoadCardProps {
  total: number;
  liftingPercent: number;
  cardioPercent: number;
  changePercent: number | null;
  profile: TrainingProfile;
}

const profileConfig: Record<
  TrainingProfile,
  { label: string; textClass: string; badgeClass: string }
> = {
  strength_focused: {
    label: "Strength",
    textClass: "text-amber-500",
    badgeClass: "bg-amber-500/10 border-amber-500/20",
  },
  cardio_focused: {
    label: "Cardio",
    textClass: "text-cyan-500",
    badgeClass: "bg-cyan-500/10 border-cyan-500/20",
  },
  hybrid: {
    label: "Hybrid",
    textClass: "text-violet-500",
    badgeClass: "bg-violet-500/10 border-violet-500/20",
  },
  general_fitness: {
    label: "General",
    textClass: "text-muted-foreground",
    badgeClass: "bg-muted border-muted",
  },
};

export function TrainingLoadCard({
  total,
  liftingPercent,
  cardioPercent,
  changePercent,
  profile,
}: TrainingLoadCardProps) {
  const { colors } = useTheme();
  const [showInfo, setShowInfo] = useState(false);
  const config = profileConfig[profile];
  const showSplit = liftingPercent > 0 && cardioPercent > 0;

  return (
    <Card className="p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Zap size={20} color={colors.primary} />
          <Text className="font-semibold text-foreground">Training Load</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="What is training load?"
            hitSlop={8}
            onPress={() => setShowInfo(!showInfo)}
          >
            <Info size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <Badge variant="outline" className={config.badgeClass}>
          <Text className={cn("text-xs font-medium", config.textClass)}>
            {config.label}
          </Text>
        </Badge>
      </View>

      {showInfo && (
        <View className="mb-4 flex-row items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
          <Text className="flex-1 text-sm text-muted-foreground">
            Training load combines workout duration and intensity (RPE) into a
            single number. Use it to track trends over time — a rising load means
            you&apos;re doing more work, which may require more recovery.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            hitSlop={8}
            onPress={() => setShowInfo(false)}
          >
            <X size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      <View className="mb-4 flex-row items-end justify-between">
        <View>
          <Text className="font-mono text-3xl font-bold text-foreground">
            {total.toLocaleString()}
          </Text>
          <Text className="text-xs text-muted-foreground">This week</Text>
        </View>
        {changePercent !== null && (
          <Badge
            variant="outline"
            className={
              changePercent > 0
                ? "border-green-500/30"
                : changePercent < 0
                  ? "border-red-500/30"
                  : undefined
            }
          >
            {changePercent > 0 ? (
              <TrendingUp size={12} color={GREEN} />
            ) : changePercent < 0 ? (
              <TrendingDown size={12} color={RED} />
            ) : null}
            <Text
              className={cn(
                "text-xs font-medium",
                changePercent > 0
                  ? "text-green-500"
                  : changePercent < 0
                    ? "text-red-500"
                    : "text-muted-foreground",
              )}
            >
              {changePercent > 0 ? "+" : ""}
              {changePercent}%
            </Text>
          </Badge>
        )}
      </View>

      {showSplit && (
        <View className="gap-2">
          <View className="h-3 flex-row overflow-hidden rounded-full bg-muted">
            {liftingPercent > 0 && (
              <View
                className="bg-amber-500"
                style={{ width: `${liftingPercent}%` }}
              />
            )}
            {cardioPercent > 0 && (
              <View className="bg-cyan-500" style={{ width: `${cardioPercent}%` }} />
            )}
          </View>
          <View className="flex-row justify-between">
            <View className="flex-row items-center gap-1">
              <Dumbbell size={12} color={AMBER} />
              <Text className="text-xs text-muted-foreground">Lifting</Text>
              <Text className="font-mono text-xs font-medium text-foreground">
                {liftingPercent}%
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Activity size={12} color={CYAN} />
              <Text className="text-xs text-muted-foreground">Cardio</Text>
              <Text className="font-mono text-xs font-medium text-foreground">
                {cardioPercent}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {!showSplit && liftingPercent === 100 && (
        <View className="flex-row items-center gap-2">
          <Dumbbell size={16} color={AMBER} />
          <Text className="text-sm text-muted-foreground">
            All lifting this week
          </Text>
        </View>
      )}

      {!showSplit && cardioPercent === 100 && (
        <View className="flex-row items-center gap-2">
          <Activity size={16} color={CYAN} />
          <Text className="text-sm text-muted-foreground">
            All cardio this week
          </Text>
        </View>
      )}
    </Card>
  );
}
