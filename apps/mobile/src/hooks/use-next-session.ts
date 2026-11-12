import { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Doc, Id } from "@opentrainer/backend";
import { getNextRoutineDay } from "@opentrainer/lib/next-session";
import { calculateProgressionSuggestion } from "@opentrainer/lib/progression";
import type { WeightUnit } from "@opentrainer/lib/units";

import { toast } from "@/components/ui/toast";
import { useHaptic } from "@/hooks/use-haptic";
import { analytics } from "@/lib/analytics";

export type NextRoutineDay = {
  routine: Doc<"routines">;
  dayIndex: number;
};

/**
 * The next day of the routine the lifter is following, derived from their
 * completed workouts. Undefined while loading; null with no routine.
 */
export function useNextRoutineDay(): NextRoutineDay | null | undefined {
  const routines = useQuery(api.routines.getRoutines, { activeOnly: true });
  // The default page (50 completed workouts) reaches the last routine session
  // for anyone training on a routine.
  const history = useQuery(api.workouts.getWorkoutHistory, {});

  return useMemo(() => {
    if (routines === undefined || history === undefined) return undefined;
    return getNextRoutineDay(routines, history);
  }, [routines, history]);
}

/**
 * Last session and the progression target for one exercise, with the lifter's
 * saved weight step. Undefined while loading; null with no history.
 */
export function useNextLiftTarget(
  exerciseName: string | undefined,
  targetReps: string | undefined,
  unit: WeightUnit,
) {
  const args = exerciseName ? { exerciseName } : "skip";
  const history = useQuery(api.entries.getExerciseHistory, args);
  const weightStep = useQuery(api.exercises.getWeightStep, args);

  return useMemo(() => {
    if (history === undefined || weightStep === undefined) return undefined;
    return calculateProgressionSuggestion(history, targetReps, unit, weightStep);
  }, [history, weightStep, targetReps, unit]);
}

export function showStartWorkoutError(error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes("already have an active workout")) {
    // Web pairs this toast with a "Go to workout" action button; the RN toast
    // wrapper has no action slot, so the sheet closes and re-renders in its
    // active-workout branch (Continue / Cancel & Start New) instead.
    toast.error(
      "Active workout exists",
      "Complete or cancel your current workout first.",
    );
  } else {
    toast.error("Failed to start workout");
  }
  console.error(error);
}

type StartRoutineDayOptions = {
  entryPoint: "home" | "start_sheet";
  isNextDay: boolean;
};

/** Starts a workout from one routine day and opens it. Resolves true on success. */
export function useStartRoutineDay() {
  const router = useRouter();
  const { vibrate } = useHaptic();
  const createWorkout = useMutation(api.workouts.createWorkout);
  const [isStarting, setIsStarting] = useState(false);

  const start = useCallback(
    async (
      routine: {
        _id: Id<"routines">;
        name: string;
        days: { name: string; exercises: readonly unknown[] }[];
      },
      dayIndex: number,
      { entryPoint, isNextDay }: StartRoutineDayOptions,
    ) => {
      setIsStarting(true);
      try {
        vibrate("medium");
        const day = routine.days[dayIndex];
        await createWorkout({
          title: day.name,
          routineId: routine._id,
          routineDayIndex: dayIndex,
        });
        analytics.capture("workout_started", {
          source: "routine",
          routine_name: routine.name,
          day_name: day.name,
          day_index: dayIndex,
          exercise_count: day.exercises.length,
          entry_point: entryPoint,
          is_next_day: isNextDay,
        });
        router.push("/(app)/workout/active");
        return true;
      } catch (error) {
        showStartWorkoutError(error);
        return false;
      } finally {
        setIsStarting(false);
      }
    },
    [createWorkout, router, vibrate],
  );

  return { start, isStarting };
}
