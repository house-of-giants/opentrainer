"use client";

import { Flame } from "lucide-react";

interface StreakBadgeProps {
  weeks: number;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { icon: "h-4 w-4", text: "text-sm", container: "gap-1" },
  md: { icon: "h-5 w-5", text: "text-lg", container: "gap-1.5" },
  lg: { icon: "h-6 w-6", text: "text-2xl", container: "gap-2" },
};

export function StreakBadge({ weeks, size = "md" }: StreakBadgeProps) {
  const config = sizeConfig[size];
  const isActive = weeks > 0;
  const isMilestone = weeks >= 4;
  const isEpic = weeks >= 8;
  const isLegendary = weeks >= 12;

  const flameColor = isLegendary
    ? "text-purple-500"
    : isEpic
      ? "text-red-500"
      : isMilestone
        ? "text-orange-500"
        : isActive
          ? "text-orange-400"
          : "text-muted-foreground";

  const bgColor = isLegendary
    ? "bg-purple-500/10"
    : isEpic
      ? "bg-red-500/10"
      : isMilestone
        ? "bg-orange-500/10"
        : isActive
          ? "bg-orange-400/10"
          : "bg-muted";

  return (
    <div
      className={`inline-flex items-center ${config.container} px-2 py-1 rounded-full ${bgColor}`}
    >
      <Flame
        className={`${config.icon} ${flameColor} ${isActive ? "animate-pulse" : ""}`}
      />
      <span className={`font-bold font-mono ${config.text} ${flameColor}`}>
        {weeks}
      </span>
    </div>
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
    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border">
      <StreakBadge weeks={currentStreak} size="lg" />
      <div className="text-center">
        <div className="text-sm font-medium">{streakLabel}</div>
        <div className="text-xs text-muted-foreground">
          Week streak • Best: {longestStreak}
        </div>
      </div>
    </div>
  );
}
