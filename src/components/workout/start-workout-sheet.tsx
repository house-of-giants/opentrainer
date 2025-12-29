"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronRight, Dumbbell, Play, Zap, X } from "lucide-react";
import { toast } from "sonner";
import { useHaptic } from "@/hooks/use-haptic";

interface StartWorkoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeWorkout?: Doc<"workouts"> | null;
}

type Routine = {
  _id: Id<"routines">;
  name: string;
  days: Array<{
    name: string;
    exercises: Array<{ exerciseName: string }>;
  }>;
};

export function StartWorkoutSheet({ open, onOpenChange, activeWorkout }: StartWorkoutSheetProps) {
  const router = useRouter();
  const { vibrate } = useHaptic();
  const routines = useQuery(api.routines.getRoutines, { activeOnly: true });
  const createWorkout = useMutation(api.workouts.createWorkout);
  const cancelWorkout = useMutation(api.workouts.cancelWorkout);

  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleActiveWorkoutError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("already have an active workout")) {
      toast.error("Active workout exists", {
        description: "Complete or cancel your current workout first.",
        action: {
          label: "Go to workout",
          onClick: () => {
            onOpenChange(false);
            router.push("/workout/active");
          },
        },
      });
    } else {
      toast.error("Failed to start workout");
    }
    console.error(error);
  };

  const handleContinueWorkout = () => {
    vibrate("medium");
    onOpenChange(false);
    router.push("/workout/active");
  };

  const handleCancelCurrentWorkout = async () => {
    if (!activeWorkout) return;
    
    setIsCancelling(true);
    try {
      vibrate("warning");
      await cancelWorkout({ workoutId: activeWorkout._id });
      toast.success("Previous workout cancelled");
    } catch (error) {
      toast.error("Failed to cancel workout");
      console.error(error);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleStartEmpty = async () => {
    setIsStarting(true);
    try {
      vibrate("medium");
      await createWorkout({});
      onOpenChange(false);
      router.push("/workout/active");
    } catch (error) {
      handleActiveWorkoutError(error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartFromRoutine = async (routine: Routine, dayIndex: number) => {
    setIsStarting(true);
    try {
      vibrate("medium");
      const day = routine.days[dayIndex];
      await createWorkout({
        title: day.name,
        routineId: routine._id,
        routineDayIndex: dayIndex,
      });
      onOpenChange(false);
      router.push("/workout/active");
    } catch (error) {
      handleActiveWorkoutError(error);
    } finally {
      setIsStarting(false);
    }
  };

  const toggleRoutine = (routineId: string) => {
    vibrate("light");
    setExpandedRoutine(expandedRoutine === routineId ? null : routineId);
  };

  const formatWorkoutTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString("en-US", { 
      weekday: "short", 
      month: "short", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  if (activeWorkout) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Workout In Progress
            </SheetTitle>
            <SheetDescription>
              You already have an active workout. What would you like to do?
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 py-4 pb-8">
            <Card className="border-primary/50 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{activeWorkout.title ?? "Workout"}</p>
                  <p className="text-sm text-muted-foreground">
                    Started {formatWorkoutTime(activeWorkout.startedAt)}
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              <Button
                size="lg"
                className="h-14 w-full text-lg"
                onClick={handleContinueWorkout}
              >
                <Play className="mr-2 h-5 w-5" />
                Continue Workout
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-14 w-full text-lg text-destructive hover:text-destructive"
                onClick={handleCancelCurrentWorkout}
                disabled={isCancelling || isStarting}
              >
                <X className="mr-2 h-5 w-5" />
                {isCancelling ? "Cancelling..." : "Cancel & Start New"}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Cancelling will discard all progress from your current workout.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Start Workout</SheetTitle>
          <SheetDescription>
            Start from scratch or use a saved routine
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
          <Button
            size="lg"
            className="h-16 w-full text-lg"
            onClick={handleStartEmpty}
            disabled={isStarting}
          >
            <Zap className="mr-2 h-5 w-5" />
            Empty Workout
          </Button>

          {routines === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : routines.length > 0 ? (
            <section>
              <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3">
                From Routine
              </h3>
              <div className="space-y-2">
                {(routines as Routine[]).map((routine) => (
                  <Card key={routine._id} className="overflow-hidden">
                    <button
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                      onClick={() => toggleRoutine(routine._id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Dumbbell className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{routine.name}</p>
                          <p className="text-sm text-muted-foreground font-mono tabular-nums">
                            {routine.days.length} day{routine.days.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                          expandedRoutine === routine._id ? "rotate-90" : ""
                        }`}
                      />
                    </button>

                    {expandedRoutine === routine._id && (
                      <div className="border-t divide-y bg-muted/30">
                        {routine.days.map((day, idx) => (
                          <button
                            key={idx}
                            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => handleStartFromRoutine(routine, idx)}
                            disabled={isStarting}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{day.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {day.exercises.slice(0, 3).map(e => e.exerciseName).join(", ")}
                                {day.exercises.length > 3 && ` +${day.exercises.length - 3} more`}
                              </p>
                            </div>
                            <Play className="ml-3 h-4 w-4 shrink-0 text-primary" />
                          </button>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          ) : (
            <Card className="p-6 text-center">
              <Dumbbell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium mb-1">No routines yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create a routine to quickly start similar workouts
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/routines/new");
                }}
              >
                Create Routine
              </Button>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
