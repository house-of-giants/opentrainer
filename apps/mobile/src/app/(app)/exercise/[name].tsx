import { useMemo } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { ArrowLeft, ChartLine } from "lucide-react-native";
import { api } from "@opentrainer/backend";
import {
  buildExerciseHistory,
  type ExerciseHistorySession,
  type ExerciseHistorySet,
} from "@opentrainer/lib/e1rm";
import type { WeightUnit } from "@opentrainer/lib/units";

import { E1rmTrendChart } from "@/components/exercise-history/e1rm-trend-chart";
import { PrBadge } from "@/components/training-lab/pr-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/theme/theme-provider";

// The history query collects every entry for the exercise and only stops
// adding sessions at sessionCount, so a high count returns all of them.
const ALL_SESSIONS = 100_000;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SetRow({ set, unit }: { set: ExerciseHistorySet; unit: WeightUnit }) {
  return (
    <View className="flex-row items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
      <View className="flex-row items-center gap-2">
        <Text className="text-sm text-muted-foreground">Set {set.setNumber}</Text>
        {set.isWarmup && <Badge variant="outline">Warmup</Badge>}
        {set.pr === "e1rm" && <PrBadge label="e1RM PR" />}
        {set.pr === "reps" && <PrBadge label="Rep PR" />}
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="font-mono text-sm font-medium tabular-nums text-foreground">
          {set.weight} {unit} × {set.reps}
        </Text>
        {set.rpe !== null && set.rpe > 0 && (
          <Text className="text-xs text-muted-foreground">RPE {set.rpe}</Text>
        )}
      </View>
    </View>
  );
}

function SessionCard({
  session,
  unit,
}: {
  session: ExerciseHistorySession;
  unit: WeightUnit;
}) {
  return (
    <Card className="gap-2 p-4">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-semibold text-foreground">{formatDate(session.date)}</Text>
        {session.bestE1rm !== null && (
          <Text className="font-mono text-sm tabular-nums text-muted-foreground">
            e1RM {session.bestE1rm} {unit}
          </Text>
        )}
      </View>
      {session.sets.map((set, index) => (
        // History sets carry no entry id; a set number can repeat after an edit.
        <SetRow key={`${set.setNumber}:${index}`} set={set} unit={unit} />
      ))}
    </Card>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2 font-mono text-sm uppercase tracking-wider text-muted-foreground">
      {children}
    </Text>
  );
}

export default function ExerciseHistoryScreen() {
  const params = useLocalSearchParams<{ name: string }>();
  const exerciseName = params.name ?? "";
  const router = useRouter();
  const { colors } = useTheme();

  const user = useQuery(api.users.getCurrentUser);
  const sessions = useQuery(api.entries.getExerciseHistory, {
    exerciseName,
    sessionCount: ALL_SESSIONS,
  });
  const unit: WeightUnit = user?.preferredUnits ?? "lb";
  const history = useMemo(
    () => (sessions ? buildExerciseHistory(sessions, unit) : null),
    [sessions, unit],
  );

  const header = (
    <View className="h-14 flex-row items-center gap-2 border-b border-border px-2">
      <Button
        variant="ghost"
        size="icon"
        onPress={() => router.back()}
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={20} color={colors.foreground} />
      </Button>
      <Text
        numberOfLines={1}
        accessibilityRole="header"
        className="min-w-0 flex-1 text-lg font-semibold text-foreground"
      >
        {exerciseName}
      </Text>
    </View>
  );

  if (history === null || user === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        {header}
        <View className="gap-4 p-4">
          <Skeleton className="h-24 w-full" testID="exercise-history-skeleton" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </View>
      </SafeAreaView>
    );
  }

  if (history.sessions.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        {header}
        <View className="flex-1 items-center justify-center p-6">
          <ChartLine size={40} color={colors.mutedForeground} />
          <Text className="mb-1 mt-4 text-lg font-semibold text-foreground">
            No finished sessions yet
          </Text>
          <Text className="text-center text-muted-foreground">
            Finish a workout with this exercise to see its history here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const sessionCount = history.sessions.length;
  const summary = (
    <View className="mb-2 gap-6">
      <Card className="p-4">
        <Text className="text-sm text-muted-foreground">Best e1RM</Text>
        {history.best ? (
          <>
            <Text className="font-mono text-3xl font-semibold tabular-nums text-foreground">
              {history.best.e1rm} {unit}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {history.best.weight} {unit} × {history.best.reps} on{" "}
              {formatDate(history.best.date)}
            </Text>
          </>
        ) : (
          <Text className="text-sm text-foreground">No loaded work sets yet</Text>
        )}
        <Text className="mt-3 text-xs text-muted-foreground">
          {sessionCount} {sessionCount === 1 ? "session" : "sessions"} · e1RM is
          estimated from work sets with the Epley formula.
        </Text>
      </Card>

      {history.e1rmTrend.length >= 2 && (
        <View>
          <SectionTitle>e1RM over time</SectionTitle>
          <Card className="p-4">
            <E1rmTrendChart data={history.e1rmTrend} unit={unit} />
          </Card>
        </View>
      )}

      {history.repBests.length > 0 && (
        <View>
          <SectionTitle>Best set by reps</SectionTitle>
          <Card className="gap-1 p-4" testID="rep-bests">
            {history.repBests.map((best) => (
              <View
                key={best.reps}
                className="flex-row items-center justify-between py-1"
              >
                <Text className="w-16 font-mono text-sm tabular-nums text-muted-foreground">
                  {best.reps} {best.reps === 1 ? "rep" : "reps"}
                </Text>
                <Text className="flex-1 font-mono text-sm font-medium tabular-nums text-foreground">
                  {best.weight} {unit}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {formatDate(best.date)}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      <SectionTitle>Sessions</SectionTitle>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {header}
      <FlatList
        data={history.sessions}
        keyExtractor={(session) => session.workoutId}
        ListHeaderComponent={summary}
        contentContainerClassName="gap-3 p-4 pb-16"
        renderItem={({ item }) => <SessionCard session={item} unit={unit} />}
      />
    </SafeAreaView>
  );
}
