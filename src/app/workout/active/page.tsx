"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { CardioExerciseCard } from "@/components/workout/cardio-exercise-card";
import { RestTimer } from "@/components/workout/rest-timer";
import { AddExerciseSheet, ExerciseSelection } from "@/components/workout/add-exercise-sheet";
import { SaveAsRoutineDialog } from "@/components/workout/save-as-routine-dialog";
import { SmartSwapSheet } from "@/components/workout/smart-swap-sheet";
import { SwapFollowUpDialog } from "@/components/workout/swap-followup-dialog";
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
  cardio?: {
    durationSeconds: number;
    distance?: number;
    distanceUnit?: "km" | "mi";
    rpe?: number;
    vestWeight?: number;
    vestWeightUnit?: "kg" | "lb";
  };
};

type PendingExercise = {
  name: string;
  category: "lifting" | "cardio" | "mobility" | "other";
  primaryMetric?: "duration" | "distance";
  targetSets?: number;
  targetReps?: string;
  targetDurationMinutes?: number;
  equipment?: string[];
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
  const [pendingExercises, setPendingExercises] = useState<PendingExercise[]>([]);
  const [swapExercise, setSwapExercise] = useState<string | null>(null);
  const [showSwapFollowUp, setShowSwapFollowUp] = useState(false);

  const workout = useQuery(api.workouts.getActiveWorkout);
  const entries = useQuery(
    api.entries.getEntriesByWorkout,
    workout ? { workoutId: workout._id } : "skip"
  );
  const routineExercises = useQuery(
    api.workouts.getRoutineExercisesForWorkout,
    workout ? { workoutId: workout._id } : "skip"
  );
  const pendingSwaps = useQuery(
    api.ai.swapMutations.getSwapsForWorkout,
    workout ? { workoutId: workout._id } : "skip"
  );

  const duration = useDuration(workout?.startedAt);

  const addLiftingEntry = useMutation(api.entries.addLiftingEntry);
  const addCardioEntry = useMutation(api.entries.addCardioEntry);
  const completeWorkout = useMutation(api.workouts.completeWorkout);
  const cancelWorkout = useMutation(api.workouts.cancelWorkout);

  const exerciseGroups = useMemo(() => {
    const groups = new Map<string, { entries: EntryData[]; meta: PendingExercise }>();

    if (entries) {
      for (const entry of entries) {
        const existing = groups.get(entry.exerciseName);
        if (existing) {
          existing.entries.push(entry as EntryData);
        } else {
          groups.set(entry.exerciseName, {
            entries: [entry as EntryData],
            meta: {
              name: entry.exerciseName,
              category: entry.kind === "cardio" ? "cardio" : "lifting",
              primaryMetric: entry.kind === "cardio" ? "duration" : undefined,
            },
          });
        }
      }
    }

    for (const pending of pendingExercises) {
      if (!groups.has(pending.name)) {
        groups.set(pending.name, { entries: [], meta: pending });
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
      const pending: PendingExercise[] = routineExercises.map((ex) => {
        const exerciseWithEquipment = ex as typeof ex & { equipment?: string[] };
        return {
          name: ex.exerciseName,
          category: ex.kind === "cardio" ? "cardio" as const : "lifting" as const,
          primaryMetric: ex.kind === "cardio" ? "duration" as const : undefined,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetDurationMinutes: ex.targetDuration,
          equipment: exerciseWithEquipment.equipment,
        };
      });
      setPendingExercises(pending);
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
    const group = exerciseGroups.get(exerciseName);
    const existingSets = group?.entries ?? [];
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
      setPendingExercises((prev) => prev.filter((p) => p.name !== exerciseName));
    } catch (error) {
      toast.error("Failed to log set");
      console.error(error);
    }
  };

  const handleLogCardio = async (
    exerciseName: string,
    data: {
      durationSeconds: number;
      distance?: number;
      distanceUnit?: "km" | "mi";
      rpe?: number;
      vestWeight?: number;
      vestWeightUnit?: "kg" | "lb";
      intensity?: number;
    }
  ) => {
    try {
      await addCardioEntry({
        workoutId: workout._id,
        clientId: generateClientId(),
        exerciseName,
        cardio: {
          mode: "steady",
          durationSeconds: data.durationSeconds,
          distance: data.distance,
          distanceUnit: data.distanceUnit === "km" ? "km" : data.distanceUnit === "mi" ? "mi" : undefined,
          rpe: data.rpe,
          vestWeight: data.vestWeight,
          vestWeightUnit: data.vestWeightUnit,
          intensity: data.intensity,
        },
      });
      setPendingExercises((prev) => prev.filter((p) => p.name !== exerciseName));
      toast.success("Cardio logged!");
    } catch (error) {
      toast.error("Failed to log cardio");
      console.error(error);
    }
  };

  const handleAddExercise = (exercise: ExerciseSelection) => {
    if (!exerciseGroups.has(exercise.name)) {
      setPendingExercises((prev) => [...prev, exercise]);
    }
    setShowAddExercise(false);
  };

  const handleSwapComplete = (oldExercise: string, newExercise: string) => {
    const isPendingExercise = pendingExercises.some((p) => p.name === oldExercise);
    
    if (isPendingExercise) {
      setPendingExercises((prev) =>
        prev.map((p) => (p.name === oldExercise ? { ...p, name: newExercise } : p))
      );
    } else if (!exerciseGroups.has(newExercise)) {
      setPendingExercises((prev) => [...prev, { name: newExercise, category: "lifting" as const }]);
    }
    setSwapExercise(null);
  };

  const handleComplete = async () => {
    vibrate("success");
    try {
      await completeWorkout({ workoutId: workout._id });
      toast.success("Workout completed!");
      
      const hasSwapsNeedingFollowUp = pendingSwaps && pendingSwaps.length > 0;
      
      if (hasSwapsNeedingFollowUp) {
        setShowSwapFollowUp(true);
      } else {
        handlePostWorkoutFlow();
      }
    } catch (error) {
      toast.error("Failed to complete workout");
      console.error(error);
    }
  };

  const handlePostWorkoutFlow = () => {
    const hasExercises = exerciseGroups.size > 0;
    const isFromRoutine = !!workout.routineId;
    
    if (hasExercises && !isFromRoutine) {
      setShowSaveRoutine(true);
    } else {
      router.push("/dashboard");
    }
  };

  const handleSwapFollowUpComplete = () => {
    setShowSwapFollowUp(false);
    handlePostWorkoutFlow();
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
            <p className="text-xs text-muted-foreground font-mono tabular-nums">{duration}</p>
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

        {Array.from(exerciseGroups.entries()).map(([name, { entries, meta }]) => {
          if (meta.category === "cardio") {
            const hasLogged = entries.some((e) => e.kind === "cardio");
            if (hasLogged) {
              return (
                <CardioExerciseCard
                  key={name}
                  exerciseName={name}
                  primaryMetric={meta.primaryMetric ?? "duration"}
                  defaultMinutes={meta.targetDurationMinutes}
                  onLog={() => {}}
                />
              );
            }
            return (
              <CardioExerciseCard
                key={name}
                exerciseName={name}
                primaryMetric={meta.primaryMetric ?? "duration"}
                defaultMinutes={meta.targetDurationMinutes}
                onLog={(data) => handleLogCardio(name, data)}
              />
            );
          }

          const sets = entries
            .filter((e) => e.kind === "lifting" && e.lifting)
            .map((e) => ({
              setNumber: e.lifting!.setNumber,
              reps: e.lifting!.reps ?? 0,
              weight: e.lifting!.weight ?? 0,
              unit: (e.lifting!.unit ?? "lb") as "lb" | "kg",
            }));

          const parseTargetReps = (targetReps?: string): number | undefined => {
            if (!targetReps) return undefined;
            const match = targetReps.match(/\d+/);
            return match ? parseInt(match[0], 10) : undefined;
          };

          return (
            <ExerciseCard
              key={name}
              exerciseName={name}
              sets={sets}
              equipment={meta.equipment}
              defaultReps={parseTargetReps(meta.targetReps)}
              onAddSet={(set) => handleAddSet(name, set)}
              onSwap={() => setSwapExercise(name)}
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

      {swapExercise && (
        <SmartSwapSheet
          open={!!swapExercise}
          onOpenChange={(open) => !open && setSwapExercise(null)}
          workoutId={workout._id}
          exerciseName={swapExercise}
          onSwapComplete={(newExercise) => handleSwapComplete(swapExercise, newExercise)}
        />
      )}

      <SwapFollowUpDialog
        open={showSwapFollowUp}
        onOpenChange={setShowSwapFollowUp}
        swaps={pendingSwaps ?? []}
        onComplete={handleSwapFollowUpComplete}
      />
    </div>
  );
}
