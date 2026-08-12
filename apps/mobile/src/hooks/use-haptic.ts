import { useCallback } from "react";
import * as Haptics from "expo-haptics";

// Same API as apps/web/src/hooks/use-haptic.ts, backed by real iOS haptics
// instead of navigator.vibrate (which is dead on iOS Safari).
export type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

export function useHaptic() {
  const vibrate = useCallback((pattern: HapticPattern = "light") => {
    switch (pattern) {
      case "light":
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  }, []);

  return { vibrate };
}
