import { Text } from "react-native";
import { Check, Clock } from "lucide-react-native";

import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

/** Unset means the server has the set. */
export type SetSyncState = "pending" | "failed";

/** Trailing mark on a logged set row: saved, waiting for the server, or failed. */
export function SetSyncIndicator({
  syncState,
  size,
  textClassName,
}: {
  syncState?: SetSyncState;
  size: number;
  textClassName?: string;
}) {
  const { colors } = useTheme();

  if (syncState === "failed") {
    return (
      <Text className={cn("font-medium text-destructive", textClassName)}>
        Not saved · Retry
      </Text>
    );
  }
  if (syncState === "pending") {
    return <Clock size={size} color={colors.mutedForeground} />;
  }
  return <Check size={size} color={colors.primary} />;
}

/** Accessibility props for a logged set row in each sync state. */
export function setRowAccessibility(syncState?: SetSyncState) {
  return {
    accessibilityState: { busy: syncState === "pending" },
    accessibilityHint:
      syncState === "pending"
        ? "Saving. You can edit this set after it saves."
        : syncState === "failed"
          ? "Tap to try saving again"
          : undefined,
  };
}
