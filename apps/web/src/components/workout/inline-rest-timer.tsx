"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";

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

  const handleToggle = () => {
    if (hasCompleted) {
      setSeconds(defaultSeconds);
      setTotalSeconds(defaultSeconds);
      setHasCompleted(false);
    }
    setIsRunning((prev) => !prev);
    vibrate("light");
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
  const CIRCLE_RADIUS = 14;
  const circumference = 2 * Math.PI * CIRCLE_RADIUS;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2",
        hasCompleted ? "bg-green-500/10" : "bg-muted/50"
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center"
        aria-label={isRunning ? "Pause timer" : "Start timer"}
      >
        <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress / 100)}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-1000",
              hasCompleted ? "text-green-500" : "text-primary"
            )}
          />
        </svg>
        <div className="relative z-10">
          {isRunning ? (
            <div className="flex gap-0.5">
              <div className={cn("h-2.5 w-1 rounded-sm", hasCompleted ? "bg-green-500" : "bg-primary")} />
              <div className={cn("h-2.5 w-1 rounded-sm", hasCompleted ? "bg-green-500" : "bg-primary")} />
            </div>
          ) : (
            <div
              className={cn(
                "h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent",
                hasCompleted ? "border-l-green-500" : "border-l-primary"
              )}
            />
          )}
        </div>
      </button>

      <div className="flex flex-1 flex-col items-center">
        <span
          className={cn(
            "text-2xl font-mono font-bold tabular-nums",
            hasCompleted && "text-green-500"
          )}
        >
          {formatTime(seconds)}
        </span>
        <span className="text-xs text-muted-foreground">
          {hasCompleted ? "Rest complete" : isRunning ? "Resting..." : "Tap to start"}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-xs"
          onClick={() => handleAdjust(-15)}
        >
          -15
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-xs"
          onClick={() => handleAdjust(15)}
        >
          +15
        </Button>
      </div>
    </div>
  );
}
