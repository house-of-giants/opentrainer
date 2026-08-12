import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { RoutineExercisePicker } from "@/components/workout/routine-exercise-picker";
import { useHaptic } from "@/hooks/use-haptic";
import { newLocalId } from "@/lib/local-id";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/routines/new/page.tsx.
//
// Differences from web, on purpose:
// - dnd-kit (pointer/touch/keyboard sensors) is replaced by
//   react-native-draggable-flatlist: long-press the grip to drag an exercise
//   within its day. Web's per-day DndContext never allowed cross-day drags, so
//   parity holds there.
type RoutineExercise = {
  id: string;
  exerciseId?: Id<"exercises">;
  exerciseName: string;
  kind: "lifting" | "cardio";
  targetSets: number;
  targetReps: string;
  measurementType?: "reps" | "duration";
  targetHoldSeconds?: number;
  restSeconds: number;
};

type RoutineDay = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  isExpanded: boolean;
};

const DEFAULT_EXERCISE: Omit<
  RoutineExercise,
  "id" | "exerciseName" | "exerciseId"
> = {
  kind: "lifting",
  targetSets: 3,
  targetReps: "8-12",
  restSeconds: 90,
};

function DraggableExerciseItem({
  exercise,
  dayId,
  drag,
  isActive,
  onRemove,
  onUpdate,
}: {
  exercise: RoutineExercise;
  dayId: string;
  drag: () => void;
  isActive: boolean;
  onRemove: (dayId: string, exerciseId: string) => void;
  onUpdate: (
    dayId: string,
    exerciseId: string,
    updates: Partial<RoutineExercise>,
  ) => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      className="gap-2 rounded-lg bg-muted/50 p-3"
      style={isActive ? { opacity: 0.5 } : undefined}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
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
          <Text
            numberOfLines={1}
            className="flex-1 text-sm font-medium text-foreground"
          >
            {exercise.exerciseName}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6"
          onPress={() => onRemove(dayId, exercise.id)}
          accessibilityLabel={`Remove ${exercise.exerciseName}`}
        >
          <X size={12} color={colors.foreground} />
        </Button>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Label className="text-xs text-muted-foreground">Sets</Label>
          <Input
            keyboardType="number-pad"
            value={exercise.targetSets ? String(exercise.targetSets) : ""}
            onChangeText={(text) => {
              const parsed = parseInt(text, 10);
              onUpdate(dayId, exercise.id, {
                targetSets: isNaN(parsed) ? 0 : parsed,
              });
            }}
            onBlur={() => {
              if (!exercise.targetSets || exercise.targetSets < 1) {
                onUpdate(dayId, exercise.id, { targetSets: 1 });
              }
            }}
            className="h-8 py-0 text-center"
          />
        </View>
        <View className="flex-1">
          <Label className="text-xs text-muted-foreground">
            {exercise.measurementType === "duration" ? "Seconds" : "Reps"}
          </Label>
          {exercise.measurementType === "duration" ? (
            <Input
              keyboardType="number-pad"
              value={String(exercise.targetHoldSeconds ?? 30)}
              onChangeText={(text) => {
                const parsed = Number.parseInt(text, 10);
                onUpdate(dayId, exercise.id, {
                  targetHoldSeconds: Number.isNaN(parsed)
                    ? 1
                    : Math.max(1, parsed),
                });
              }}
              className="h-8 py-0 text-center"
            />
          ) : (
            <Input
              value={exercise.targetReps}
              onChangeText={(text) =>
                onUpdate(dayId, exercise.id, { targetReps: text })
              }
              placeholder="8-12"
              className="h-8 py-0 text-center"
            />
          )}
        </View>
        <View className="flex-1">
          <Label className="text-xs text-muted-foreground">Rest (s)</Label>
          <Input
            keyboardType="number-pad"
            value={exercise.restSeconds < 0 ? "" : String(exercise.restSeconds)}
            onChangeText={(text) => {
              const parsed = parseInt(text, 10);
              onUpdate(dayId, exercise.id, {
                restSeconds: isNaN(parsed) ? -1 : parsed,
              });
            }}
            onBlur={() => {
              if (exercise.restSeconds < 0) {
                onUpdate(dayId, exercise.id, { restSeconds: 60 });
              }
            }}
            className="h-8 py-0 text-center"
          />
        </View>
      </View>
    </View>
  );
}

export default function NewRoutineScreen() {
  const router = useRouter();
  const { vibrate } = useHaptic();
  const { colors } = useTheme();
  const createRoutine = useMutation(api.routines.createRoutine);

  const [routineName, setRoutineName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<RoutineDay[]>([
    { id: newLocalId(), name: "Day 1", exercises: [], isExpanded: true },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);

  // Replaces web's per-day dnd-kit DndContext/arrayMove: DraggableFlatList
  // hands back the already-reordered array.
  const reorderExercises = (dayId: string, data: RoutineExercise[]) => {
    vibrate("light");
    setDays((prevDays) =>
      prevDays.map((d) => (d.id === dayId ? { ...d, exercises: data } : d)),
    );
  };

  const addDay = () => {
    vibrate("light");
    const newDay: RoutineDay = {
      id: newLocalId(),
      name: `Day ${days.length + 1}`,
      exercises: [],
      isExpanded: true,
    };
    setDays([...days.map((d) => ({ ...d, isExpanded: false })), newDay]);
  };

  const removeDay = (dayId: string) => {
    vibrate("medium");
    setDays(days.filter((d) => d.id !== dayId));
  };

  const updateDayName = (dayId: string, name: string) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, name } : d)));
  };

  const toggleDayExpanded = (dayId: string) => {
    vibrate("light");
    setDays(
      days.map((d) => (d.id === dayId ? { ...d, isExpanded: !d.isExpanded } : d)),
    );
  };

  const openExercisePicker = (dayId: string) => {
    vibrate("light");
    setActiveDayId(dayId);
    setShowExercisePicker(true);
  };

  const addExerciseToDay = (
    exerciseName: string,
    exerciseId?: Id<"exercises">,
    kind: "lifting" | "cardio" = "lifting",
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
      targetHoldSeconds: measurementType === "duration" ? 30 : undefined,
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

  const removeExercise = (dayId: string, exerciseId: string) => {
    vibrate("medium");
    setDays(
      days.map((d) =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
          : d,
      ),
    );
  };

  const updateExercise = (
    dayId: string,
    exerciseId: string,
    updates: Partial<RoutineExercise>,
  ) => {
    setDays(
      days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.id === exerciseId ? { ...e, ...updates } : e,
              ),
            }
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
      toast.error("Add at least one day to your routine");
      return;
    }

    const hasExercises = days.some((d) => d.exercises.length > 0);
    if (!hasExercises) {
      toast.error("Add at least one exercise to your routine");
      return;
    }

    setIsSaving(true);
    try {
      await createRoutine({
        name: routineName.trim(),
        description: description.trim() || undefined,
        source: "manual",
        days: days.map((d) => ({
          name: d.name,
          exercises: d.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            kind: e.kind,
            targetSets: e.targetSets || 1,
            targetReps:
              e.measurementType === "duration" ? undefined : e.targetReps,
            measurementType: e.measurementType,
            targetHoldSeconds:
              e.measurementType === "duration" ? e.targetHoldSeconds : undefined,
          })),
        })),
      });

      vibrate("success");
      toast.success("Routine created!");
      // Web pushes /routines; the mobile screen is stacked on top of the
      // routines tab, so popping back lands on the same list.
      router.back();
    } catch (error) {
      toast.error("Failed to create routine");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="h-14 flex-row items-center gap-2 border-b border-border px-2">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => router.back()}
          accessibilityLabel="Back to routines"
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </Button>
        <Text className="flex-1 text-lg font-semibold text-foreground">
          Create Routine
        </Text>
        <Button size="sm" onPress={handleSave} disabled={isSaving}>
          <Save size={16} color={colors.primaryForeground} />
          <Text className="text-sm font-medium text-primary-foreground">
            {isSaving ? "Saving..." : "Save"}
          </Text>
        </Button>
      </View>

      <NestableScrollContainer contentContainerStyle={{ paddingBottom: 96 }}>
        <View className="gap-6 p-4">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(app)/routines/new/ai")}
          >
            <Card className="border-violet-500/20 bg-violet-500/10 p-4 active:border-violet-500/40">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
                  <Sparkles size={20} color="#8b5cf6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    Generate with AI
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Create a personalized routine based on your goals and equipment
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>

          <View className="flex-row items-center gap-2">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-xs uppercase text-muted-foreground">
              or build manually
            </Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <View className="gap-4">
            <View className="gap-2">
              <Label>Routine Name</Label>
              <Input
                placeholder="e.g., Push Pull Legs"
                value={routineName}
                onChangeText={setRoutineName}
                className="h-12"
              />
            </View>
            <View className="gap-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="A 3-day split focusing on..."
                value={description}
                onChangeText={setDescription}
                className="h-12"
              />
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                Days
              </Text>
              <Button variant="outline" size="sm" onPress={addDay}>
                <Plus size={16} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">
                  Add Day
                </Text>
              </Button>
            </View>

            {days.map((day, dayIndex) => (
              <Card key={day.id} className="overflow-hidden">
                <Pressable
                  className="flex-row items-center gap-2 p-3"
                  onPress={() => toggleDayExpanded(day.id)}
                  accessibilityRole="button"
                >
                  <GripVertical size={16} color={colors.mutedForeground} />
                  <Input
                    value={day.name}
                    onChangeText={(text) => updateDayName(day.id, text)}
                    className="h-8 flex-1 py-0 font-medium"
                  />
                  <Text className="font-mono text-xs text-muted-foreground">
                    {day.exercises.length} exercise
                    {day.exercises.length !== 1 ? "s" : ""}
                  </Text>
                  {days.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-8 w-8"
                      onPress={() => removeDay(day.id)}
                      accessibilityLabel={`Remove ${day.name}`}
                    >
                      <Trash2 size={16} color={colors.mutedForeground} />
                    </Button>
                  )}
                  {day.isExpanded ? (
                    <ChevronUp size={16} color={colors.mutedForeground} />
                  ) : (
                    <ChevronDown size={16} color={colors.mutedForeground} />
                  )}
                </Pressable>

                {day.isExpanded && (
                  <View className="gap-3 border-t border-border p-3">
                    {day.exercises.length === 0 ? (
                      <Text className="py-4 text-center text-sm text-muted-foreground">
                        No exercises added yet
                      </Text>
                    ) : (
                      <NestableDraggableFlatList
                        testID={`day-exercise-list-${dayIndex}`}
                        data={day.exercises}
                        keyExtractor={(e) => e.id}
                        onDragEnd={({ data }) => reorderExercises(day.id, data)}
                        ItemSeparatorComponent={() => <View className="h-3" />}
                        renderItem={({ item, drag, isActive }) => (
                          <ScaleDecorator>
                            <DraggableExerciseItem
                              exercise={item}
                              dayId={day.id}
                              drag={drag}
                              isActive={isActive}
                              onRemove={removeExercise}
                              onUpdate={updateExercise}
                            />
                          </ScaleDecorator>
                        )}
                      />
                    )}

                    <Button
                      variant="outline"
                      className="w-full"
                      onPress={() => openExercisePicker(day.id)}
                    >
                      <Plus size={16} color={colors.foreground} />
                      <Text className="text-sm font-medium text-foreground">
                        Add Exercise
                      </Text>
                    </Button>
                  </View>
                )}
              </Card>
            ))}
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
            category === "cardio" ? "cardio" : "lifting",
            measurementType,
          )
        }
      />
    </SafeAreaView>
  );
}
