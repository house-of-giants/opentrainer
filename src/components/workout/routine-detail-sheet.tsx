"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHaptic } from "@/hooks/use-haptic";

export type RoutineForDetail = {
  _id: Id<"routines">;
  name: string;
  description?: string;
  days: Array<{
    name: string;
    exercises: Array<{
      exerciseName: string;
      targetSets?: number;
      targetReps?: string;
    }>;
  }>;
};

interface RoutineDetailSheetProps {
  routine: RoutineForDetail | null;
  onOpenChange: (open: boolean) => void;
}

export function RoutineDetailSheet({ routine, onOpenChange }: RoutineDetailSheetProps) {
  const router = useRouter();
  const { vibrate } = useHaptic();
  const createWorkout = useMutation(api.workouts.createWorkout);
  const deleteRoutine = useMutation(api.routines.deleteRoutine);

  const [isStarting, setIsStarting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStartWorkout = async (dayIndex: number) => {
    if (!routine) return;
    
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

  const handleEdit = () => {
    if (!routine) return;
    onOpenChange(false);
    router.push(`/routines/${routine._id}/edit`);
  };

  const handleDelete = async () => {
    if (!routine) return;
    
    setIsDeleting(true);
    try {
      vibrate("medium");
      await deleteRoutine({ routineId: routine._id });
      toast.success("Routine deleted");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete routine");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={!!routine} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        {routine && (
          <>
            <SheetHeader>
              <SheetTitle>{routine.name}</SheetTitle>
              {routine.description && (
                <SheetDescription>{routine.description}</SheetDescription>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 space-y-4">
              <h4 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                Select a day to start
              </h4>
              
              {routine.days.map((day, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-medium">{day.name}</h5>
                        <p className="text-sm text-muted-foreground font-mono tabular-nums">
                          {day.exercises.length} exercise{day.exercises.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleStartWorkout(idx)}
                        disabled={isStarting}
                      >
                        <Play className="mr-1.5 h-4 w-4" />
                        Start
                      </Button>
                    </div>
                    
                    <div className="space-y-1.5 border-t pt-3">
                      {day.exercises.slice(0, 4).map((ex, exIdx) => (
                        <div key={exIdx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate flex-1">
                            {ex.exerciseName}
                          </span>
                          {ex.targetSets && (
                            <span className="text-xs text-muted-foreground font-mono tabular-nums ml-2">
                              {ex.targetSets}×{ex.targetReps || "?"}
                            </span>
                          )}
                        </div>
                      ))}
                      {day.exercises.length > 4 && (
                        <p className="text-xs text-muted-foreground">
                          +{day.exercises.length - 4} more exercises
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <SheetFooter className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleEdit}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
