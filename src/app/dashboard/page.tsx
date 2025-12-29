"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { StartWorkoutSheet } from "@/components/workout/start-workout-sheet";
import { Play, Plus } from "lucide-react";
import { WeeklyStatsGrid, GoalSettingDialog } from "@/components/dashboard";
import { TrainingLabCard } from "@/components/training-lab/training-lab-card";

export default function DashboardPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const user = useQuery(api.users.getCurrentUser);
  const activeWorkout = useQuery(api.workouts.getActiveWorkout);
  const workoutHistory = useQuery(api.workouts.getWorkoutHistory, { limit: 3 });
  const dashboardStats = useQuery(api.workouts.getDashboardStats);

  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const updateWeeklyGoal = useMutation(api.workouts.updateWeeklyGoal);

  const [showStartSheet, setShowStartSheet] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  useEffect(() => {
    if (isClerkLoaded && clerkUser && user === null) {
      getOrCreateUser({
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        name: clerkUser.fullName ?? undefined,
        imageUrl: clerkUser.imageUrl,
      }).catch(console.error);
    }
  }, [isClerkLoaded, clerkUser, user, getOrCreateUser]);

  useEffect(() => {
    if (user && !user.onboardingCompletedAt) {
      router.replace("/onboarding");
    }
  }, [user, router]);

  if (!isClerkLoaded || user === undefined) {
    return (
      <div className="flex min-h-screen flex-col p-4">
        <Skeleton className="mb-6 h-10 w-48" />
        <Skeleton className="mb-4 h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Skeleton className="h-8 w-32" />
        <p className="mt-2 text-sm text-muted-foreground">
          Setting up your account...
        </p>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleSaveGoal = async (newGoal: number) => {
    await updateWeeklyGoal({ weeklyGoal: newGoal });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            OpenFit
          </Link>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4 pb-24">
        <div>
          <h1 className="text-2xl font-bold">
            Hey{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground">Ready to train?</p>
        </div>

        {activeWorkout ? (
          <Card className="border-primary/50 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Workout In Progress</h2>
                <p className="text-sm text-muted-foreground">
                  Started {formatDate(activeWorkout.startedAt)}
                </p>
              </div>
              <Button onClick={() => router.push("/workout/active")}>
                <Play className="mr-2 h-4 w-4" />
                Continue
              </Button>
            </div>
          </Card>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={() => setShowStartSheet(true)}
          >
            <Plus className="mr-2 h-5 w-5" />
            Start Workout
          </Button>
        )}

        {dashboardStats ? (
          <WeeklyStatsGrid
            workoutCount={dashboardStats.weeklyWorkoutCount}
            workoutGoal={dashboardStats.weeklyGoal}
            totalSets={dashboardStats.weeklyTotalSets}
            totalVolume={dashboardStats.weeklyTotalVolume}
            unit={dashboardStats.preferredUnits}
            currentWeek={dashboardStats.currentWeek}
            onEditGoal={() => setShowGoalDialog(true)}
          />
        ) : (
          <Skeleton className="h-40 w-full rounded-lg" />
        )}

        <TrainingLabCard />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              Recent
            </h2>
            {workoutHistory && workoutHistory.length > 0 && (
              <Link
                href="/history"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all
              </Link>
            )}
          </div>
          {workoutHistory === undefined ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : workoutHistory.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              <p className="text-sm">No workouts yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {workoutHistory.map((workout) => (
                <Link key={workout._id} href={`/workout/${workout._id}`}>
                  <div className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {workout.title ?? "Workout"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(workout.startedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-4 border-t pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-mono font-medium">
                          {formatDuration(workout.summary?.totalDurationMinutes)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sets</p>
                        <p className="font-mono font-medium">
                          {workout.summary?.totalSets ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Exercises</p>
                        <p className="font-mono font-medium">
                          {workout.summary?.exerciseCount ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav onStartWorkout={() => setShowStartSheet(true)} />
      <StartWorkoutSheet
        open={showStartSheet}
        onOpenChange={setShowStartSheet}
      />
      <GoalSettingDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        currentGoal={dashboardStats?.weeklyGoal ?? 4}
        onSave={handleSaveGoal}
      />
    </div>
  );
}
