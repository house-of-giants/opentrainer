import { Text, TextProps } from "react-native";

import { cn } from "@/lib/cn";

function Label({ className, ...props }: TextProps & { className?: string }) {
  return (
    <Text
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

export { Label };
