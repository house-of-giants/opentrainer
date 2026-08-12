import { Text, View } from "react-native";

import { Input } from "@/components/ui/input";

// Port of apps/web/src/app/onboarding/steps/equipment-step.tsx.
const EXAMPLES = [
  "“LA Fitness”",
  "“Home gym with power rack, barbell, and dumbbells”",
  "“Apartment - just resistance bands and pull-up bar”",
  "“CrossFit box”",
];

interface EquipmentStepProps {
  description: string;
  onDescriptionChange: (description: string) => void;
}

export function EquipmentStep({
  description,
  onDescriptionChange,
}: EquipmentStepProps) {
  return (
    <View className="gap-6">
      <View className="items-center">
        <Text className="text-2xl font-bold text-foreground">
          Where do you work out?
        </Text>
        <Text className="mt-2 text-center text-muted-foreground">
          Describe your gym or home setup. We&apos;ll figure out what equipment
          you have.
        </Text>
      </View>

      <View className="gap-4">
        <Input
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="e.g., Planet Fitness, LA Fitness, home gym with power rack and dumbbells..."
          multiline
          textAlignVertical="top"
          autoFocus
          accessibilityLabel="Gym description"
          className="h-auto min-h-[140px] rounded-xl border-2 border-border px-4 py-3"
        />

        <View className="gap-2 rounded-lg bg-muted/50 p-4">
          <Text className="text-sm font-medium text-foreground">Examples:</Text>
          <View className="gap-1">
            {EXAMPLES.map((example) => (
              <Text key={example} className="text-sm text-muted-foreground">
                {"•"} {example}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
