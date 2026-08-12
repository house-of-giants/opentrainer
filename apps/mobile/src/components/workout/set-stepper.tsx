import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";

// Port of apps/web/src/components/workout/set-stepper.tsx.
// Same props/behavior; tap the value to type an exact number.
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
    <View className="items-center gap-1">
      <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          textClassName="text-xl font-bold"
          onPress={handleDecrement}
          disabled={value <= min}
          accessibilityLabel={`Decrease ${label}`}
        >
          −
        </Button>

        <View className="min-w-[64px] items-center justify-center">
          {isEditing ? (
            <Input
              value={inputValue}
              onChangeText={setInputValue}
              onBlur={commitValue}
              onSubmitEditing={commitValue}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectTextOnFocus
              autoFocus
              accessibilityLabel={`${label} value`}
              className="h-10 w-20 text-center font-mono text-xl font-bold"
            />
          ) : (
            <Pressable
              onPress={handleValuePress}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${label}`}
              className={cn(
                "items-center rounded-md px-2 py-0.5",
                "active:bg-muted",
              )}
            >
              <Text className="font-mono text-2xl font-bold text-foreground">
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
          size="icon"
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
