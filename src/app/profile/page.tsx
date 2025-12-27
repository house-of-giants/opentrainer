"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserButton, useUser } from "@clerk/nextjs";
import { LogOut, Settings } from "lucide-react";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { StartWorkoutSheet } from "@/components/workout/start-workout-sheet";

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const user = useQuery(api.users.getCurrentUser);
  const workouts = useQuery(api.workouts.getWorkoutHistory, { limit: 1000, status: "all" });
  
  const [showStartSheet, setShowStartSheet] = useState(false);

  if (!isLoaded || user === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center px-4">
            <Skeleton className="h-6 w-24" />
          </div>
        </header>
        <main className="flex-1 p-4">
          <Skeleton className="mx-auto h-24 w-24 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-6 w-32" />
        </main>
      </div>
    );
  }

  const completedWorkouts = workouts?.filter(w => w.status === "completed") ?? [];
  const totalSets = completedWorkouts.reduce((acc, w) => acc + (w.summary?.totalSets ?? 0), 0);
  const totalVolume = completedWorkouts.reduce((acc, w) => acc + (w.summary?.totalVolume ?? 0), 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="font-semibold text-lg">Profile</h1>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        <div className="flex flex-col items-center py-6">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-24 w-24",
              },
            }}
          />
          <h2 className="mt-4 text-xl font-semibold">
            {clerkUser?.fullName ?? user?.name ?? "Athlete"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {clerkUser?.primaryEmailAddress?.emailAddress}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{completedWorkouts.length}</p>
            <p className="text-xs text-muted-foreground">Workouts</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{totalSets}</p>
            <p className="text-xs text-muted-foreground">Total Sets</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">
              {totalVolume > 1000 
                ? `${(totalVolume / 1000).toFixed(0)}k` 
                : totalVolume}
            </p>
            <p className="text-xs text-muted-foreground">Volume (lb)</p>
          </Card>
        </div>

        <div className="space-y-2">
          <Card className="p-4 cursor-pointer transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span>Settings</span>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5 text-muted-foreground" />
                <span>Sign Out</span>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <BottomNav onStartWorkout={() => setShowStartSheet(true)} />
      <StartWorkoutSheet
        open={showStartSheet}
        onOpenChange={setShowStartSheet}
      />
    </div>
  );
}
