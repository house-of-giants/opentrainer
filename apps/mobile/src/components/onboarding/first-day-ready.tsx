import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NextSessionPreview } from "@/components/workout/next-session-preview";
import { useStartRoutineDay } from "@/hooks/use-next-session";

/**
 * The end of the "Bring my program" and "Start from scratch" onboarding
 * paths: the saved routine's day 1, one tap from starting it.
 */
export function FirstDayReady({ routineId }: { routineId: Id<"routines"> }) {
  const router = useRouter();
  const routine = useQuery(api.routines.getRoutine, { routineId });
  const user = useQuery(api.users.getCurrentUser);
  const { start, isStarting } = useStartRoutineDay();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-1 justify-center gap-6 px-6">
        <View className="gap-2">
          <Text className="text-2xl font-bold text-foreground">
            Your routine is saved
          </Text>
          <Text className="text-muted-foreground">
            Start day 1 now, or find it on Home later.
          </Text>
        </View>
        {routine && user ? (
          <Card className="p-4">
            <NextSessionPreview
              next={{ routine, dayIndex: 0 }}
              unit={user.preferredUnits ?? "lb"}
            />
          </Card>
        ) : (
          <Skeleton className="h-28 w-full rounded-lg" />
        )}
      </View>

      <View className="gap-2 border-t border-border p-4">
        <Button
          size="lg"
          className="h-14 w-full"
          textClassName="text-lg font-semibold"
          disabled={!routine}
          loading={isStarting}
          onPress={() => {
            if (!routine) return;
            void start(routine, 0, { entryPoint: "onboarding", isNextDay: true });
          }}
        >
          Show me day 1
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          disabled={isStarting}
          onPress={() => router.replace("/(app)/(tabs)")}
        >
          Go to home
        </Button>
      </View>
    </SafeAreaView>
  );
}
