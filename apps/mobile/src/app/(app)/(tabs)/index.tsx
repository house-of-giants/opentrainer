import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import { User } from "lucide-react-native";

import { DashboardBriefCard, GoalSettingDialog, WeeklyStatsGrid } from "@/components/dashboard";
import { TrainingLabCard } from "@/components/training-lab/training-lab-card";
import { AsciiLogo } from "@/components/ui/ascii-logo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStartWorkout } from "@/components/workout/start-workout-provider";
import { analytics } from "@/lib/analytics";
import { formatDuration } from "@/lib/utils";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/dashboard/page.tsx.
export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const startWorkout = useStartWorkout();

  const user = useQuery(api.users.getCurrentUser);
  const activeWorkout = useQuery(api.workouts.getActiveWorkout);
  const workoutHistory = useQuery(api.workouts.getWorkoutHistory, { limit: 3 });
  const dashboardStats = useQuery(api.workouts.getDashboardStats);

  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const updateWeeklyGoal = useMutation(api.workouts.updateWeeklyGoal);

  const [showGoalDialog, setShowGoalDialog] = useState(false);

  useEffect(() => {
    if (isClerkLoaded && clerkUser && user === null) {
      getOrCreateUser({
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        name: clerkUser.fullName ?? undefined,
        imageUrl: clerkUser.imageUrl,
      })
        .then((result) => {
          analytics.identify(clerkUser.id, {
            name: clerkUser.fullName,
            email: clerkUser.primaryEmailAddress?.emailAddress,
          });
          if (result && (result as { isNew?: boolean }).isNew) {
            analytics.capture("user_signed_up", { clerk_id: clerkUser.id });
          }
        })
        .catch(console.error);
    }
  }, [isClerkLoaded, clerkUser, user, getOrCreateUser]);

  useEffect(() => {
    if (user && !user.onboardingCompletedAt) {
      // integration: the onboarding screen ships in a later phase.
      router.replace("/(app)/onboarding");
    }
  }, [user, router]);

  if (!isClerkLoaded || user === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 p-4">
          <Skeleton className="mb-6 h-10 w-48" />
          <Skeleton className="mb-4 h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </View>
      </SafeAreaView>
    );
  }

  if (user === null) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center p-4">
          <Skeleton className="h-8 w-32" />
          <Text className="mt-2 text-sm text-muted-foreground">
            Setting up your account...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatCardioDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const handleSaveGoal = async (newGoal: number) => {
    await updateWeeklyGoal({ weeklyGoal: newGoal });
    analytics.capture("weekly_goal_updated", {
      new_goal: newGoal,
      previous_goal: dashboardStats?.weeklyGoal,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="h-14 flex-row items-center justify-between border-b border-border px-4">
        <View className="flex-row items-center gap-2">
          <AsciiLogo />
          <Badge className="bg-primary/10" textClassName="text-[10px] text-primary">
            Alpha
          </Badge>
        </View>
        {/* Clerk's <UserButton /> is web-only; the avatar deep-links to the
            profile tab, which owns account actions on mobile. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push("/(app)/(tabs)/profile")}
        >
          {clerkUser?.imageUrl ? (
            <Image
              source={{ uri: clerkUser.imageUrl }}
              className="h-8 w-8 rounded-full"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View className="h-8 w-8 items-center justify-center rounded-full bg-muted">
              <User size={16} color={colors.mutedForeground} />
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-24">
        {dashboardStats && activeWorkout !== undefined && workoutHistory !== undefined ? (
          <DashboardBriefCard
            weeklyWorkoutCount={dashboardStats.weeklyWorkoutCount}
            weeklyGoal={dashboardStats.weeklyGoal}
            weeklyTotalSets={dashboardStats.weeklyTotalSets}
            weeklyTotalDuration={dashboardStats.weeklyTotalDuration}
            hasActiveWorkout={!!activeWorkout}
            hasHistory={(workoutHistory?.length ?? 0) > 0}
            onStartWorkout={startWorkout.open}
            onContinueWorkout={() => router.push("/(app)/workout/active")}
          />
        ) : (
          <Skeleton className="h-36 w-full rounded-lg" />
        )}

        {dashboardStats ? (
          <WeeklyStatsGrid
            workoutCount={dashboardStats.weeklyWorkoutCount}
            workoutGoal={dashboardStats.weeklyGoal}
            totalSets={dashboardStats.weeklyTotalSets}
            totalVolume={dashboardStats.weeklyTotalVolume}
            totalDuration={dashboardStats.weeklyTotalDuration}
            unit={dashboardStats.preferredUnits}
            currentWeek={dashboardStats.currentWeek}
            onEditGoal={() => setShowGoalDialog(true)}
          />
        ) : (
          <Skeleton className="h-40 w-full rounded-lg" />
        )}

        <TrainingLabCard />

        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
              Recent
            </Text>
            {workoutHistory && workoutHistory.length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(app)/(tabs)/history")}
              >
                <Text className="text-xs text-muted-foreground">View all</Text>
              </Pressable>
            )}
          </View>

          {workoutHistory === undefined ? (
            <View className="gap-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </View>
          ) : workoutHistory.length === 0 ? (
            <View className="rounded-lg border border-dashed border-border p-6">
              <Text className="text-center text-sm text-muted-foreground">
                No workouts yet
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {workoutHistory.map((workout) => (
                <Pressable
                  key={workout._id}
                  accessibilityRole="button"
                  className="rounded-xl border border-border bg-card p-4 active:bg-muted/50"
                  onPress={() => router.push(`/(app)/workout/${workout._id}`)}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="gap-1">
                      <Text className="font-semibold text-foreground">
                        {workout.title ?? "Workout"}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {formatDate(workout.startedAt)}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row gap-4 border-t border-border pt-3">
                    <View>
                      <Text className="text-xs text-muted-foreground">Duration</Text>
                      <Text className="font-mono font-medium text-foreground">
                        {formatDuration(workout.summary?.totalDurationMinutes, "—")}
                      </Text>
                    </View>
                    {(workout.summary?.totalSets ?? 0) > 0 ? (
                      <View>
                        <Text className="text-xs text-muted-foreground">Sets</Text>
                        <Text className="font-mono font-medium text-foreground">
                          {workout.summary?.totalSets}
                        </Text>
                      </View>
                    ) : workout.summary?.totalCardioDurationSeconds ? (
                      <View>
                        <Text className="text-xs text-muted-foreground">Cardio</Text>
                        <Text className="font-mono font-medium text-foreground">
                          {formatCardioDuration(
                            workout.summary.totalCardioDurationSeconds,
                          )}
                        </Text>
                      </View>
                    ) : null}
                    <View>
                      <Text className="text-xs text-muted-foreground">Exercises</Text>
                      <Text className="font-mono font-medium text-foreground">
                        {workout.summary?.exerciseCount ?? 0}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <GoalSettingDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        currentGoal={dashboardStats?.weeklyGoal ?? 4}
        onSave={handleSaveGoal}
      />
    </SafeAreaView>
  );
}
