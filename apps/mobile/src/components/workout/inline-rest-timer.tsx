import { useState, useEffect, useCallback, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/use-haptic";
import { useRestEndNotification } from "@/hooks/use-rest-end-notification";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

interface InlineRestTimerProps {
  defaultSeconds?: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

export function InlineRestTimer({
  defaultSeconds = 90,
  onComplete,
  autoStart = false,
}: InlineRestTimerProps) {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [hasCompleted, setHasCompleted] = useState(false);
  const { vibrate } = useHaptic();
  const { colors } = useTheme();
  const { scheduleIn, cancel: cancelNotification } = useRestEndNotification();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (autoStart) scheduleIn(defaultSeconds);
    // Mount-only, mirroring the web timer's autoStart semantics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            setHasCompleted(true);
            vibrate("success");
            cancelNotification();
            onComplete?.();
            return 0;
          }
          if (prev <= 4) {
            vibrate("light");
          }
          return prev - 1;
        });
      }, 1000);
    }

    return clearTimer;
  }, [isRunning, seconds, clearTimer, vibrate, onComplete, cancelNotification]);

  const handleToggle = () => {
    let nextSeconds = seconds;
    if (hasCompleted) {
      nextSeconds = defaultSeconds;
      setSeconds(defaultSeconds);
      setTotalSeconds(defaultSeconds);
      setHasCompleted(false);
    }
    if (isRunning) {
      cancelNotification();
    } else {
      scheduleIn(nextSeconds);
    }
    setIsRunning((prev) => !prev);
    vibrate("light");
  };

  const handleAdjust = (delta: number) => {
    const next = Math.max(0, seconds + delta);
    setSeconds(next);
    if (delta > 0) {
      setTotalSeconds((prev) => prev + delta);
    }
    if (isRunning) {
      scheduleIn(next);
    }
    vibrate("light");
  };

  const formatTime = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const elapsed = totalSeconds - seconds;
  const progress = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;
  const CIRCLE_RADIUS = 14;
  const circumference = 2 * Math.PI * CIRCLE_RADIUS;
  const accent = hasCompleted ? "#22c55e" : colors.primary;

  return (
    <View
      className={cn(
        "flex-row items-center gap-3 rounded-lg px-3 py-2",
        hasCompleted ? "bg-green-500/10" : "bg-muted/50",
      )}
    >
      <Pressable
        onPress={handleToggle}
        className="relative h-10 w-10 shrink-0 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={isRunning ? "Pause timer" : "Start timer"}
      >
        <Svg
          className="absolute h-full w-full"
          viewBox="0 0 36 36"
          style={{ transform: [{ rotate: "-90deg" }] }}
        >
          <Circle
            cx={18}
            cy={18}
            r={CIRCLE_RADIUS}
            fill="none"
            stroke={colors.muted}
            strokeWidth={3}
          />
          <Circle
            cx={18}
            cy={18}
            r={CIRCLE_RADIUS}
            fill="none"
            stroke={accent}
            strokeWidth={3}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference * (1 - progress / 100)}
            strokeLinecap="round"
          />
        </Svg>
        <View className="z-10">
          {isRunning ? (
            <View className="flex-row gap-0.5">
              <View
                className="h-2.5 w-1 rounded-sm"
                style={{ backgroundColor: accent }}
              />
              <View
                className="h-2.5 w-1 rounded-sm"
                style={{ backgroundColor: accent }}
              />
            </View>
          ) : (
            <View
              className="h-0 w-0"
              style={{
                borderTopWidth: 5,
                borderBottomWidth: 5,
                borderLeftWidth: 8,
                borderTopColor: "transparent",
                borderBottomColor: "transparent",
                borderLeftColor: accent,
              }}
            />
          )}
        </View>
      </Pressable>

      <View className="flex-1 flex-col items-center">
        <Text
          className={cn(
            "font-mono text-2xl font-bold tabular-nums text-foreground",
            hasCompleted && "text-green-500",
          )}
        >
          {formatTime(seconds)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {hasCompleted
            ? "Rest complete"
            : isRunning
              ? "Resting..."
              : "Tap to start"}
        </Text>
      </View>

      <View className="flex-row items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 px-0"
          textClassName="text-xs"
          onPress={() => handleAdjust(-15)}
        >
          -15
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 px-0"
          textClassName="text-xs"
          onPress={() => handleAdjust(15)}
        >
          +15
        </Button>
      </View>
    </View>
  );
}
