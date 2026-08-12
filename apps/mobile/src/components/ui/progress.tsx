import { View, ViewProps } from "react-native";

import { cn } from "@/lib/cn";

interface ProgressProps extends ViewProps {
  value?: number | null;
  className?: string;
  indicatorClassName?: string;
}

function Progress({
  value,
  className,
  indicatorClassName,
  ...props
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <View
        className={cn("h-full rounded-full bg-primary", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </View>
  );
}

export { Progress };
