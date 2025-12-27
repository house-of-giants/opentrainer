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
import { Play } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  
  const user = useQuery(api.users.getCurrentUser);
  const activeWorkout = useQuery(api.workouts.getActiveWorkout);
  const workoutHistory = useQuery(api.workouts.getWorkoutHistory, { limit: 5 });
  
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  const [showStartSheet, setShowStartSheet] = useState(false);

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

  if (!isClerkLoaded || user === undefined) {
    return (
      <div className="flex min-h-screen flex-col p-4">
        <Skeleton className="mb-6 h-10 w-48" />
        <Skeleton className="mb-4 h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Skeleton className="h-8 w-32" />
        <p className="mt-2 text-sm text-muted-foreground">Setting up your account...</p>
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-bold text-xl">
            OpenFit
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Hey{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground">Ready to train?</p>
        </div>

        {activeWorkout && (
          <Card className="mb-6 p-4 border-primary/50 bg-primary/5">
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
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent Workouts</h2>
            {workoutHistory && workoutHistory.length > 0 && (
              <Link href="/history" className="text-sm text-primary">
                View all
              </Link>
            )}
          </div>
          {workoutHistory === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : workoutHistory.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <p>No workouts yet.</p>
              <p className="text-sm">Tap + below to start your first workout!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {workoutHistory.map((workout) => (
                <Link key={workout._id} href={`/workout/${workout._id}`}>
                  <Card className="p-4 transition-colors hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {workout.title ?? "Workout"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(workout.startedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatDuration(workout.summary?.totalDurationMinutes)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {workout.summary?.totalSets ?? 0} sets
                        </p>
                      </div>
                    </div>
                  </Card>
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
    </div>
  );
}
