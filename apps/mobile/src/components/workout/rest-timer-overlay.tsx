import { useState, useEffect, useCallback, useRef } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { X } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/use-haptic";
import { useRestEndNotification } from "@/hooks/use-rest-end-notification";
import { useTheme } from "@/theme/theme-provider";
import { themes } from "@/theme/tokens";
import { cn } from "@/lib/cn";

interface RestTimerOverlayProps {
  durationSeconds?: number;
  onComplete: () => void;
  onSkip: () => void;
}

export function RestTimerOverlay({
  durationSeconds = 90,
  onComplete,
  onSkip,
}: RestTimerOverlayProps) {
  const [startedAt] = useState(() => Date.now());
  const [totalDuration, setTotalDuration] = useState(durationSeconds);
  const [, forceUpdate] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const { vibrate } = useHaptic();
  const { resolved, colors } = useTheme();
  const { scheduleIn, cancel: cancelNotification } = useRestEndNotification();
  const completedRef = useRef(false);
  const lastVibrationSecond = useRef<number | null>(null);

  const calculateRemaining = useCallback(() => {
    const elapsedSeconds = (Date.now() - startedAt) / 1000;
    return Math.max(0, totalDuration - elapsedSeconds);
  }, [startedAt, totalDuration]);

  const remaining = calculateRemaining();
  const elapsed = totalDuration - remaining;
  const progress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

  // Native win: the overlay is the rest timer the active screen uses after a
  // logged set, so schedule the lock-screen notification as soon as it opens.
  useEffect(() => {
    scheduleIn(durationSeconds);
    // Mount-only: adjustments reschedule explicitly in handleAdjust.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentRemaining = calculateRemaining();

      if (currentRemaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        setHasCompleted(true);
        vibrate("success");
        cancelNotification();
        setTimeout(() => {
          onComplete();
        }, 800);
        clearInterval(interval);
        return;
      }

      const currentSecond = Math.ceil(currentRemaining);
      if (
        currentSecond <= 3 &&
        currentSecond > 0 &&
        lastVibrationSecond.current !== currentSecond
      ) {
        lastVibrationSecond.current = currentSecond;
        vibrate("light");
      }

      forceUpdate((n) => n + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [calculateRemaining, vibrate, onComplete, cancelNotification]);

  const handleAdjust = (delta: number) => {
    const next = Math.max(5, totalDuration + delta);
    setTotalDuration(next);
    const elapsedSeconds = (Date.now() - startedAt) / 1000;
    scheduleIn(Math.max(0, next - elapsedSeconds));
    vibrate("light");
  };

  const handleSkip = () => {
    vibrate("medium");
    cancelNotification();
    onSkip();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const CIRCLE_RADIUS = 45;
  const circumference = 2 * Math.PI * CIRCLE_RADIUS;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleSkip}>
      {/* RN Modal renders outside the ThemeProvider View, so theme vars are
          re-applied like the Dialog primitive does. */}
      <View style={themes[resolved]} className="flex-1 bg-background/95">
        <View className="flex-1 items-center justify-center">
          <Pressable
            onPress={handleSkip}
            className="absolute right-4 top-14 rounded-full p-2"
            accessibilityRole="button"
            accessibilityLabel="Skip rest"
            hitSlop={8}
          >
            <X size={24} color={colors.mutedForeground} />
          </Pressable>

          <View className="flex-col items-center gap-8">
            <Text
              className={cn(
                "text-lg font-medium tracking-wide",
                hasCompleted ? "text-green-500" : "text-muted-foreground",
              )}
            >
              {hasCompleted ? "REST COMPLETE" : "REST"}
            </Text>

            <View className="relative h-48 w-48 items-center justify-center">
              <Svg
                className="absolute h-full w-full"
                viewBox="0 0 100 100"
                style={{ transform: [{ rotate: "-90deg" }] }}
              >
                <Circle
                  cx={50}
                  cy={50}
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke={colors.muted}
                  strokeWidth={4}
                />
                <Circle
                  cx={50}
                  cy={50}
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke={hasCompleted ? "#22c55e" : colors.primary}
                  strokeWidth={4}
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={circumference * (1 - progress / 100)}
                  strokeLinecap="round"
                />
              </Svg>
              <Text
                className={cn(
                  "font-mono text-6xl font-bold tabular-nums text-foreground",
                  hasCompleted && "text-green-500",
                )}
              >
                {formatTime(remaining)}
              </Text>
            </View>

            <View className="flex-row items-center gap-3">
              <Button
                variant="outline"
                size="lg"
                className="h-14 w-16 px-0"
                textClassName="text-lg font-semibold"
                onPress={() => handleAdjust(-15)}
              >
                -15
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 w-16 px-0"
                textClassName="text-lg font-semibold"
                onPress={() => handleAdjust(15)}
              >
                +15
              </Button>
            </View>

            <Button
              variant="ghost"
              size="lg"
              className="mt-4"
              textClassName="text-muted-foreground"
              onPress={handleSkip}
            >
              Skip Rest
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
