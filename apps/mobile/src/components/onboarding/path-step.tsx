import { Pressable, Text, View } from "react-native";

import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";

// Port of apps/web/src/app/onboarding/steps/path-step.tsx.
export type OnboardingPath = "bring_program" | "from_scratch" | "generate";

const PATHS: { id: OnboardingPath; label: string; description: string }[] = [
  {
    id: "bring_program",
    label: "Bring my program",
    description: "Enter the routine you already run, or paste it.",
  },
  {
    id: "from_scratch",
    label: "Start from scratch",
    description: "Build a routine one exercise at a time.",
  },
  {
    id: "generate",
    label: "Generate one",
    description: "Answer a few questions about your goals and equipment.",
  },
];

interface PathStepProps {
  selected: OnboardingPath | null;
  onSelect: (path: OnboardingPath) => void;
}

export function PathStep({ selected, onSelect }: PathStepProps) {
  const { vibrate } = useHaptic();

  return (
    <View className="gap-6">
      <Text
        nativeID="path-label"
        className="text-center text-2xl font-bold text-foreground"
      >
        How do you want to start?
      </Text>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabelledBy="path-label"
        className="gap-3"
      >
        {PATHS.map((path) => {
          const isSelected = selected === path.id;
          return (
            <Pressable
              key={path.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => {
                vibrate("light");
                onSelect(path.id);
              }}
              className={cn(
                "w-full rounded-xl border-2 p-5",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border active:bg-muted/50",
              )}
            >
              <Text className="text-lg font-semibold text-foreground">
                {path.label}
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                {path.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
