"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";
import { routineDayLabel } from "@opentrainer/lib/next-session";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type SavedRoutine = {
  _id: Id<"routines">;
  name: string;
  days: Array<{ name: string; exercises: Array<{ exerciseName: string }> }>;
};

/**
 * The end of the "Bring my program" and "Start from scratch" onboarding
 * paths: the saved routine's day 1, one click from starting it.
 */
export function FirstDayReady({ routine }: { routine: SavedRoutine }) {
  const router = useRouter();
  const createWorkout = useMutation(api.workouts.createWorkout);
  const [isStarting, setIsStarting] = useState(false);
  const day = routine.days[0];

  const startDayOne = async () => {
    setIsStarting(true);
    try {
      await createWorkout({ title: day.name, routineId: routine._id, routineDayIndex: 0 });
      posthog.capture("workout_started", {
        source: "routine",
        routine_name: routine.name,
        day_name: day.name,
        day_index: 0,
        exercise_count: day.exercises.length,
        entry_point: "onboarding",
        is_next_day: true,
      });
      router.replace("/workout/active");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already have an active workout")) {
        toast.error("Active workout exists", {
          description: "Complete or cancel your current workout first.",
          action: { label: "Go to workout", onClick: () => router.push("/workout/active") },
        });
      } else {
        toast.error("Failed to start workout");
      }
      console.error(error);
      setIsStarting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center px-6">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Your routine is saved</h1>
            <p className="text-muted-foreground">Start day 1 now, or find it on your dashboard later.</p>
          </div>
          <Card className="gap-2 p-4">
            <p className="truncate font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Next up · {routine.name}
            </p>
            <p className="text-lg font-semibold leading-tight">{routineDayLabel(0, day.name)}</p>
            <ul className="text-sm text-muted-foreground">
              {day.exercises.map((exercise, index) => (
                <li key={`${index}-${exercise.exerciseName}`}>{exercise.exerciseName}</li>
              ))}
            </ul>
          </Card>
          <div className="space-y-2">
            <Button
              size="lg"
              className="h-14 w-full text-lg font-semibold"
              onClick={startDayOne}
              disabled={isStarting}
            >
              {isStarting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Show me day 1
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
