import { useEffect } from "react";
import { ViewProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { cn } from "@/lib/cn";

function Skeleton({ className, ...props }: ViewProps & { className?: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.5, { duration: 800 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={style}
      className={cn("rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
