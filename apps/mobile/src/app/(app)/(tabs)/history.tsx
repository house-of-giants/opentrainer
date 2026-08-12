import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import { Calendar, Clock, Dumbbell } from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStartWorkout } from "@/components/workout/start-workout-provider";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/history/page.tsx. The web page is not paginated:
// it pulls one page of up to 100 completed workouts and groups them by month
// client-side. Same query here; the flattened month groups feed a FlatList so
// long histories stay virtualised.
type Workout = {
  _id: string;
  title?: string;
  status: "in_progress" | "completed" | "cancelled";
  startedAt: number;
  completedAt?: number;
  summary?: {
    totalVolume?: number;
    totalSets?: number;
    totalDurationMinutes?: number;
    exerciseCount?: number;
    totalCardioDurationSeconds?: number;
    totalDistanceKm?: number;
    hasCardio?: boolean;
    hasMobility?: boolean;
  };
};

type Row =
  | { kind: "month"; key: string; label: string }
  | { kind: "workout"; key: string; workout: Workout };

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const formatDuration = (minutes?: number) => {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const formatCardioDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
};

function toRows(workoutList: Workout[]): Row[] {
  const groups: Record<string, Workout[]> = {};

  for (const workout of workoutList) {
    const date = new Date(workout.startedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(workout);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .flatMap<Row>(([key, items]) => [
      {
        kind: "month",
        key,
        label: new Date(items[0].startedAt).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      },
      ...items.map<Row>((workout) => ({
        kind: "workout",
        key: workout._id,
        workout,
      })),
    ]);
}

function WorkoutRow({ workout }: { workout: Workout }) {
  const router = useRouter();
  const { colors } = useTheme();
  const duration = formatDuration(workout.summary?.totalDurationMinutes);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/(app)/workout/${workout._id}`)}
    >
      <Card className="p-4 active:bg-muted/50">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-medium text-foreground">
                {workout.title ?? "Workout"}
              </Text>
              {workout.status === "cancelled" && (
                <Badge variant="secondary">Cancelled</Badge>
              )}
            </View>
            <View className="mt-1 flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Calendar size={14} color={colors.mutedForeground} />
                <Text className="text-sm text-muted-foreground">
                  {formatDate(workout.startedAt)}
                </Text>
              </View>
              {duration && (
                <View className="flex-row items-center gap-1">
                  <Clock size={14} color={colors.mutedForeground} />
                  <Text className="text-sm text-muted-foreground">{duration}</Text>
                </View>
              )}
            </View>
          </View>
          {workout.summary && (
            <View className="items-end">
              <Text className="font-mono font-medium text-foreground">
                {(workout.summary.totalSets ?? 0) > 0
                  ? `${workout.summary.totalSets} sets`
                  : workout.summary.totalCardioDurationSeconds
                    ? formatCardioDuration(workout.summary.totalCardioDurationSeconds)
                    : `${workout.summary.exerciseCount ?? 0} exercises`}
              </Text>
              <Text className="font-mono text-xs text-muted-foreground">
                {(workout.summary.totalSets ?? 0) > 0
                  ? `${workout.summary.exerciseCount ?? 0} exercises`
                  : workout.summary.totalCardioDurationSeconds
                    ? "cardio"
                    : ""}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const startWorkout = useStartWorkout();
  const { colors } = useTheme();
  const workouts = useQuery(api.workouts.getWorkoutHistory, {
    limit: 100,
    status: "completed",
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="h-14 flex-row items-center border-b border-border px-4">
        {workouts === undefined ? (
          <Skeleton className="h-6 w-32" />
        ) : (
          <Text className="text-lg font-semibold text-foreground">
            Workout History
          </Text>
        )}
      </View>

      {workouts === undefined ? (
        <View className="gap-3 p-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </View>
      ) : workouts.length === 0 ? (
        <View className="p-4">
          <Card className="items-center p-8">
            <Dumbbell size={48} color={colors.mutedForeground} />
            <Text className="mb-2 mt-4 font-semibold text-foreground">
              No workouts yet
            </Text>
            <Text className="mb-4 text-center text-sm text-muted-foreground">
              Complete your first workout to see it here!
            </Text>
            {/* Web links back to /dashboard to reach the start sheet; the sheet
                is globally available on mobile, so open it directly. */}
            <Button onPress={startWorkout.open}>Start a Workout</Button>
          </Card>
        </View>
      ) : (
        <FlatList
          data={toRows(workouts as Workout[])}
          keyExtractor={(row) => `${row.kind}:${row.key}`}
          contentContainerClassName="gap-2 p-4 pb-24"
          renderItem={({ item }) =>
            item.kind === "month" ? (
              <Text className="mb-1 mt-4 font-mono text-sm uppercase tracking-wider text-muted-foreground">
                {item.label}
              </Text>
            ) : (
              <WorkoutRow workout={item.workout} />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
