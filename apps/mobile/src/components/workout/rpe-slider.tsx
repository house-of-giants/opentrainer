import { useState } from "react";
import { Text, View } from "react-native";

import { Slider } from "@/components/ui/slider";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";

const RPE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Very Light", color: "text-green-500" },
  2: { label: "Light", color: "text-green-500" },
  3: { label: "Light", color: "text-green-400" },
  4: { label: "Moderate", color: "text-yellow-500" },
  5: { label: "Moderate", color: "text-yellow-500" },
  6: { label: "Somewhat Hard", color: "text-orange-400" },
  7: { label: "Hard", color: "text-orange-500" },
  8: { label: "Very Hard", color: "text-red-400" },
  9: { label: "Very Hard", color: "text-red-500" },
  10: { label: "Max Effort", color: "text-red-600" },
};

interface RpeSliderProps {
  value?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function RpeSlider({ value = 5, onChange, className }: RpeSliderProps) {
  const { vibrate } = useHaptic();
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (newValue: number) => {
    if (newValue !== localValue) {
      vibrate("light");
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const rpeInfo = RPE_LABELS[localValue] ?? RPE_LABELS[5];

  return (
    <View className={cn("gap-3", className)}>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-muted-foreground">
          Intensity (RPE)
        </Text>
        <View className="flex-row items-baseline">
          <Text className={cn("font-mono text-2xl font-bold", rpeInfo.color)}>
            {localValue}
          </Text>
          <Text className="ml-1 text-xs text-muted-foreground">/10</Text>
        </View>
      </View>

      <Slider
        value={localValue}
        onValueChange={handleChange}
        min={1}
        max={10}
        step={1}
        className="py-2"
      />

      <Text className={cn("text-center text-sm font-medium", rpeInfo.color)}>
        {rpeInfo.label}
      </Text>
    </View>
  );
}
