import { Text, View } from "react-native";

import { Slider } from "@/components/ui/slider";

// Port of apps/web/src/app/onboarding/steps/availability-step.tsx.
interface AvailabilityStepProps {
  days: number;
  duration: number;
  onDaysChange: (days: number) => void;
  onDurationChange: (duration: number) => void;
}

export function AvailabilityStep({
  days,
  duration,
  onDaysChange,
  onDurationChange,
}: AvailabilityStepProps) {
  return (
    <View className="gap-6">
      <View className="items-center">
        <Text className="text-2xl font-bold text-foreground">
          How often can you train?
        </Text>
        <Text className="mt-2 text-center text-muted-foreground">
          This helps us build programs that fit your schedule.
        </Text>
      </View>

      <View className="gap-10 py-4">
        <View className="gap-6">
          <View className="flex-row items-center justify-between">
            <Text className="font-medium text-foreground">Days per week</Text>
            <Text className="text-4xl font-bold text-primary">{days}</Text>
          </View>
          <Slider
            value={days}
            onValueChange={onDaysChange}
            min={1}
            max={7}
            step={1}
            testID="days-slider"
          />
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted-foreground">1 day</Text>
            <Text className="text-sm text-muted-foreground">7 days</Text>
          </View>
        </View>

        <View className="gap-6">
          <View className="flex-row items-center justify-between">
            <Text className="font-medium text-foreground">Session length</Text>
            <Text className="text-4xl font-bold text-primary">
              {duration}
              <Text className="ml-1 text-lg font-bold text-primary"> min</Text>
            </Text>
          </View>
          <Slider
            value={duration}
            onValueChange={onDurationChange}
            min={30}
            max={120}
            step={15}
            testID="duration-slider"
          />
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted-foreground">30 min</Text>
            <Text className="text-sm text-muted-foreground">120 min</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
