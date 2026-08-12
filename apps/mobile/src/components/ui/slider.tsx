import NativeSlider from "@react-native-community/slider";
import { View, ViewProps } from "react-native";

import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

interface SliderProps extends ViewProps {
  value: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

// API mirrors the web shadcn Slider's common usage (single-thumb).
function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  ...props
}: SliderProps) {
  const { colors } = useTheme();
  return (
    <View className={cn("w-full", className)} {...props}>
      <NativeSlider
        value={value}
        onValueChange={onValueChange}
        minimumValue={min}
        maximumValue={max}
        step={step}
        disabled={disabled}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.muted}
        thumbTintColor={colors.primary}
      />
    </View>
  );
}

export { Slider };
