import { Text } from "react-native";

import { cn } from "@/lib/cn";

// Port of web ascii-logo.tsx (compact variant is what fits phone headers).
const ASCII_LOGO = `█▀█ █▀█ █▀▀ █▄░█ ▀█▀ █▀█ ▄▀█ █ █▄░█ █▀▀ █▀█
█▄█ █▀▀ ██▄ █░▀█ ░█░ █▀▄ █▀█ █ █░▀█ ██▄ █▀▄`;

const COMPACT_LOGO = `█▀█ ▀█▀
█▄█ ░█░`;

interface AsciiLogoProps {
  variant?: "full" | "compact";
  className?: string;
}

export function AsciiLogo({ variant = "compact", className }: AsciiLogoProps) {
  return (
    <Text
      accessibilityLabel="OpenTrainer"
      className={cn("font-mono text-[8px] leading-[10px] text-foreground", className)}
    >
      {variant === "full" ? ASCII_LOGO : COMPACT_LOGO}
    </Text>
  );
}
