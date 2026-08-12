import { Pressable, Text, View } from "react-native";
import {
  Dumbbell,
  Scale,
  Target,
  Timer,
  TrendingUp,
  type LucideIcon,
} from "lucide-react-native";

import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/onboarding/steps/goals-step.tsx.
export type Goal =
  | "strength"
  | "hypertrophy"
  | "endurance"
  | "weight_loss"
  | "general_fitness";

const GOALS: { id: Goal; label: string; icon: LucideIcon }[] = [
  { id: "strength", label: "Strength", icon: Dumbbell },
  { id: "hypertrophy", label: "Hypertrophy", icon: TrendingUp },
  { id: "endurance", label: "Endurance", icon: Timer },
  { id: "weight_loss", label: "Weight Loss", icon: Scale },
  { id: "general_fitness", label: "General Fitness", icon: Target },
];

interface GoalsStepProps {
  selected: Goal[];
  onSelect: (goals: Goal[]) => void;
}

export function GoalsStep({ selected, onSelect }: GoalsStepProps) {
  const { colors } = useTheme();
  const { vibrate } = useHaptic();

  const toggleGoal = (goal: Goal) => {
    vibrate("light");
    if (selected.includes(goal)) {
      onSelect(selected.filter((g) => g !== goal));
    } else {
      onSelect([...selected, goal]);
    }
  };

  return (
    <View className="gap-6">
      <View className="items-center">
        <Text className="text-2xl font-bold text-foreground">
          What are you training for?
        </Text>
        <Text className="mt-2 text-center text-muted-foreground">
          Select all that apply. This helps us personalize your experience.
        </Text>
      </View>

      {/* RN has no CSS grid: two 48%-wide columns wrap like web's grid-cols-2. */}
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {GOALS.map((goal) => {
          const isSelected = selected.includes(goal.id);
          return (
            <Pressable
              key={goal.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => toggleGoal(goal.id)}
              className={cn(
                "w-[48%] items-center gap-3 rounded-xl border-2 p-6",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border active:bg-muted/50",
              )}
            >
              <goal.icon
                size={32}
                color={isSelected ? colors.primary : colors.mutedForeground}
              />
              <Text className="text-center font-medium text-foreground">
                {goal.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
