import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Doc, Id } from "@opentrainer/backend";
import { describeNextSessionChange } from "@opentrainer/lib/next-session";
import type { WeightUnit } from "@opentrainer/lib/units";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNextLiftTarget } from "@/hooks/use-next-session";

/** Names of the rep-based lifts in a workout, in the order they were logged. */
function liftNames(entries: Doc<"entries">[]): string[] {
  const names: string[] = [];
  for (const entry of entries) {
    if (entry.kind !== "lifting" || entry.lifting?.durationSeconds !== undefined) {
      continue;
    }
    if (!names.includes(entry.exerciseName)) names.push(entry.exerciseName);
  }
  return names;
}

// Shown after a routine workout is finished: what the progression rules
// changed for each lift next session.
export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const args = id ? { workoutId: id as Id<"workouts"> } : "skip";
  const workout = useQuery(api.workouts.getWorkoutWithEntries, args);
  const routineExercises = useQuery(api.workouts.getRoutineExercisesForWorkout, args);
  const user = useQuery(api.users.getCurrentUser);
  const unit: WeightUnit = user?.preferredUnits ?? "lb";

  const lifts = useMemo(() => (workout ? liftNames(workout.entries) : []), [workout]);
  const isLoading = workout === undefined || routineExercises === undefined;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 p-4">
        <View>
          <Text className="text-2xl font-semibold text-foreground">
            Workout complete
          </Text>
          {workout?.title ? (
            <Text className="mt-1 text-sm text-muted-foreground">{workout.title}</Text>
          ) : null}
        </View>

        <View>
          <Text className="mb-1 font-mono text-sm uppercase tracking-wider text-muted-foreground">
            Next session
          </Text>
          {isLoading ? (
            <View className="gap-2 pt-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </View>
          ) : lifts.length === 0 ? (
            <Text className="py-3 text-sm text-muted-foreground">
              No lifts to adjust.
            </Text>
          ) : (
            lifts.map((exerciseName) => (
              <NextSessionRow
                key={exerciseName}
                exerciseName={exerciseName}
                targetReps={
                  routineExercises?.find((ex) => ex.exerciseName === exerciseName)
                    ?.targetReps
                }
                unit={unit}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View className="border-t border-border p-4">
        <Button size="lg" className="w-full" onPress={() => router.replace("/(app)/(tabs)")}>
          Done
        </Button>
      </View>
    </SafeAreaView>
  );
}

function NextSessionRow({
  exerciseName,
  targetReps,
  unit,
}: {
  exerciseName: string;
  targetReps: string | undefined;
  unit: WeightUnit;
}) {
  const result = useNextLiftTarget(exerciseName, targetReps, unit);
  const next = result ? describeNextSessionChange(result, targetReps) : null;

  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-border py-3">
      <Text numberOfLines={1} className="flex-1 font-medium text-foreground">
        {exerciseName}
      </Text>
      {result === undefined ? (
        <Skeleton className="h-8 w-24" />
      ) : next ? (
        <View className="items-end">
          <Text className="font-mono text-sm font-semibold text-foreground">
            {next.change}
          </Text>
          <Text className="font-mono text-xs text-muted-foreground">{next.target}</Text>
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground">No change</Text>
      )}
    </View>
  );
}
