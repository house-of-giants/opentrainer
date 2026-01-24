"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SignUpButton } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";
import { ExerciseAccordion } from "@/components/workout/exercise-accordion";
import { RestTimerOverlay } from "@/components/workout/rest-timer-overlay";

type DemoSet = {
  entryId: string;
  setNumber: number;
  reps: number;
  weight: number;
  unit: "lb" | "kg";
  isBodyweight?: boolean;
};

type DemoExercise = {
  name: string;
  sets: DemoSet[];
  targetSets: number;
  targetReps: string;
  equipment?: string[];
  lastSession?: {
    weight: number;
    reps: number;
    rpe: number | null;
    date: string;
    unit: "lb" | "kg";
  };
  progressionSuggestion?: {
    type: "increase_weight" | "increase_reps" | "hold" | "deload";
    targetWeight: number | null;
    targetReps: number | null;
    reasoning: string | null;
  };
};

const INITIAL_EXERCISES: DemoExercise[] = [
  {
    name: "Bench Press",
    sets: [],
    targetSets: 4,
    targetReps: "8-10",
    equipment: ["barbell"],
    lastSession: {
      weight: 135,
      reps: 10,
      rpe: 7,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      unit: "lb",
    },
    progressionSuggestion: {
      type: "increase_weight",
      targetWeight: 140,
      targetReps: 8,
      reasoning: "Ready for more weight",
    },
  },
  {
    name: "Overhead Press",
    sets: [],
    targetSets: 3,
    targetReps: "8-10",
    equipment: ["barbell"],
    lastSession: {
      weight: 95,
      reps: 8,
      rpe: 8,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      unit: "lb",
    },
    progressionSuggestion: {
      type: "hold",
      targetWeight: 95,
      targetReps: 10,
      reasoning: "Build volume first",
    },
  },
  {
    name: "Tricep Dips",
    sets: [],
    targetSets: 3,
    targetReps: "10-12",
    equipment: ["bodyweight"],
    lastSession: {
      weight: 0,
      reps: 12,
      rpe: 6,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      unit: "lb",
    },
    progressionSuggestion: {
      type: "increase_reps",
      targetWeight: 0,
      targetReps: 15,
      reasoning: "Push endurance",
    },
  },
];

const AVAILABLE_EXERCISES: DemoExercise[] = [
  {
    name: "Incline Dumbbell Press",
    sets: [],
    targetSets: 3,
    targetReps: "8-12",
    equipment: ["dumbbells"],
    lastSession: {
      weight: 60,
      reps: 10,
      rpe: 7,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      unit: "lb",
    },
  },
  {
    name: "Lateral Raises",
    sets: [],
    targetSets: 3,
    targetReps: "12-15",
    equipment: ["dumbbells"],
    lastSession: {
      weight: 20,
      reps: 12,
      rpe: 6,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      unit: "lb",
    },
  },
  {
    name: "Cable Flyes",
    sets: [],
    targetSets: 3,
    targetReps: "10-12",
    equipment: ["cable"],
    lastSession: {
      weight: 40,
      reps: 12,
      rpe: 7,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      unit: "lb",
    },
  },
];

export default function DemoWorkout() {
  const router = useRouter();
  const [exercises, setExercises] = useState<DemoExercise[]>(INITIAL_EXERCISES);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [startTime] = useState(Date.now());
  const [duration, setDuration] = useState("0m");
  const exerciseRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const addingSetRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const minutes = Math.floor((Date.now() - startTime) / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      setDuration(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    const currentExercise = exercises[currentExerciseIndex];
    if (!currentExercise) return;

    const element = exerciseRefs.current.get(currentExercise.name);
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [currentExerciseIndex]);

  const handleAddSet = useCallback((
    exerciseIndex: number,
    set: { reps: number; weight: number; unit: "lb" | "kg"; isBodyweight?: boolean; rpe?: number | null }
  ) => {
    if (addingSetRef.current) {
      return;
    }
    
    addingSetRef.current = true;

    setExercises((prev) => {
      const updated = prev.map((ex, idx) => {
        if (idx !== exerciseIndex) return ex;
        
        const newSet: DemoSet = {
          entryId: `demo-${Date.now()}-${ex.sets.length}`,
          setNumber: ex.sets.length + 1,
          reps: set.reps,
          weight: set.weight,
          unit: set.unit,
          isBodyweight: set.isBodyweight,
        };

        const newSets = [...ex.sets, newSet];

        if (newSets.length >= ex.targetSets && exerciseIndex < prev.length - 1) {
          setTimeout(() => setCurrentExerciseIndex(exerciseIndex + 1), 800);
        }

        return {
          ...ex,
          sets: newSets,
        };
      });

      return updated;
    });
    
    setShowRestTimer(true);

    setTimeout(() => {
      addingSetRef.current = false;
    }, 1000);
  }, []);

  const handleFinish = () => {
    setShowCompletion(true);
  };

  const handleAddExercise = (exerciseName: string) => {
    const exerciseToAdd = AVAILABLE_EXERCISES.find((ex) => ex.name === exerciseName);
    if (!exerciseToAdd) return;

    setExercises((prev) => [...prev, { ...exerciseToAdd, sets: [] }]);
    setShowAddExercise(false);
  };

  if (showCompletion) {
    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const totalVolume = exercises.reduce(
      (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
      0
    );

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center space-y-6">
          <div className="flex justify-center">
            <Sparkles className="h-16 w-16 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Workout Complete!</h1>
            <p className="text-muted-foreground">
              That was fast, right? Just {totalSets} sets logged in seconds.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Sets</p>
              <p className="text-2xl font-bold">{totalSets}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Volume</p>
              <p className="text-2xl font-bold">{totalVolume.toLocaleString()} lb</p>
            </div>
          </div>
          <div className="space-y-3">
            <SignUpButton mode="modal">
              <Button size="lg" className="w-full">
                Create Account to Save Progress
              </Button>
            </SignUpButton>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => router.push("/demo")}
            >
              Back to Demo Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">Push Day Demo</h1>
            <p className="text-xs text-muted-foreground font-mono tabular-nums">{duration}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push("/demo")}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleFinish}>
              Finish
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4">
        {exercises.map((exercise, index) => {
          const isComplete = exercise.sets.length >= exercise.targetSets;
          const isCurrent = index === currentExerciseIndex;
          const status = isComplete ? "completed" : isCurrent ? "current" : "upcoming";

          const handleAddSetForExercise = (set: { reps: number; weight: number; unit: "lb" | "kg"; isBodyweight?: boolean; rpe?: number | null }) => {
            handleAddSet(index, set);
          };

          const handleSelectExercise = () => {
            setCurrentExerciseIndex(index);
          };

          return (
            <div
              key={exercise.name}
              ref={(el) => {
                if (el) exerciseRefs.current.set(exercise.name, el);
              }}
            >
              <ExerciseAccordion
                exerciseName={exercise.name}
                sets={exercise.sets}
                status={status}
                equipment={exercise.equipment}
                defaultReps={10}
                targetSets={exercise.targetSets}
                targetReps={exercise.targetReps}
                lastSession={exercise.lastSession}
                progressionSuggestion={exercise.progressionSuggestion}
                onAddSet={handleAddSetForExercise}
                onSelect={handleSelectExercise}
              />
            </div>
          );
        })}

        <Button
          size="lg"
          className="h-16 w-full text-lg"
          variant="outline"
          onClick={() => setShowAddExercise(true)}
        >
          + Add Exercise
        </Button>
      </main>

      <Drawer open={showAddExercise} onOpenChange={setShowAddExercise}>
        <DrawerContent className="h-[60vh]">
          <DrawerHeader>
            <DrawerTitle>Add Exercise</DrawerTitle>
            <DrawerDescription>
              Choose an exercise to add to your workout
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
            {AVAILABLE_EXERCISES.filter(
              (ex) => !exercises.find((e) => e.name === ex.name)
            ).map((exercise) => (
              <button
                key={exercise.name}
                className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                onClick={() => handleAddExercise(exercise.name)}
              >
                <p className="font-medium">{exercise.name}</p>
                <p className="text-sm text-muted-foreground">
                  {exercise.targetSets} sets × {exercise.targetReps} reps
                </p>
              </button>
            ))}
            {AVAILABLE_EXERCISES.filter(
              (ex) => !exercises.find((e) => e.name === ex.name)
            ).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                All available exercises added
              </p>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {showRestTimer && (
        <RestTimerOverlay
          durationSeconds={90}
          onComplete={() => setShowRestTimer(false)}
          onSkip={() => setShowRestTimer(false)}
        />
      )}
    </div>
  );
}
