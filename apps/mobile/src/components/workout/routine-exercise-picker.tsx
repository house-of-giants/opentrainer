import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";
import { Plus, Search, X } from "lucide-react-native";
import { normalizeExerciseName } from "@opentrainer/lib/exercise-names";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/theme/theme-provider";

// Port of the inline "Add Exercise" picker that apps/web/src/app/routines/new
// and apps/web/src/app/routines/[id]/edit both embed: getExercises({}) with
// client-side muscle-group + search filtering, a seed-library CTA, and a
// custom-exercise flow that creates the exercise (createExercise) after
// picking muscle groups in a dialog. This is intentionally NOT the workout
// AddExerciseSheet, which uses server-side category/search filtering and never
// creates exercise documents.
export type PickedExerciseCategory = "lifting" | "cardio" | "mobility" | "other";

interface RoutineExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectExercise: (selection: {
    name: string;
    exerciseId?: Id<"exercises">;
    category: PickedExerciseCategory;
    measurementType?: "reps" | "duration";
  }) => void;
}

export function RoutineExercisePicker({
  open,
  onOpenChange,
  onSelectExercise,
}: RoutineExercisePickerProps) {
  const { colors } = useTheme();

  const createExercise = useMutation(api.exercises.createExercise);
  const seedExercises = useMutation(api.exercises.seedSystemExercises);
  const exercises = useQuery(api.exercises.getExercises, {});
  const muscleGroups = useQuery(api.exercises.getMuscleGroups, {});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExerciseMuscles, setCustomExerciseMuscles] = useState<string[]>([]);
  const [showMuscleGroupDialog, setShowMuscleGroupDialog] = useState(false);

  // Web resets search/filter every time the picker opens
  // (openExercisePicker). The sheet's dismiss path always funnels through
  // onOpenChange(false), so clearing on close leaves the next open pristine.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearchQuery("");
      setSelectedMuscle(null);
    }
    onOpenChange(next);
  };

  const handleSeedExercises = async () => {
    try {
      const result = await seedExercises({});
      toast.success(`Added ${result.added} exercises`);
    } catch {
      toast.error("Failed to seed exercises");
    }
  };

  const toggleCustomMuscleGroup = (muscle: string) => {
    setCustomExerciseMuscles((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle],
    );
  };

  const handleAddCustomExercise = async () => {
    if (customExerciseMuscles.length === 0) {
      toast.error("Please select at least one muscle group");
      return;
    }

    try {
      const exerciseId = await createExercise({
        name: customExerciseName,
        category: "lifting",
        muscleGroups: customExerciseMuscles,
      });

      onSelectExercise({
        name: customExerciseName,
        exerciseId,
        category: "lifting",
      });
      setShowMuscleGroupDialog(false);
      setCustomExerciseName("");
      setCustomExerciseMuscles([]);
      setSearchQuery("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create exercise");
      console.error(error);
    }
  };

  const filteredExercises = exercises?.filter((e) => {
    if (selectedMuscle && !e.muscleGroups?.includes(selectedMuscle)) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        e.name.toLowerCase().includes(query) ||
        e.aliases?.some((a) => a.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const normalizedSearchQuery = normalizeExerciseName(searchQuery);
  const hasExactExerciseMatch = exercises?.some(
    (exercise) =>
      normalizeExerciseName(exercise.name) === normalizedSearchQuery ||
      exercise.aliases?.some(
        (alias) => normalizeExerciseName(alias) === normalizedSearchQuery,
      ),
  );

  const needsSeeding = exercises && exercises.length === 0;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={handleOpenChange}
        snapPoints={["85%"]}
        scrollable
      >
        <SheetHeader>
          <SheetTitle>Add Exercise</SheetTitle>
          <SheetDescription>
            Select an exercise to add to your routine
          </SheetDescription>
        </SheetHeader>

        <View className="gap-4 pb-8 pt-2">
          <View className="relative justify-center">
            <View className="absolute left-3 z-10">
              <Search size={16} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="h-12 pl-10"
            />
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setSelectedMuscle(null)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedMuscle === null }}
            >
              <Badge variant={selectedMuscle === null ? "default" : "outline"}>
                All
              </Badge>
            </Pressable>
            {!muscleGroups ? (
              <Text className="text-sm text-muted-foreground">
                Loading muscle groups...
              </Text>
            ) : (
              muscleGroups.map((muscle) => {
                const selected = selectedMuscle === muscle;
                return (
                  <Pressable
                    key={muscle}
                    onPress={() => setSelectedMuscle(selected ? null : muscle)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Badge
                      variant={selected ? "default" : "outline"}
                      textClassName="capitalize"
                    >
                      {muscle}
                    </Badge>
                  </Pressable>
                );
              })
            )}
          </View>

          {needsSeeding && (
            <Card className="items-center p-4">
              <Text className="mb-3 text-center text-sm text-muted-foreground">
                No exercises found. Seed the exercise library?
              </Text>
              <Button size="sm" onPress={handleSeedExercises}>
                Load Exercises
              </Button>
            </Card>
          )}

          <View className="gap-1">
            {searchQuery.trim() && !hasExactExerciseMatch && (
              <Pressable
                className="mb-2 w-full flex-row items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3 active:bg-primary/10"
                onPress={() => {
                  setCustomExerciseName(searchQuery.trim());
                  setShowMuscleGroupDialog(true);
                }}
                accessibilityRole="button"
              >
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-medium text-primary">
                    Add &quot;{searchQuery}&quot; as custom exercise
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Create a new exercise
                  </Text>
                </View>
                <Plus size={20} color={colors.primary} />
              </Pressable>
            )}
            {filteredExercises?.map((exercise) => (
              <Pressable
                key={exercise._id}
                className="w-full flex-row items-center justify-between rounded-lg p-3 active:bg-muted/70"
                onPress={() =>
                  onSelectExercise({
                    name: exercise.name,
                    exerciseId: exercise._id,
                    category: exercise.category,
                    measurementType: exercise.measurementType,
                  })
                }
                accessibilityRole="button"
              >
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-medium text-foreground">
                    {exercise.name}
                  </Text>
                  {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                    <Text className="text-xs capitalize text-muted-foreground">
                      {exercise.muscleGroups.slice(0, 3).join(", ")}
                    </Text>
                  )}
                </View>
                <Plus size={20} color={colors.mutedForeground} />
              </Pressable>
            ))}
            {filteredExercises?.length === 0 &&
              !needsSeeding &&
              !searchQuery.trim() && (
                <View className="items-center py-8">
                  <Text className="text-muted-foreground">
                    No exercises found
                  </Text>
                  <Text className="mt-2 text-xs text-muted-foreground">
                    Try adjusting your filters or search for a different
                    exercise
                  </Text>
                </View>
              )}
          </View>
        </View>
      </Sheet>

      <Dialog
        open={showMuscleGroupDialog}
        onOpenChange={setShowMuscleGroupDialog}
      >
        <DialogHeader>
          <DialogTitle>Select Muscle Groups</DialogTitle>
          <DialogDescription>
            Choose which muscles &quot;{customExerciseName}&quot; targets
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4 py-2">
          <View className="flex-row flex-wrap gap-2">
            {!muscleGroups ? (
              <Text className="text-sm text-muted-foreground">
                Loading muscle groups...
              </Text>
            ) : (
              muscleGroups.map((muscle) => {
                const selected = customExerciseMuscles.includes(muscle);
                return (
                  <Pressable
                    key={muscle}
                    onPress={() => toggleCustomMuscleGroup(muscle)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Badge
                      variant={selected ? "default" : "outline"}
                      className="h-10 px-4"
                    >
                      <Text
                        className={
                          selected
                            ? "text-sm font-medium capitalize text-primary-foreground"
                            : "text-sm font-medium capitalize text-foreground"
                        }
                      >
                        {muscle}
                      </Text>
                      {selected && (
                        <X size={14} color={colors.primaryForeground} />
                      )}
                    </Badge>
                  </Pressable>
                );
              })
            )}
          </View>

          {customExerciseMuscles.length === 0 && (
            <Text className="text-sm text-muted-foreground">
              Select at least one muscle group
            </Text>
          )}
        </View>

        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => {
              setShowMuscleGroupDialog(false);
              setCustomExerciseName("");
              setCustomExerciseMuscles([]);
            }}
          >
            Cancel
          </Button>
          <Button
            onPress={handleAddCustomExercise}
            disabled={customExerciseMuscles.length === 0}
          >
            Add Exercise
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
