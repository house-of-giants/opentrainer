import { Pressable, Text, View } from "react-native";

import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";

interface RpeSelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

const EFFORT_OPTIONS = [
  {
    rpe: 6,
    label: "Easy",
    subtitle: "4+ left",
    selectedClass: "border-green-500/30 bg-green-500/20",
    selectedTextClass: "text-green-600 dark:text-green-400",
  },
  {
    rpe: 8,
    label: "Mod",
    subtitle: "2-3 left",
    selectedClass: "border-yellow-500/30 bg-yellow-500/20",
    selectedTextClass: "text-yellow-600 dark:text-yellow-400",
  },
  {
    rpe: 9,
    label: "Hard",
    subtitle: "1 left",
    selectedClass: "border-orange-500/30 bg-orange-500/20",
    selectedTextClass: "text-orange-600 dark:text-orange-400",
  },
  {
    rpe: 10,
    label: "Failure",
    subtitle: "0 left",
    selectedClass: "border-red-500/30 bg-red-500/20",
    selectedTextClass: "text-red-600 dark:text-red-400",
  },
] as const;

export function RpeSelector({ value, onChange }: RpeSelectorProps) {
  const { vibrate } = useHaptic();

  const handleSelect = (rpe: number) => {
    vibrate("light");
    onChange(value === rpe ? null : rpe);
  };

  return (
    <View className="flex-col gap-1.5">
      <Text className="text-center text-xs font-medium text-muted-foreground">
        Effort <Text className="opacity-60">(optional)</Text>
      </Text>
      <View className="flex-row gap-1.5">
        {EFFORT_OPTIONS.map((option) => {
          const selected = value === option.rpe;
          return (
            <Pressable
              key={option.rpe}
              onPress={() => handleSelect(option.rpe)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={cn(
                "flex-1 flex-col items-center justify-center rounded-md border py-1.5",
                selected ? option.selectedClass : "border-muted-foreground/20",
              )}
            >
              <Text
                className={cn(
                  "text-[11px] font-semibold leading-tight",
                  selected ? option.selectedTextClass : "text-muted-foreground",
                )}
              >
                {option.label}
              </Text>
              <Text
                className={cn(
                  "text-[9px] leading-tight opacity-70",
                  selected ? option.selectedTextClass : "text-muted-foreground",
                )}
              >
                {option.subtitle}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
