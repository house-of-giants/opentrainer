"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
  }, [isRunning, seconds, clearTimer, vibrate, onComplete]);

  const handleStartPause = () => {
    if (hasCompleted) {
      setSeconds(defaultSeconds);
      setTotalSeconds(defaultSeconds);
      setHasCompleted(false);
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
    vibrate("medium");
  };

  const handleAdjust = (delta: number) => {
    setSeconds((prev) => Math.max(0, prev + delta));
    if (delta > 0) {
      setTotalSeconds((prev) => prev + delta);
    }
    vibrate("light");
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const elapsed = totalSeconds - seconds;
  const progress = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6">
      <span className="text-sm font-medium text-muted-foreground">Rest Timer</span>

      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg className="absolute h-full w-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="58"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <circle
            cx="64"
            cy="64"
            r="58"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 58}`}
            strokeDashoffset={`${2 * Math.PI * 58 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-1000",
              hasCompleted ? "text-green-500" : "text-primary"
            )}
          />
        </svg>
        <span
          className={cn(
            "text-4xl font-mono font-bold tabular-nums",
            hasCompleted && "text-green-500"
          )}
        >
          {formatTime(seconds)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-12"
          onClick={() => handleAdjust(-15)}
        >
          -15
        </Button>
        <Button
          type="button"
          size="lg"
          className="h-14 w-24"
          onClick={handleStartPause}
        >
          {isRunning ? "Pause" : hasCompleted ? "Restart" : "Start"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-12"
          onClick={() => handleAdjust(15)}
        >
          +15
        </Button>
      </div>

      {(isRunning || seconds !== defaultSeconds) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-muted-foreground"
        >
          Reset
        </Button>
      )}
    </div>
  );
}
