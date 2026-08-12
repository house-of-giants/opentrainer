import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import { FlaskConical, Sparkles } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/training-lab/training-lab-card.tsx.
// The web card layers a CSS gradient over the surface; RN has no gradient
// utility, so each variant uses the flat violet tint the gradient resolved to.
const VIOLET = "#8b5cf6"; // violet-500

export function TrainingLabCard() {
  const router = useRouter();
  const { colors } = useTheme();
  const ctaState = useQuery(api.ai.trainingLabMutations.getCtaState);

  if (ctaState === undefined) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }

  if (ctaState === null || !ctaState.show) {
    return null;
  }

  const openTrainingLab = () => router.push("/(app)/training-lab");

  if (!ctaState.isPro) {
    return (
      <Pressable onPress={openTrainingLab} accessibilityRole="button">
        <Card className="bg-violet-500/5 p-3 active:bg-violet-500/10">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <FlaskConical size={16} color={VIOLET} />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Training Lab
                </Text>
                <Text className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-500">
                  FREE IN ALPHA
                </Text>
              </View>
              <Text numberOfLines={1} className="text-xs text-muted-foreground">
                AI insights on volume, intensity &amp; recovery
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Sparkles size={12} color={VIOLET} />
              <Text className="text-xs text-violet-500">Try Free</Text>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  }

  if (!ctaState.canGenerate && ctaState.totalWorkouts === 0) {
    return (
      <Card className="p-4">
        <View className="mb-2 flex-row items-center gap-2">
          <FlaskConical size={20} color={VIOLET} />
          <Text className="font-semibold text-foreground">Training Lab</Text>
          <View className="ml-auto rounded-full bg-violet-500/10 px-2 py-0.5">
            <Text className="text-xs font-medium text-violet-500">ALPHA</Text>
          </View>
        </View>
        <Text className="text-sm text-muted-foreground">{ctaState.message}</Text>
      </Card>
    );
  }

  return (
    <Card className="bg-violet-500/5 p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <FlaskConical size={20} color={VIOLET} />
        <Text className="font-semibold text-foreground">Training Lab</Text>
        <View className="ml-auto rounded-full bg-violet-500/10 px-2 py-0.5">
          <Text className="text-xs font-medium text-violet-500">ALPHA</Text>
        </View>
      </View>
      <Text className="mb-3 text-sm text-foreground">{ctaState.message}</Text>
      <Button
        size="sm"
        className="w-full"
        disabled={!ctaState.canGenerate}
        onPress={openTrainingLab}
      >
        <Sparkles size={16} color={colors.primaryForeground} />
        <Text className="text-sm font-medium text-primary-foreground">
          {ctaState.hasReport ? "View Analysis" : "Generate Analysis"}
        </Text>
      </Button>
    </Card>
  );
}
