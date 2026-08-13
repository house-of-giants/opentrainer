import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  EditExerciseSheet,
  type RoutineExercise,
} from "@/components/workout/edit-exercise-sheet";
import { ImportDayDialog } from "@/components/workout/import-day-dialog";
import { RoutineExercisePicker } from "@/components/workout/routine-exercise-picker";
import { useHaptic } from "@/hooks/use-haptic";
import { newLocalId } from "@/lib/local-id";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/routines/[id]/edit/page.tsx. Reordering swaps
// dnd-kit for react-native-draggable-flatlist: long-press a row's grip to drag
// it within its day. Web's per-day DndContext never supported cross-day
// drags, so mobile matches web's capabilities there.
type RoutineDay = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
};

const DEFAULT_EXERCISE: Omit<RoutineExercise, "id" | "exerciseName"> = {
  kind: "lifting",
  targetSets: 3,
  targetReps: "8-12",
  targetDuration: 20,
  targetHoldSeconds: 30,
  perSide: false,
  restSeconds: 90,
};

function getExerciseSummary(exercise: RoutineExercise) {
  if (exercise.kind === "cardio") {
    return `${exercise.targetDuration ?? 20} min`;
  }
  if (exercise.kind === "mobility") {
    const base = exercise.targetHoldSeconds
      ? `${exercise.targetHoldSeconds}s hold`
      : `${exercise.targetSets}×${exercise.targetReps}`;
    return exercise.perSide ? `${base} /side` : base;
  }
  if (exercise.measurementType === "duration") {
    return `${exercise.targetSets}×${exercise.targetHoldSeconds ?? 30}s`;
  }
  return `${exercise.targetSets}×${exercise.targetReps}`;
}

function DraggableExerciseItem({
  exercise,
  drag,
  isActive,
  onPress,
}: {
  exercise: RoutineExercise;
  drag: () => void;
  isActive: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      className="flex-row items-center gap-3 rounded-lg bg-muted/40 p-3"
      style={isActive ? { opacity: 0.5 } : undefined}
    >
      <Pressable
        onLongPress={drag}
        delayLongPress={150}
        disabled={isActive}
        accessibilityRole="button"
        accessibilityLabel={`Reorder ${exercise.exerciseName}`}
        hitSlop={8}
      >
        <GripVertical size={16} color={colors.mutedForeground} />
      </Pressable>

      <Pressable
        className="min-w-0 flex-1 flex-row items-center justify-between"
        onPress={onPress}
        accessibilityRole="button"
      >
        <Text numberOfLines={1} className="flex-1 font-medium text-foreground">
          {exercise.exerciseName}
        </Text>
        <View className="ml-2 flex-row items-center gap-2">
          <Text className="font-mono text-sm text-muted-foreground">
            {getExerciseSummary(exercise)}
          </Text>
          <ChevronRight size={16} color={colors.mutedForeground} />
        </View>
      </Pressable>
    </View>
  );
}

export default function EditRoutineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { vibrate } = useHaptic();
  const { colors } = useTheme();

  const routineId = params.id as Id<"routines">;
  const routine = useQuery(api.routines.getRoutine, { routineId });
  const updateRoutine = useMutation(api.routines.updateRoutine);
  const exercises = useQuery(api.exercises.getExercises, {});

  const [routineName, setRoutineName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<RoutineDay[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);

  const [editingExercise, setEditingExercise] = useState<{
    dayId: string;
    exercise: RoutineExercise;
  } | null>(null);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [editingDayNameId, setEditingDayNameId] = useState<string | null>(null);
  const [showImportDayDialog, setShowImportDayDialog] = useState(false);

  useEffect(() => {
    if (routine && exercises && !isInitialized) {
      setRoutineName(routine.name);
      setDescription(routine.description || "");
      const parsedDays = routine.days.map((day) => ({
        id: newLocalId(),
        name: day.name,
        exercises: day.exercises.map((ex) => {
          const catalogExercise = exercises.find(
            (catalogEntry) =>
              catalogEntry._id === ex.exerciseId ||
              catalogEntry.name === ex.exerciseName,
          );
          let targetDuration = ex.targetDuration;
          if (ex.kind === "cardio" && !targetDuration && ex.targetReps) {
            const match = ex.targetReps.match(/(\d+)/);
            if (match) {
              targetDuration = parseInt(match[1], 10);
            }
          }
          return {
            id: newLocalId(),
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            kind: ex.kind,
            targetSets: ex.targetSets || 3,
            targetReps: ex.targetReps || "8-12",
            measurementType: ex.measurementType ?? catalogExercise?.measurementType,
            targetDuration: targetDuration || 20,
            targetHoldSeconds: ex.targetHoldSeconds || 30,
            perSide: ex.perSide || false,
            restSeconds: 90,
          };
        }),
      }));
      setDays(parsedDays);
      if (parsedDays.length > 0) {
        setExpandedDayId(parsedDays[0].id);
      }
      setIsInitialized(true);
    }
  }, [routine, exercises, isInitialized]);

  const reorderDays = (data: RoutineDay[]) => {
    vibrate("light");
    setDays(data);
  };

  const reorderExercises = (dayId: string, data: RoutineExercise[]) => {
    vibrate("light");
    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, exercises: data } : d)),
    );
  };

  const addDay = () => {
    vibrate("light");
    const newDay: RoutineDay = {
      id: newLocalId(),
      name: `Day ${days.length + 1}`,
      exercises: [],
    };
    setDays([...days, newDay]);
    setExpandedDayId(newDay.id);
  };

  const removeDay = (dayId: string) => {
    vibrate("medium");
    setDays(days.filter((d) => d.id !== dayId));
    if (expandedDayId === dayId) {
      setExpandedDayId(days.find((d) => d.id !== dayId)?.id ?? null);
    }
  };

  const updateDayName = (dayId: string, name: string) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, name } : d)));
  };

  const openExercisePicker = (dayId: string) => {
    vibrate("light");
    setActiveDayId(dayId);
    setShowExercisePicker(true);
  };

  const addExerciseToDay = (
    exerciseName: string,
    exerciseId?: Id<"exercises">,
    kind: "lifting" | "cardio" | "mobility" = "lifting",
    measurementType?: "reps" | "duration",
  ) => {
    if (!activeDayId) return;
    vibrate("medium");
    const newExercise: RoutineExercise = {
      id: newLocalId(),
      exerciseId,
      exerciseName,
      ...DEFAULT_EXERCISE,
      kind,
      measurementType,
      targetHoldSeconds:
        measurementType === "duration" ? 30 : DEFAULT_EXERCISE.targetHoldSeconds,
    };
    setDays(
      days.map((d) =>
        d.id === activeDayId
          ? { ...d, exercises: [...d.exercises, newExercise] }
          : d,
      ),
    );
    setShowExercisePicker(false);
  };

  const handleExerciseSave = (updated: RoutineExercise) => {
    if (!editingExercise) return;
    setDays(
      days.map((d) =>
        d.id === editingExercise.dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.id === updated.id ? updated : e,
              ),
            }
          : d,
      ),
    );
  };

  const handleExerciseDelete = (exerciseId: string) => {
    if (!editingExercise) return;
    vibrate("medium");
    setDays(
      days.map((d) =>
        d.id === editingExercise.dayId
          ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
          : d,
      ),
    );
  };

  const handleSave = async () => {
    if (!routineName.trim()) {
      toast.error("Please enter a routine name");
      return;
    }
    if (days.length === 0) {
      toast.error("Add at least one day");
      return;
    }
    if (!days.some((d) => d.exercises.length > 0)) {
      toast.error("Add at least one exercise");
      return;
    }

    setIsSaving(true);
    try {
      await updateRoutine({
        routineId,
        name: routineName.trim(),
        description: description.trim() || undefined,
        days: days.map((d) => ({
          name: d.name,
          exercises: d.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            kind: e.kind,
            targetSets:
              e.kind === "lifting" || e.kind === "mobility" ? e.targetSets : 1,
            targetReps:
              (e.kind === "lifting" && e.measurementType !== "duration") ||
              e.kind === "mobility"
                ? e.targetReps
                : undefined,
            measurementType: e.kind === "lifting" ? e.measurementType : undefined,
            targetDuration: e.kind === "cardio" ? e.targetDuration : undefined,
            targetHoldSeconds:
              e.kind === "mobility" || e.measurementType === "duration"
                ? e.targetHoldSeconds
                : undefined,
            perSide: e.kind === "mobility" ? e.perSide : undefined,
          })),
        })),
      });
      vibrate("success");
      toast.success("Routine saved!");
      // Web pushes /routines; popping the stack lands back on the list.
      router.back();
    } catch (error) {
      toast.error("Failed to save routine");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (routine === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="h-14 flex-row items-center gap-4 border-b border-border px-4">
          <Skeleton className="h-8 w-8" testID="edit-skeleton" />
          <Skeleton className="h-6 w-32 flex-1" />
          <Skeleton className="h-8 w-16" />
        </View>
        <View className="gap-4 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
        </View>
      </SafeAreaView>
    );
  }

  if (routine === null) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="mb-2 text-xl font-semibold text-foreground">
            Routine not found
          </Text>
          <Text className="mb-4 text-muted-foreground">
            This routine may have been deleted.
          </Text>
          <Button onPress={() => router.back()}>
            <ArrowLeft size={16} color={colors.primaryForeground} />
            <Text className="text-sm font-medium text-primary-foreground">
              Back to Routines
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="h-14 flex-row items-center justify-between border-b border-border px-2">
        <View className="flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.back()}
            accessibilityLabel="Back to routines"
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </Button>
          <Text className="font-semibold text-foreground">Edit Routine</Text>
        </View>
        <Button size="sm" onPress={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </View>

      <NestableScrollContainer contentContainerStyle={{ paddingBottom: 96 }}>
        <View className="gap-6 p-4">
          <View className="gap-4">
            <View className="gap-2">
              <Label className="text-xs text-muted-foreground">
                Routine Name
              </Label>
              <Input
                value={routineName}
                onChangeText={setRoutineName}
                placeholder="e.g., Push Pull Legs"
                className="h-12 text-lg font-medium"
              />
            </View>
            <View className="gap-2">
              <Label className="text-xs text-muted-foreground">
                Description (optional)
              </Label>
              <Input
                placeholder="What's this routine about?"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                Days
              </Text>
              <View className="flex-row items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setShowImportDayDialog(true)}
                >
                  <Upload size={16} color={colors.foreground} />
                  <Text className="text-sm font-medium text-foreground">
                    Import
                  </Text>
                </Button>
                <Button variant="outline" size="sm" onPress={addDay}>
                  <Plus size={16} color={colors.foreground} />
                  <Text className="text-sm font-medium text-foreground">
                    Add Day
                  </Text>
                </Button>
              </View>
            </View>

            {days.length === 0 ? (
              <Card className="items-center p-8">
                <Text className="mb-4 text-center text-muted-foreground">
                  No days yet. Add a day to start building your routine.
                </Text>
                <Button onPress={addDay}>
                  <Plus size={16} color={colors.primaryForeground} />
                  <Text className="text-sm font-medium text-primary-foreground">
                    Add First Day
                  </Text>
                </Button>
              </Card>
            ) : (
              <View className="gap-3">
                <NestableDraggableFlatList
                  data={days}
                  keyExtractor={(d) => d.id}
                  onDragEnd={({ data }) => reorderDays(data)}
                  ItemSeparatorComponent={() => <View className="h-3" />}
                  renderItem={({ item: day, drag: dragDay, isActive: isDayActive, getIndex }) => {
                  const dayIndex = getIndex() ?? 0;
                  const isExpanded = expandedDayId === day.id;

                  return (
                    <ScaleDecorator>
                    <Card className="overflow-hidden" style={isDayActive ? { opacity: 0.7 } : undefined}>
                      <Pressable
                        className="flex-row items-center gap-2 p-4"
                        onPress={() =>
                          setExpandedDayId(isExpanded ? null : day.id)
                        }
                        accessibilityRole="button"
                      >
                        <Pressable
                          onLongPress={dragDay}
                          delayLongPress={150}
                          disabled={isDayActive}
                          accessibilityRole="button"
                          accessibilityLabel={`Reorder ${day.name}`}
                          hitSlop={8}
                        >
                          <GripVertical size={16} color={colors.mutedForeground} />
                        </Pressable>
                        {editingDayNameId === day.id ? (
                          <View className="min-w-0 flex-1 flex-row items-center gap-2">
                            <TextInput
                              value={day.name}
                              onChangeText={(text) =>
                                updateDayName(day.id, text)
                              }
                              onSubmitEditing={() => setEditingDayNameId(null)}
                              className="h-8 min-w-0 flex-1 rounded border border-border bg-background px-2 font-medium text-foreground"
                              placeholder="Day name"
                              placeholderTextColor={colors.mutedForeground}
                              autoFocus
                              accessibilityLabel="Day name"
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8 shrink-0"
                              onPress={() => setEditingDayNameId(null)}
                              accessibilityLabel="Done renaming day"
                            >
                              <Check size={16} color={colors.foreground} />
                            </Button>
                          </View>
                        ) : (
                          <>
                            <Text
                              numberOfLines={1}
                              className="font-medium text-foreground"
                            >
                              {day.name || "Untitled"}
                            </Text>
                            <Pressable
                              className="shrink-0 rounded p-1.5 active:bg-muted"
                              onPress={() => setEditingDayNameId(day.id)}
                              accessibilityRole="button"
                              accessibilityLabel={`Rename ${day.name || "Untitled"}`}
                              hitSlop={4}
                            >
                              <Pencil
                                size={14}
                                color={colors.mutedForeground}
                              />
                            </Pressable>
                          </>
                        )}
                        <View className="ml-auto shrink-0 flex-row items-center gap-2">
                          <Text className="font-mono text-sm text-muted-foreground">
                            {day.exercises.length}
                          </Text>
                          <ChevronRight
                            size={20}
                            color={colors.mutedForeground}
                            style={{
                              transform: [
                                { rotate: isExpanded ? "90deg" : "0deg" },
                              ],
                            }}
                          />
                        </View>
                      </Pressable>

                      {isExpanded && (
                        <View className="gap-3 border-t border-border bg-muted/20 px-4 py-3">
                          {day.exercises.length > 0 ? (
                            <NestableDraggableFlatList
                              testID={`day-exercise-list-${dayIndex}`}
                              data={day.exercises}
                              keyExtractor={(e) => e.id}
                              onDragEnd={({ data }) =>
                                reorderExercises(day.id, data)
                              }
                              ItemSeparatorComponent={() => (
                                <View className="h-2" />
                              )}
                              renderItem={({ item, drag, isActive }) => (
                                <ScaleDecorator>
                                  <DraggableExerciseItem
                                    exercise={item}
                                    drag={drag}
                                    isActive={isActive}
                                    onPress={() =>
                                      setEditingExercise({
                                        dayId: day.id,
                                        exercise: item,
                                      })
                                    }
                                  />
                                </ScaleDecorator>
                              )}
                            />
                          ) : (
                            <Text className="py-4 text-center text-sm text-muted-foreground">
                              No exercises yet
                            </Text>
                          )}

                          <View className="flex-row gap-2 pt-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onPress={() => openExercisePicker(day.id)}
                            >
                              <Plus size={16} color={colors.foreground} />
                              <Text className="text-sm font-medium text-foreground">
                                Add Exercise
                              </Text>
                            </Button>
                            {days.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="active:bg-destructive/10"
                                onPress={() => removeDay(day.id)}
                                accessibilityLabel={`Delete ${day.name || "Untitled"}`}
                              >
                                <Trash2 size={16} color={colors.destructive} />
                              </Button>
                            )}
                          </View>
                        </View>
                      )}
                    </Card>
                    </ScaleDecorator>
                  );
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </NestableScrollContainer>

      <RoutineExercisePicker
        open={showExercisePicker}
        onOpenChange={setShowExercisePicker}
        onSelectExercise={({ name, exerciseId, category, measurementType }) =>
          addExerciseToDay(
            name,
            exerciseId,
            category === "cardio"
              ? "cardio"
              : category === "mobility"
                ? "mobility"
                : "lifting",
            measurementType,
          )
        }
      />

      <EditExerciseSheet
        exercise={editingExercise?.exercise ?? null}
        onOpenChange={(open) => !open && setEditingExercise(null)}
        onSave={handleExerciseSave}
        onDelete={handleExerciseDelete}
      />

      <ImportDayDialog
        routineId={routineId}
        open={showImportDayDialog}
        onOpenChange={setShowImportDayDialog}
        onSuccess={() => setIsInitialized(false)}
      />
    </SafeAreaView>
  );
}
