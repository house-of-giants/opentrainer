import { Text, View } from "react-native";
import { Flame } from "lucide-react-native";

import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

// Port of apps/web/src/components/training-lab/streak-badge.tsx. Web's
// animate-pulse flame is rendered statically; the tier colors are unchanged.
const TIER_COLORS = {
  legendary: "#a855f7", // purple-500
  epic: "#ef4444", // red-500
  milestone: "#f97316", // orange-500
  active: "#fb923c", // orange-400
};

interface StreakBadgeProps {
  weeks: number;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { icon: 16, textClass: "text-sm", gapClass: "gap-1" },
  md: { icon: 20, textClass: "text-lg", gapClass: "gap-1.5" },
  lg: { icon: 24, textClass: "text-2xl", gapClass: "gap-2" },
};

export function StreakBadge({ weeks, size = "md" }: StreakBadgeProps) {
  const { colors } = useTheme();
  const config = sizeConfig[size];
  const isActive = weeks > 0;
  const isMilestone = weeks >= 4;
  const isEpic = weeks >= 8;
  const isLegendary = weeks >= 12;

  const flameColor = isLegendary
    ? TIER_COLORS.legendary
    : isEpic
      ? TIER_COLORS.epic
      : isMilestone
        ? TIER_COLORS.milestone
        : isActive
          ? TIER_COLORS.active
          : colors.mutedForeground;

  const textClass = isLegendary
    ? "text-purple-500"
    : isEpic
      ? "text-red-500"
      : isMilestone
        ? "text-orange-500"
        : isActive
          ? "text-orange-400"
          : "text-muted-foreground";

  const bgClass = isLegendary
    ? "bg-purple-500/10"
    : isEpic
      ? "bg-red-500/10"
      : isMilestone
        ? "bg-orange-500/10"
        : isActive
          ? "bg-orange-400/10"
          : "bg-muted";

  return (
    <View
      className={cn(
        "flex-row items-center self-center rounded-full px-2 py-1",
        config.gapClass,
        bgClass,
      )}
    >
      <Flame size={config.icon} color={flameColor} />
      <Text className={cn("font-mono font-bold", config.textClass, textClass)}>
        {weeks}
      </Text>
    </View>
  );
}

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  const streakLabel =
    currentStreak >= 12
      ? "Legendary!"
      : currentStreak >= 8
        ? "Epic Streak!"
        : currentStreak >= 4
          ? "On Fire!"
          : currentStreak > 0
            ? "Keep Going!"
            : "Start Your Streak";

  return (
    <View className="items-center gap-2 rounded-lg border border-border bg-card p-4">
      <StreakBadge weeks={currentStreak} size="lg" />
      <View className="items-center">
        <Text className="text-sm font-medium text-foreground">{streakLabel}</Text>
        <Text className="text-xs text-muted-foreground">
          Week streak • Best: {longestStreak}
        </Text>
      </View>
    </View>
  );
}
