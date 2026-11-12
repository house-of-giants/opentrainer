import { Pressable, Text, View } from "react-native";
import type { WeightUnit } from "@opentrainer/lib/units";

import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";

const UNITS: { id: WeightUnit; label: string }[] = [
  { id: "kg", label: "Kilograms (kg)" },
  { id: "lb", label: "Pounds (lb)" },
];

interface UnitsPickerProps {
  value: WeightUnit;
  onChange: (unit: WeightUnit) => void;
}

export function UnitsPicker({ value, onChange }: UnitsPickerProps) {
  const { vibrate } = useHaptic();

  return (
    <View className="gap-3">
      <Text nativeID="units-label" className="font-medium text-foreground">
        Weight units
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabelledBy="units-label"
        className="flex-row gap-3"
      >
        {UNITS.map((unit) => {
          const isSelected = value === unit.id;
          return (
            <Pressable
              key={unit.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => {
                vibrate("light");
                onChange(unit.id);
              }}
              className={cn(
                "flex-1 items-center rounded-xl border-2 p-4",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border active:bg-muted/50",
              )}
            >
              <Text className="font-medium text-foreground">{unit.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
