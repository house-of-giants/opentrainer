import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";
import { Pencil, Play, Trash2 } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { useHaptic } from "@/hooks/use-haptic";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/workout/routine-detail-sheet.tsx.
// The web version is a vaul Drawer; mobile uses the Sheet primitive. The
// footer buttons live at the end of the scrollable content since the Sheet
// primitive has no pinned footer slot.
export type RoutineForDetail = {
  _id: Id<"routines">;
  name: string;
  description?: string;
  days: {
    name: string;
    exercises: {
      exerciseName: string;
      targetSets?: number;
      targetReps?: string;
      measurementType?: "reps" | "duration";
      targetHoldSeconds?: number;
    }[];
  }[];
};

interface RoutineDetailSheetProps {
  routine: RoutineForDetail | null;
  onOpenChange: (open: boolean) => void;
}

export function RoutineDetailSheet({
  routine,
  onOpenChange,
}: RoutineDetailSheetProps) {
  const router = useRouter();
  const { vibrate } = useHaptic();
  const { colors } = useTheme();
  const createWorkout = useMutation(api.workouts.createWorkout);
  const deleteRoutine = useMutation(api.routines.deleteRoutine);

  const [isStarting, setIsStarting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      router.push("/(app)/workout/active");
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
    router.push(`/(app)/routines/${routine._id}/edit`);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!routine) return;

    setIsDeleting(true);
    setShowDeleteConfirm(false);
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
    <>
      <Sheet
        open={!!routine}
        onOpenChange={onOpenChange}
        snapPoints={["85%"]}
        scrollable
      >
        {routine && (
          <>
            <SheetHeader>
              <SheetTitle>{routine.name}</SheetTitle>
              {routine.description && (
                <SheetDescription>{routine.description}</SheetDescription>
              )}
            </SheetHeader>

            <View className="gap-4 py-2">
              <Text className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                Select a day to start
              </Text>

              {routine.days.map((day, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <View className="p-4">
                    <View className="mb-3 flex-row items-center justify-between">
                      <View>
                        <Text className="font-medium text-foreground">
                          {day.name}
                        </Text>
                        <Text className="font-mono text-sm text-muted-foreground">
                          {day.exercises.length} exercise
                          {day.exercises.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <Button
                        size="sm"
                        onPress={() => handleStartWorkout(idx)}
                        disabled={isStarting}
                      >
                        <Play size={16} color={colors.primaryForeground} />
                        <Text className="text-sm font-medium text-primary-foreground">
                          Start
                        </Text>
                      </Button>
                    </View>

                    <View className="gap-1.5 border-t border-border pt-3">
                      {day.exercises.slice(0, 4).map((ex, exIdx) => (
                        <View
                          key={exIdx}
                          className="flex-row items-center justify-between"
                        >
                          <Text
                            numberOfLines={1}
                            className="flex-1 text-sm text-muted-foreground"
                          >
                            {ex.exerciseName}
                          </Text>
                          {ex.targetSets ? (
                            <Text className="ml-2 font-mono text-xs text-muted-foreground">
                              {ex.targetSets}×
                              {ex.measurementType === "duration"
                                ? `${ex.targetHoldSeconds ?? 30}s`
                                : ex.targetReps || "?"}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                      {day.exercises.length > 4 && (
                        <Text className="text-xs text-muted-foreground">
                          +{day.exercises.length - 4} more exercises
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              ))}

              <View className="flex-row gap-2 pt-2">
                <Button variant="outline" className="flex-1" onPress={handleEdit}>
                  <Pencil size={16} color={colors.foreground} />
                  <Text className="text-sm font-medium text-foreground">Edit</Text>
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onPress={handleDeleteClick}
                  disabled={isDeleting}
                >
                  <Trash2 size={16} color="#ffffff" />
                  <Text className="text-sm font-medium text-white">
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Text>
                </Button>
              </View>
            </View>
          </>
        )}
      </Sheet>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogHeader>
          <DialogTitle>Delete Routine?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{routine?.name}&quot;? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onPress={handleDeleteConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
