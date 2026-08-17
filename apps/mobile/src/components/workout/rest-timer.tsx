import { useState, useEffect, useCallback, useRef } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/use-haptic";
import { useRestEndNotification } from "@/hooks/use-rest-end-notification";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

interface RestTimerProps {
  defaultSeconds?: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

export function RestTimer({
  defaultSeconds = 90,
  onComplete,
  autoStart = false,
}: RestTimerProps) {
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

  // Native win: schedule the "rest over" local notification whenever the
  // timer starts, so a locked/backgrounded phone still gets nudged.
  useEffect(() => {
    if (autoStart) scheduleIn(defaultSeconds);
    // Intentionally mount-only, mirroring the web timer's autoStart semantics.
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

  const handleStartPause = () => {
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

  const handleReset = () => {
    clearTimer();
    setIsRunning(false);
    setHasCompleted(false);
    setSeconds(defaultSeconds);
    setTotalSeconds(defaultSeconds);
    cancelNotification();
    vibrate("medium");
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
  const circumference = 2 * Math.PI * 58;

  return (
    <View className="flex-col items-center gap-4 rounded-xl border border-border bg-card p-6">
      <Text className="text-sm font-medium text-muted-foreground">
        Rest Timer
      </Text>

      <View className="relative h-32 w-32 items-center justify-center">
        <Svg
          className="absolute h-full w-full"
          viewBox="0 0 128 128"
          style={{ transform: [{ rotate: "-90deg" }] }}
        >
          <Circle
            cx={64}
            cy={64}
            r={58}
            fill="none"
            stroke={colors.muted}
            strokeWidth={8}
          />
          <Circle
            cx={64}
            cy={64}
            r={58}
            fill="none"
            stroke={hasCompleted ? "#22c55e" : colors.primary}
            strokeWidth={8}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference * (1 - progress / 100)}
            strokeLinecap="round"
          />
        </Svg>
        <Text
          className={cn(
            "font-mono text-4xl font-bold tabular-nums text-foreground",
            hasCompleted && "text-green-500",
          )}
        >
          {formatTime(seconds)}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 px-0"
          onPress={() => handleAdjust(-15)}
        >
          -15
        </Button>
        <Button size="lg" className="h-14 w-24" onPress={handleStartPause}>
          {isRunning ? "Pause" : hasCompleted ? "Restart" : "Start"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 px-0"
          onPress={() => handleAdjust(15)}
        >
          +15
        </Button>
      </View>

      {(isRunning || seconds !== defaultSeconds) && (
        <Button
          variant="ghost"
          size="sm"
          onPress={handleReset}
          textClassName="text-muted-foreground"
        >
          Reset
        </Button>
      )}
    </View>
  );
}
