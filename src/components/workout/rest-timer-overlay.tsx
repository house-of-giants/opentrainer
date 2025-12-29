"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
  const [tick, setTick] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const { vibrate } = useHaptic();
  const completedRef = useRef(false);
  const lastVibrationSecond = useRef<number | null>(null);

  const calculateRemaining = useCallback(() => {
    const elapsedSeconds = (Date.now() - startedAt) / 1000;
    return Math.max(0, totalDuration - elapsedSeconds);
  }, [startedAt, totalDuration]);

  const remaining = calculateRemaining();
  const elapsed = totalDuration - remaining;
  const progress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

  useEffect(() => {
    const interval = setInterval(() => {
      const currentRemaining = calculateRemaining();
      
      if (currentRemaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        setHasCompleted(true);
        vibrate("success");
        setTimeout(() => {
          onComplete();
        }, 800);
        clearInterval(interval);
        return;
      }

      const currentSecond = Math.ceil(currentRemaining);
      if (currentSecond <= 3 && currentSecond > 0 && lastVibrationSecond.current !== currentSecond) {
        lastVibrationSecond.current = currentSecond;
        vibrate("light");
      }

      setTick((t) => t + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [calculateRemaining, vibrate, onComplete]);

  const handleAdjust = (delta: number) => {
    setTotalDuration((prev) => Math.max(5, prev + delta));
    vibrate("light");
  };

  const handleSkip = () => {
    vibrate("medium");
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <button
        type="button"
        onClick={handleSkip}
        className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Skip rest"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="flex flex-col items-center gap-8">
        <span
          className={cn(
            "text-lg font-medium tracking-wide",
            hasCompleted ? "text-green-500" : "text-muted-foreground"
          )}
        >
          {hasCompleted ? "REST COMPLETE" : "REST"}
        </span>

        <div className="relative flex h-48 w-48 items-center justify-center">
          <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted"
            />
            <circle
              cx="50"
              cy="50"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              strokeLinecap="round"
              className={cn(
                "transition-all duration-100",
                hasCompleted ? "text-green-500" : "text-primary"
              )}
            />
          </svg>
          <span
            className={cn(
              "text-6xl font-mono font-bold tabular-nums",
              hasCompleted && "text-green-500"
            )}
          >
            {formatTime(remaining)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-14 w-16 text-lg font-semibold"
            onClick={() => handleAdjust(-15)}
          >
            -15
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-14 w-16 text-lg font-semibold"
            onClick={() => handleAdjust(15)}
          >
            +15
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="mt-4 text-muted-foreground"
          onClick={handleSkip}
        >
          Skip Rest
        </Button>
      </div>
    </div>
  );
}
