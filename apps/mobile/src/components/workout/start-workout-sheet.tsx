import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Doc, Id } from "@opentrainer/backend";
import {
  AlertTriangle,
  ChevronRight,
  Dumbbell,
  Play,
  X,
  Zap,
} from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useHaptic } from "@/hooks/use-haptic";
import { analytics } from "@/lib/analytics";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/workout/start-workout-sheet.tsx.
// The web version renders a vaul Drawer; mobile uses the Sheet primitive
// (@gorhom/bottom-sheet) with the same open/onOpenChange contract.
interface StartWorkoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeWorkout?: Doc<"workouts"> | null;
}

type Routine = {
  _id: Id<"routines">;
  name: string;
  days: {
    name: string;
    exercises: { exerciseName: string }[];
  }[];
};

export function StartWorkoutSheet({
  open,
  onOpenChange,
  activeWorkout,
}: StartWorkoutSheetProps) {
  const router = useRouter();
  const { vibrate } = useHaptic();
  const { colors } = useTheme();
  const routines = useQuery(api.routines.getRoutines, { activeOnly: true });
  const createWorkout = useMutation(api.workouts.createWorkout);
  const cancelWorkout = useMutation(api.workouts.cancelWorkout);

  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleActiveWorkoutError = (error: unknown) => {
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
  };

  const handleContinueWorkout = () => {
    vibrate("medium");
    onOpenChange(false);
    router.push("/(app)/workout/active");
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
      analytics.capture("workout_started", { source: "empty" });
      onOpenChange(false);
      router.push("/(app)/workout/active");
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
      analytics.capture("workout_started", {
        source: "routine",
        routine_name: routine.name,
        day_name: day.name,
        day_index: dayIndex,
        exercise_count: day.exercises.length,
      });
      onOpenChange(false);
      router.push("/(app)/workout/active");
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
      minute: "2-digit",
    });
  };

  if (activeWorkout) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetHeader>
          <View className="flex-row items-center gap-2">
            <AlertTriangle size={20} color="#f59e0b" />
            <SheetTitle>Workout In Progress</SheetTitle>
          </View>
          <SheetDescription>
            You already have an active workout. What would you like to do?
          </SheetDescription>
        </SheetHeader>

        <View className="gap-4 py-4">
          <Card className="border-primary/50 bg-primary/5 p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Dumbbell size={20} color={colors.primary} />
              </View>
              <View>
                <Text className="font-medium text-foreground">
                  {activeWorkout.title ?? "Workout"}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Started {formatWorkoutTime(activeWorkout.startedAt)}
                </Text>
              </View>
            </View>
          </Card>

          <View className="gap-2">
            <Button size="lg" className="h-14 w-full" onPress={handleContinueWorkout}>
              <Play size={20} color={colors.primaryForeground} />
              <Text className="text-lg font-medium text-primary-foreground">
                Continue Workout
              </Text>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-14 w-full"
              onPress={handleCancelCurrentWorkout}
              disabled={isCancelling || isStarting}
            >
              <X size={20} color={colors.destructive} />
              <Text className="text-lg font-medium text-destructive">
                {isCancelling ? "Cancelling..." : "Cancel & Start New"}
              </Text>
            </Button>
          </View>

          <Text className="text-center text-xs text-muted-foreground">
            Cancelling will discard all progress from your current workout.
          </Text>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={["85%"]}
      scrollable
    >
      <SheetHeader>
        <SheetTitle>Start Workout</SheetTitle>
        <SheetDescription>
          Start from scratch or use a saved routine
        </SheetDescription>
      </SheetHeader>

      <View className="gap-6 py-4">
        <Button
          size="lg"
          className="h-16 w-full"
          onPress={handleStartEmpty}
          disabled={isStarting}
        >
          <Zap size={20} color={colors.primaryForeground} />
          <Text className="text-lg font-medium text-primary-foreground">
            Empty Workout
          </Text>
        </Button>

        {routines === undefined ? (
          <View className="gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </View>
        ) : routines.length > 0 ? (
          <View>
            <Text className="mb-3 font-mono text-sm uppercase tracking-wider text-muted-foreground">
              From Routine
            </Text>
            <View className="gap-2">
              {(routines as Routine[]).map((routine) => (
                <Card key={routine._id} className="overflow-hidden">
                  <Pressable
                    accessibilityRole="button"
                    className="w-full flex-row items-center justify-between p-4 active:bg-muted/50"
                    onPress={() => toggleRoutine(routine._id)}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Dumbbell size={20} color={colors.primary} />
                      </View>
                      <View>
                        <Text className="font-medium text-foreground">
                          {routine.name}
                        </Text>
                        <Text className="font-mono text-sm text-muted-foreground">
                          {routine.days.length} day
                          {routine.days.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight
                      size={20}
                      color={colors.mutedForeground}
                      // RN cannot rotate via className; the expanded state
                      // rotates the chevron through a transform style instead.
                      style={{
                        transform: [
                          {
                            rotate:
                              expandedRoutine === routine._id ? "90deg" : "0deg",
                          },
                        ],
                      }}
                    />
                  </Pressable>

                  {expandedRoutine === routine._id && (
                    <View className="border-t border-border bg-muted/30">
                      {routine.days.map((day, idx) => (
                        <Pressable
                          key={idx}
                          accessibilityRole="button"
                          className="w-full flex-row items-center justify-between border-b border-border p-4 active:bg-muted/50 disabled:opacity-50"
                          onPress={() => handleStartFromRoutine(routine, idx)}
                          disabled={isStarting}
                        >
                          <View className="min-w-0 flex-1">
                            <Text className="font-medium text-foreground">
                              {day.name}
                            </Text>
                            <Text
                              numberOfLines={1}
                              className="text-xs text-muted-foreground"
                            >
                              {day.exercises
                                .slice(0, 3)
                                .map((e) => e.exerciseName)
                                .join(", ")}
                              {day.exercises.length > 3
                                ? ` +${day.exercises.length - 3} more`
                                : ""}
                            </Text>
                          </View>
                          <Play size={16} color={colors.primary} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </Card>
              ))}
            </View>
          </View>
        ) : (
          <Card className="items-center p-6">
            <Dumbbell size={32} color={colors.mutedForeground} />
            <Text className="mb-1 mt-3 font-medium text-foreground">
              No routines yet
            </Text>
            <Text className="mb-4 text-center text-sm text-muted-foreground">
              Create a routine to quickly start similar workouts
            </Text>
            <Button
              variant="outline"
              onPress={() => {
                onOpenChange(false);
                router.push("/(app)/routines/new");
              }}
            >
              Create Routine
            </Button>
          </Card>
        )}
      </View>
    </Sheet>
  );
}
