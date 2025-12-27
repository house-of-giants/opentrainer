"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { RestTimer } from "@/components/workout/rest-timer";
import { AddExerciseSheet } from "@/components/workout/add-exercise-sheet";
import { SaveAsRoutineDialog } from "@/components/workout/save-as-routine-dialog";
import { useClientId } from "@/hooks/use-client-id";
import { useHaptic } from "@/hooks/use-haptic";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type EntryData = {
  exerciseName: string;
  kind: "lifting" | "cardio";
  lifting?: {
    setNumber: number;
    reps?: number;
    weight?: number;
    unit: "kg" | "lb";
  };
};

function useDuration(startedAt: number | undefined) {
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (!startedAt) return;

    const update = () => {
      const minutes = Math.floor((Date.now() - startedAt) / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      setDuration(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return duration;
}

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const { generateClientId } = useClientId();
  const { vibrate } = useHaptic();
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showSaveRoutine, setShowSaveRoutine] = useState(false);
  const [pendingExercises, setPendingExercises] = useState<string[]>([]);

  const workout = useQuery(api.workouts.getActiveWorkout);
  const entries = useQuery(
    api.entries.getEntriesByWorkout,
    workout ? { workoutId: workout._id } : "skip"
  );
  const routineExercises = useQuery(
    api.workouts.getRoutineExercisesForWorkout,
    workout ? { workoutId: workout._id } : "skip"
  );

  const duration = useDuration(workout?.startedAt);

  const addLiftingEntry = useMutation(api.entries.addLiftingEntry);
  const completeWorkout = useMutation(api.workouts.completeWorkout);
  const cancelWorkout = useMutation(api.workouts.cancelWorkout);

  const exerciseGroups = useMemo(() => {
    const groups = new Map<string, EntryData[]>();

    if (entries) {
      for (const entry of entries) {
        const existing = groups.get(entry.exerciseName) ?? [];
        groups.set(entry.exerciseName, [...existing, entry as EntryData]);
      }
    }

    for (const name of pendingExercises) {
      if (!groups.has(name)) {
        groups.set(name, []);
      }
    }

    return groups;
  }, [entries, pendingExercises]);

  useEffect(() => {
    if (workout === null) {
      router.push("/dashboard");
    }
  }, [workout, router]);

  useEffect(() => {
    if (routineExercises && routineExercises.length > 0 && pendingExercises.length === 0 && entries?.length === 0) {
      const exerciseNames = routineExercises.map((ex) => ex.exerciseName);
      setPendingExercises(exerciseNames);
    }
  }, [routineExercises, entries, pendingExercises.length]);

  if (workout === undefined || workout === null) {
    return (
      <div className="flex min-h-screen flex-col p-4">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-4 h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleAddSet = async (
    exerciseName: string,
    set: { reps: number; weight: number; unit: "lb" | "kg" }
  ) => {
    const existingSets = exerciseGroups.get(exerciseName) ?? [];
    const setNumber = existingSets.length + 1;

    try {
      await addLiftingEntry({
        workoutId: workout._id,
        clientId: generateClientId(),
        exerciseName,
        lifting: {
          setNumber,
          reps: set.reps,
          weight: set.weight,
          unit: set.unit,
        },
      });
      setShowRestTimer(true);
      setPendingExercises((prev) => prev.filter((n) => n !== exerciseName));
    } catch (error) {
      toast.error("Failed to log set");
      console.error(error);
    }
  };

  const handleAddExercise = (name: string) => {
    if (!exerciseGroups.has(name)) {
      setPendingExercises((prev) => [...prev, name]);
    }
    setShowAddExercise(false);
  };

  const handleComplete = async () => {
    vibrate("success");
    try {
      await completeWorkout({ workoutId: workout._id });
      toast.success("Workout completed!");
      
      const hasExercises = exerciseGroups.size > 0;
      const isFromRoutine = !!workout.routineId;
      
      if (hasExercises && !isFromRoutine) {
        setShowSaveRoutine(true);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("Failed to complete workout");
      console.error(error);
    }
  };

  const handleRoutineDialogComplete = () => {
    router.push("/dashboard");
  };

  const handleCancel = async () => {
    vibrate("warning");
    try {
      await cancelWorkout({ workoutId: workout._id });
      toast.success("Workout cancelled");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Failed to cancel workout");
      console.error(error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div>
            <h1 className="font-semibold">{workout.title ?? "Workout"}</h1>
            <p className="text-xs text-muted-foreground">{duration}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleComplete}>
              Finish
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4">
        {showRestTimer && (
          <RestTimer
            defaultSeconds={90}
            autoStart
            onComplete={() => setShowRestTimer(false)}
          />
        )}

        {Array.from(exerciseGroups.entries()).map(([name, exerciseEntries]) => {
          const sets = exerciseEntries
            .filter((e) => e.kind === "lifting" && e.lifting)
            .map((e) => ({
              setNumber: e.lifting!.setNumber,
              reps: e.lifting!.reps ?? 0,
              weight: e.lifting!.weight ?? 0,
              unit: (e.lifting!.unit ?? "lb") as "lb" | "kg",
            }));

          return (
            <ExerciseCard
              key={name}
              exerciseName={name}
              sets={sets}
              onAddSet={(set) => handleAddSet(name, set)}
            />
          );
        })}

        <Button
          variant="outline"
          size="lg"
          className="h-16 w-full text-lg"
          onClick={() => setShowAddExercise(true)}
        >
          + Add Exercise
        </Button>
      </main>

      <AddExerciseSheet
        open={showAddExercise}
        onOpenChange={setShowAddExercise}
        onSelectExercise={handleAddExercise}
      />

      <SaveAsRoutineDialog
        open={showSaveRoutine}
        onOpenChange={setShowSaveRoutine}
        workoutId={workout._id}
        workoutTitle={workout.title}
        onComplete={handleRoutineDialogComplete}
      />
    </div>
  );
}
