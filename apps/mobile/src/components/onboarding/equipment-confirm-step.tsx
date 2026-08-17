import { ActivityIndicator, Pressable, Text, View } from "react-native";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_DISPLAY_NAMES,
  type EquipmentId,
} from "@opentrainer/backend/convex/lib/equipment";

import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/onboarding/steps/equipment-confirm-step.tsx.
// Each category is a distinct readonly tuple, so widen once instead of mapping
// over a union of array types.
const CATEGORY_ENTRIES = Object.entries(EQUIPMENT_CATEGORIES) as [
  string,
  readonly EquipmentId[],
][];

interface EquipmentConfirmStepProps {
  equipment: string[];
  onEquipmentChange: (equipment: string[]) => void;
  note: string | null;
  isLoading: boolean;
}

function formatCategoryName(category: string): string {
  return category
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function EquipmentConfirmStep({
  equipment,
  onEquipmentChange,
  note,
  isLoading,
}: EquipmentConfirmStepProps) {
  const { colors } = useTheme();
  const { vibrate } = useHaptic();

  const toggleEquipment = (id: string) => {
    vibrate("light");
    if (equipment.includes(id)) {
      onEquipmentChange(equipment.filter((e) => e !== id));
    } else {
      onEquipmentChange([...equipment, id]);
    }
  };

  if (isLoading) {
    return (
      <View className="gap-6">
        <View className="items-center">
          <Text className="text-2xl font-bold text-foreground">
            Analyzing your gym...
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            Hold tight, we&apos;re detecting your equipment.
          </Text>
        </View>
        <View className="items-center py-12">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View className="gap-6">
      <View className="items-center">
        <Text className="text-2xl font-bold text-foreground">
          We detected this equipment
        </Text>
        <Text className="mt-2 text-center text-muted-foreground">
          Tap to add or remove items. This helps AI suggest the right exercises.
        </Text>
      </View>

      {note && (
        <View className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
          <Text className="text-sm text-blue-600 dark:text-blue-400">{note}</Text>
        </View>
      )}

      {/* Web caps this list at 50vh and scrolls it; on native the screen's own
          ScrollView owns scrolling, so the sections render inline. */}
      <View className="gap-5">
        {CATEGORY_ENTRIES.map(([category, items]) => (
          <View key={category} className="gap-2">
            <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {formatCategoryName(category)}
            </Text>
            <View className="flex-row flex-wrap justify-between gap-y-2">
              {items.map((id) => {
                const isSelected = equipment.includes(id);
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => toggleEquipment(id)}
                    className={cn(
                      "w-[48%] rounded-lg border px-3 py-2",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border active:bg-muted/50",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm",
                        isSelected
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {EQUIPMENT_DISPLAY_NAMES[id]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
