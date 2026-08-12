import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { useTheme } from "@/theme/theme-provider";

// Stub target for TrainingLabCard. The real screen (port of
// apps/web/src/app/training-lab/page.tsx) lands in Phase 5.
export default function TrainingLabScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="h-14 flex-row items-center gap-2 border-b border-border px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <ChevronLeft size={22} color={colors.foreground} />
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">Training Lab</Text>
      </View>
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-sm text-muted-foreground">
          Training Lab arrives in a later phase.
        </Text>
      </View>
    </SafeAreaView>
  );
}
