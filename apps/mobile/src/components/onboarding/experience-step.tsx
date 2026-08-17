import { Pressable, Text, View } from "react-native";

import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";

// Port of apps/web/src/app/onboarding/steps/experience-step.tsx.
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

const LEVELS: { id: ExperienceLevel; label: string; description: string }[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Less than 1 year of consistent training",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "1-3 years, comfortable with main lifts",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "3+ years, structured programming experience",
  },
];

interface ExperienceStepProps {
  selected: ExperienceLevel | null;
  onSelect: (level: ExperienceLevel) => void;
}

export function ExperienceStep({ selected, onSelect }: ExperienceStepProps) {
  const { vibrate } = useHaptic();

  return (
    <View className="gap-6">
      <View className="items-center">
        <Text className="text-2xl font-bold text-foreground">
          How long have you been lifting?
        </Text>
        <Text className="mt-2 text-center text-muted-foreground">
          This helps us tailor recommendations to your level.
        </Text>
      </View>

      <View className="gap-3">
        {LEVELS.map((level) => (
          <Pressable
            key={level.id}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === level.id }}
            onPress={() => {
              vibrate("light");
              onSelect(level.id);
            }}
            className={cn(
              "w-full rounded-xl border-2 p-5",
              selected === level.id
                ? "border-primary bg-primary/10"
                : "border-border active:bg-muted/50",
            )}
          >
            <Text className="text-lg font-semibold text-foreground">
              {level.label}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              {level.description}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
