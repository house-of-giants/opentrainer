import { Pressable, PressableProps } from "react-native";
import { Check } from "lucide-react-native";

import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

interface CheckboxProps extends Omit<PressableProps, "onPress"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

function Checkbox({ checked, onCheckedChange, className, ...props }: CheckboxProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onCheckedChange?.(!checked)}
      className={cn(
        "h-5 w-5 items-center justify-center rounded-[4px] border border-input",
        checked && "border-primary bg-primary",
        className,
      )}
      hitSlop={8}
      {...props}
    >
      {checked && <Check size={14} color={colors.primaryForeground} strokeWidth={3} />}
    </Pressable>
  );
}

export { Checkbox };
