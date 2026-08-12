import { View, ViewProps } from "react-native";

import { cn } from "@/lib/cn";

interface SeparatorProps extends ViewProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function Separator({
  orientation = "horizontal",
  className,
  ...props
}: SeparatorProps) {
  return (
    <View
      accessibilityRole="none"
      className={cn(
        "bg-border",
        orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
