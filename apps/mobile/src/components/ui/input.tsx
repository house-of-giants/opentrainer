import { forwardRef } from "react";
import { TextInput, TextInputProps } from "react-native";

import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

export interface InputProps extends TextInputProps {
  className?: string;
}

const Input = forwardRef<TextInput, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  const { colors } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.mutedForeground}
      style={{ paddingVertical: 0 }}
      className={cn(
        "h-11 w-full rounded-md border border-input bg-transparent px-3 text-base text-foreground",
        className,
      )}
      {...props}
    />
  );
});

export { Input };
