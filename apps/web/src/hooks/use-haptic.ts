"use client";

import { useCallback } from "react";

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [30, 50, 30],
  error: [50, 100, 50, 100, 50],
};

export function useHaptic() {
  const vibrate = useCallback((pattern: HapticPattern = "light") => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(patterns[pattern]);
    }
  }, []);

  return { vibrate };
}
