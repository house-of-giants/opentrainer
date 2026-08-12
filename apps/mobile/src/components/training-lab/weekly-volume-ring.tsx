import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

// Port of apps/web/src/components/training-lab/weekly-volume-ring.tsx using
// react-native-svg. Web draws in a 100x100 viewBox at w-28 (112px).
const GREEN = "#22c55e"; // green-500
const YELLOW = "#eab308"; // yellow-500

const RING_SIZE = 112;
const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface WeeklyVolumeRingProps {
  current: number;
  target: number;
  label?: string;
}

export function WeeklyVolumeRing({
  current,
  target,
  label = "Weekly Sets",
}: WeeklyVolumeRingProps) {
  const { colors } = useTheme();
  const percentage = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;
  const progress = (percentage / 100) * CIRCUMFERENCE;

  const ringColor = isComplete
    ? GREEN
    : percentage >= 75
      ? colors.primary
      : percentage >= 50
        ? YELLOW
        : colors.mutedForeground;
  const ringTextClass = isComplete
    ? "text-green-500"
    : percentage >= 75
      ? "text-primary"
      : percentage >= 50
        ? "text-yellow-500"
        : "text-muted-foreground";

  return (
    <View className="items-center gap-2">
      <View style={{ width: RING_SIZE, height: RING_SIZE }}>
        <Svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox="0 0 100 100"
          style={{ transform: [{ rotate: "-90deg" }] }}
        >
          <Circle
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            stroke={colors.muted}
            strokeOpacity={0.2}
            strokeWidth={8}
          />
          <Circle
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${CIRCUMFERENCE}`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className={cn("font-mono text-2xl font-bold", ringTextClass)}>
            {current}
          </Text>
          <Text className="text-xs text-muted-foreground">/{target}</Text>
        </View>
      </View>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

interface MultiRingProps {
  workouts: { current: number; target: number };
  sets: { current: number; target: number };
}

export function WorkoutProgressRings({ workouts, sets }: MultiRingProps) {
  return (
    <View className="flex-row items-center justify-around py-4">
      <WeeklyVolumeRing
        current={workouts.current}
        target={workouts.target}
        label="Workouts"
      />
      <WeeklyVolumeRing current={sets.current} target={sets.target} label="Sets" />
    </View>
  );
}
