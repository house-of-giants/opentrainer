"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Dumbbell, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { useHaptic } from "@/hooks/use-haptic";

interface StartWorkoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Routine = {
  _id: Id<"routines">;
  name: string;
  days: Array<{
    name: string;
    exercises: Array<{ exerciseName: string }>;
  }>;
};

export function StartWorkoutSheet({ open, onOpenChange }: StartWorkoutSheetProps) {
  const router = useRouter();
  const { vibrate } = useHaptic();
  const routines = useQuery(api.routines.getRoutines, { activeOnly: true });
  const createWorkout = useMutation(api.workouts.createWorkout);

  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartEmpty = async () => {
    setIsStarting(true);
    try {
      vibrate("medium");
      await createWorkout({});
      onOpenChange(false);
      router.push("/workout/active");
    } catch (error) {
      toast.error("Failed to start workout");
      console.error(error);
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
      toast.error("Failed to start workout");
      console.error(error);
    } finally {
      setIsStarting(false);
    }
  };

  const toggleRoutine = (routineId: string) => {
    vibrate("light");
    setExpandedRoutine(expandedRoutine === routineId ? null : routineId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle>Start Workout</SheetTitle>
        </SheetHeader>

        <div className="mt-2 space-y-6 overflow-y-auto px-4 pb-8">
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
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                From Routine
              </h3>
              {(routines as Routine[]).map((routine) => (
                <Card key={routine._id} className="overflow-hidden">
                  <button
                    className="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                    onClick={() => toggleRoutine(routine._id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Dumbbell className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{routine.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {routine.days.length} day{routine.days.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedRoutine === routine._id ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {expandedRoutine === routine._id && (
                    <div className="border-t divide-y">
                      {routine.days.map((day, idx) => (
                        <button
                          key={idx}
                          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
          ) : (
            <Card className="p-6 text-center">
              <Dumbbell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No routines yet. Create one to quickly start workouts!
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
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
