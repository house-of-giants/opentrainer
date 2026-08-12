import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";

interface SetStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  unit?: string;
  formatValue?: (value: number) => string;
}

export function SetStepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  max = 9999,
  unit,
  formatValue,
}: SetStepperProps) {
  const { vibrate } = useHaptic();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    if (newValue !== value) {
      vibrate("light");
      onChange(newValue);
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    if (newValue !== value) {
      vibrate("light");
      onChange(newValue);
    }
  };

  const handleValuePress = () => {
    vibrate("light");
    setInputValue(value.toString());
    setIsEditing(true);
  };

  const commitValue = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
      vibrate("medium");
    }
    setIsEditing(false);
  };

  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <View className="flex-col items-center gap-1">
      <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-11 px-0"
          textClassName="text-xl font-bold"
          onPress={handleDecrement}
          disabled={value <= min}
          accessibilityLabel={`Decrease ${label}`}
        >
          −
        </Button>

        <View className="min-w-[64px] flex-col items-center justify-center">
          {isEditing ? (
            <Input
              autoFocus
              selectTextOnFocus
              keyboardType="decimal-pad"
              returnKeyType="done"
              value={inputValue}
              onChangeText={setInputValue}
              onBlur={commitValue}
              onSubmitEditing={commitValue}
              className="h-10 w-20 text-center font-mono text-xl font-bold"
            />
          ) : (
            <Pressable
              onPress={handleValuePress}
              className={cn(
                "flex-col items-center rounded-md px-2 py-0.5",
                "active:bg-muted",
              )}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${label}`}
            >
              <Text className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {displayValue}
              </Text>
              {unit && (
                <Text className="-mt-0.5 text-[10px] text-muted-foreground">
                  {unit}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        <Button
          variant="outline"
          size="lg"
          className="h-11 w-11 px-0"
          textClassName="text-xl font-bold"
          onPress={handleIncrement}
          disabled={value >= max}
          accessibilityLabel={`Increase ${label}`}
        >
          +
        </Button>
      </View>
    </View>
  );
}
