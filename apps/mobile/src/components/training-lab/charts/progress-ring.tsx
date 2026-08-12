import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

// Port of apps/web/src/components/training-lab/charts/progress-ring.tsx.
// The inline web SVG maps 1:1 onto react-native-svg; tailwind text-* stroke
// colors become explicit hex values.
type RingColor = "primary" | "success" | "warning" | "danger";

const sizeConfig = {
  sm: { size: 48, strokeWidth: 4, fontClass: "text-sm", radius: 20 },
  md: { size: 80, strokeWidth: 6, fontClass: "text-xl", radius: 34 },
  lg: { size: 120, strokeWidth: 8, fontClass: "text-3xl", radius: 52 },
};

const RING_COLORS: Record<Exclude<RingColor, "primary">, string> = {
  success: "#22c55e", // green-500
  warning: "#eab308", // yellow-500
  danger: "#ef4444", // red-500
};

const ringTextClass: Record<RingColor, string> = {
  primary: "text-primary",
  success: "text-green-500",
  warning: "text-yellow-500",
  danger: "text-red-500",
};

interface ProgressRingProps {
  value: number;
  max: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  sublabel?: string;
  showValue?: boolean;
  color?: RingColor;
}

export function ProgressRing({
  value,
  max,
  size = "md",
  label,
  sublabel,
  showValue = true,
  color = "primary",
}: ProgressRingProps) {
  const { colors } = useTheme();
  const config = sizeConfig[size];
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * config.radius;
  const progress = (percentage / 100) * circumference;
  const strokeColor = color === "primary" ? colors.primary : RING_COLORS[color];

  return (
    <View className="items-center gap-1">
      <View style={{ width: config.size, height: config.size }}>
        <Svg
          width={config.size}
          height={config.size}
          viewBox={`0 0 ${config.size} ${config.size}`}
          style={{ transform: [{ rotate: "-90deg" }] }}
        >
          <Circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={config.radius}
            fill="none"
            stroke={colors.muted}
            strokeOpacity={0.3}
            strokeWidth={config.strokeWidth}
          />
          <Circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={config.radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
          />
        </Svg>
        {showValue && (
          <View className="absolute inset-0 items-center justify-center">
            <Text
              className={cn(
                "font-mono font-bold",
                config.fontClass,
                ringTextClass[color],
              )}
            >
              {value}
            </Text>
          </View>
        )}
      </View>
      {(label || sublabel) && (
        <View className="items-center">
          {label && (
            <Text className="text-sm font-medium text-foreground">{label}</Text>
          )}
          {sublabel && (
            <Text className="text-xs text-muted-foreground">{sublabel}</Text>
          )}
        </View>
      )}
    </View>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  color?: RingColor;
  size?: "sm" | "md";
}

const barColorClass: Record<RingColor, string> = {
  primary: "bg-primary",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
};

export function ProgressBar({
  value,
  max,
  label,
  showValue = true,
  color = "primary",
  size = "md",
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const heightClass = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <View className="w-full">
      {(label || showValue) && (
        <View className="mb-1 flex-row items-center justify-between">
          {label && (
            <Text className="text-sm text-muted-foreground">{label}</Text>
          )}
          {showValue && (
            <Text className="font-mono text-xs text-foreground">
              {value}/{max}
            </Text>
          )}
        </View>
      )}
      <View
        className={cn("w-full overflow-hidden rounded-full bg-muted/30", heightClass)}
      >
        <View
          className={cn("rounded-full", heightClass, barColorClass[color])}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
}
