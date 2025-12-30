"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserButton, useUser, useClerk, useAuth } from "@clerk/nextjs";
import { SubscriptionDetailsButton } from "@clerk/nextjs/experimental";
import {
  LogOut,
  Scale,
  Target,
  TrendingUp,
  Dumbbell,
  Calendar,
  Pencil,
  Sun,
  Moon,
  Monitor,
  CreditCard,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { StartWorkoutSheet } from "@/components/workout/start-workout-sheet";
import { EditGoalsDialog } from "@/components/profile/edit-goals-dialog";
import { EditExperienceDialog } from "@/components/profile/edit-experience-dialog";
import { EditEquipmentDialog } from "@/components/profile/edit-equipment-dialog";
import { EditAvailabilityDialog } from "@/components/profile/edit-availability-dialog";
import { EditBodyweightDialog } from "@/components/profile/edit-bodyweight-dialog";

const GOAL_LABELS: Record<string, string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  endurance: "Endurance",
  weight_loss: "Weight Loss",
  general_fitness: "General Fitness",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { has } = useAuth();
  const isPro = has?.({ feature: "ai_coach" });
  const user = useQuery(api.users.getCurrentUser);
  const workouts = useQuery(api.workouts.getWorkoutHistory, { limit: 1000, status: "all" });

  const [showStartSheet, setShowStartSheet] = useState(false);
  const [showGoalsDialog, setShowGoalsDialog] = useState(false);
  const [showExperienceDialog, setShowExperienceDialog] = useState(false);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [showBodyweightDialog, setShowBodyweightDialog] = useState(false);
  
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const goalsDisplay = user?.goals?.map(g => GOAL_LABELS[g] ?? g).join(", ") || "Not set";
  const experienceDisplay = user?.experienceLevel ? EXPERIENCE_LABELS[user.experienceLevel] : "Not set";
  const equipmentCount = user?.equipment?.length ?? 0;
  const equipmentDisplay = user?.equipmentDescription
    ? `"${user.equipmentDescription}"`
    : equipmentCount > 0
      ? `${equipmentCount} items selected`
      : "Not set";
  const availabilityDisplay =
    user?.weeklyAvailability && user?.sessionDuration
      ? `${user.weeklyAvailability} days/week · ${user.sessionDuration} min`
      : "Not set";
  const bodyweightUnit = (user?.bodyweightUnit ?? user?.preferredUnits ?? "lb") as "lb" | "kg";
  const bodyweightDisplay = user?.bodyweight
    ? `${user.bodyweight} ${bodyweightUnit}`
    : "Not set";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="font-semibold text-lg">Profile</h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 space-y-6">
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

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-mono font-bold tabular-nums">{completedWorkouts.length}</p>
            <p className="text-xs text-muted-foreground">Workouts</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-mono font-bold tabular-nums">{totalSets}</p>
            <p className="text-xs text-muted-foreground">Total Sets</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-mono font-bold tabular-nums">
              {totalVolume > 1000
                ? `${(totalVolume / 1000).toFixed(0)}k`
                : totalVolume}
            </p>
            <p className="text-xs text-muted-foreground">Volume ({bodyweightUnit})</p>
          </Card>
        </div>

        <section>
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Training Profile
          </h3>
          <div className="space-y-2">
            <Card className="p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between"
                onClick={() => setShowGoalsDialog(true)}
              >
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium">Goals</span>
                    <p className="text-sm text-muted-foreground">{goalsDisplay}</p>
                  </div>
                </div>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            </Card>

            <Card className="p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between"
                onClick={() => setShowExperienceDialog(true)}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium">Experience</span>
                    <p className="text-sm text-muted-foreground">{experienceDisplay}</p>
                  </div>
                </div>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            </Card>

            <Card className="p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between"
                onClick={() => setShowEquipmentDialog(true)}
              >
                <div className="flex items-center gap-3">
                  <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium">Equipment</span>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {equipmentDisplay}
                    </p>
                  </div>
                </div>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            </Card>

            <Card className="p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between"
                onClick={() => setShowAvailabilityDialog(true)}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium">Availability</span>
                    <p className="text-sm text-muted-foreground">{availabilityDisplay}</p>
                  </div>
                </div>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            </Card>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Body
          </h3>
          <Card className="p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between"
              onClick={() => setShowBodyweightDialog(true)}
            >
              <div className="flex items-center gap-3">
                <Scale className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <span className="font-medium">Bodyweight</span>
                  <p className="text-sm text-muted-foreground">{bodyweightDisplay}</p>
                </div>
              </div>
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </button>
          </Card>
        </section>

        <section>
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Preferences
          </h3>
          <Card className="p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between"
              onClick={() => {
                const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
                setTheme(next);
              }}
            >
              <div className="flex items-center gap-3">
                {mounted ? (
                  resolvedTheme === "dark" ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground" />
                  )
                ) : (
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="text-left">
                  <span className="font-medium">Appearance</span>
                  <p className="text-sm text-muted-foreground capitalize">
                    {mounted ? theme : "system"}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {["light", "dark", "system"].map((t) => (
                  <div
                    key={t}
                    className={`h-2 w-2 rounded-full ${
                      theme === t ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </button>
          </Card>
        </section>

        <section>
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Subscription
          </h3>
          <Card className="p-4">
            {isPro ? (
              <SubscriptionDetailsButton>
                <button
                  type="button"
                  className="flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <span className="font-medium">Pro Plan</span>
                      <p className="text-sm text-muted-foreground">Manage subscription</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-500">
                    ACTIVE
                  </span>
                </button>
              </SubscriptionDetailsButton>
            ) : (
              <Link href="/pricing" className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  <div className="text-left">
                    <span className="font-medium">Upgrade to Pro</span>
                    <p className="text-sm text-muted-foreground">Get AI-powered insights</p>
                  </div>
                </div>
                <span className="text-sm text-violet-500">from $6/mo</span>
              </Link>
            )}
          </Card>
        </section>

        <section>
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Account
          </h3>
          <Card className="p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between text-destructive"
              onClick={() => signOut()}
            >
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </div>
            </button>
          </Card>
        </section>
      </main>

      <BottomNav onStartWorkout={() => setShowStartSheet(true)} />
      <StartWorkoutSheet
        open={showStartSheet}
        onOpenChange={setShowStartSheet}
      />

      <EditGoalsDialog
        open={showGoalsDialog}
        onOpenChange={setShowGoalsDialog}
        currentGoals={user?.goals ?? []}
      />
      <EditExperienceDialog
        open={showExperienceDialog}
        onOpenChange={setShowExperienceDialog}
        currentLevel={user?.experienceLevel}
      />
      <EditEquipmentDialog
        open={showEquipmentDialog}
        onOpenChange={setShowEquipmentDialog}
        currentDescription={user?.equipmentDescription}
        currentEquipment={user?.equipment ?? []}
      />
      <EditAvailabilityDialog
        open={showAvailabilityDialog}
        onOpenChange={setShowAvailabilityDialog}
        currentDays={user?.weeklyAvailability}
        currentDuration={user?.sessionDuration}
      />
      <EditBodyweightDialog
        open={showBodyweightDialog}
        onOpenChange={setShowBodyweightDialog}
        currentWeight={user?.bodyweight}
        currentUnit={bodyweightUnit}
      />
    </div>
  );
}
