import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import { Dumbbell, Heart, Plus, Search, X } from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHaptic } from "@/hooks/use-haptic";
import { useTheme } from "@/theme/theme-provider";

export interface ExerciseSelection {
  name: string;
  category: "lifting" | "cardio" | "mobility" | "other";
  primaryMetric?: "duration" | "distance";
  measurementType?: "reps" | "duration";
  equipment?: string[];
  muscleGroups?: string[];
}

interface AddExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectExercise: (exercise: ExerciseSelection) => void;
}

export function AddExerciseSheet({
  open,
  onOpenChange,
  onSelectExercise,
}: AddExerciseSheetProps) {
  const [customExercise, setCustomExercise] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"lifting" | "cardio">("lifting");
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [showMuscleGroupPicker, setShowMuscleGroupPicker] = useState(false);
  const [customMeasurementType, setCustomMeasurementType] = useState<
    "reps" | "duration"
  >("reps");
  const { vibrate } = useHaptic();
  const { colors } = useTheme();

  const exercises = useQuery(api.exercises.getExercises, {
    category: activeTab,
    search: searchQuery || undefined,
  });
  const muscleGroups = useQuery(api.exercises.getMuscleGroups, {});

  const handleSelect = (exercise: ExerciseSelection) => {
    vibrate("medium");
    onSelectExercise(exercise);
    onOpenChange(false);
    setCustomExercise("");
    setSearchQuery("");
    setSelectedMuscleGroups([]);
    setShowMuscleGroupPicker(false);
    setCustomMeasurementType("reps");
  };

  const toggleMuscleGroup = (muscle: string) => {
    setSelectedMuscleGroups((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle],
    );
  };

  const handleCustomSubmit = () => {
    if (customExercise.trim()) {
      // For lifting exercises, require muscle groups
      if (activeTab === "lifting" && selectedMuscleGroups.length === 0) {
        setShowMuscleGroupPicker(true);
        return;
      }

      handleSelect({
        name: customExercise.trim(),
        category: activeTab,
        primaryMetric: activeTab === "cardio" ? "duration" : undefined,
        measurementType: activeTab === "lifting" ? customMeasurementType : undefined,
        muscleGroups:
          selectedMuscleGroups.length > 0 ? selectedMuscleGroups : undefined,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} snapPoints={["85%"]} scrollable>
      <SheetHeader>
        <SheetTitle>Add Exercise</SheetTitle>
        <SheetDescription>
          Select an exercise or create a custom one
        </SheetDescription>
      </SheetHeader>

      <View className="gap-4 pb-8 pt-2">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "lifting" | "cardio")}
        >
          <TabsList>
            <TabsTrigger value="lifting">
              <Dumbbell
                size={16}
                color={
                  activeTab === "lifting"
                    ? colors.foreground
                    : colors.mutedForeground
                }
              />
              <Text
                className={
                  activeTab === "lifting"
                    ? "text-sm font-medium text-foreground"
                    : "text-sm font-medium text-muted-foreground"
                }
              >
                Lifting
              </Text>
            </TabsTrigger>
            <TabsTrigger value="cardio">
              <Heart
                size={16}
                color={
                  activeTab === "cardio"
                    ? colors.foreground
                    : colors.mutedForeground
                }
              />
              <Text
                className={
                  activeTab === "cardio"
                    ? "text-sm font-medium text-foreground"
                    : "text-sm font-medium text-muted-foreground"
                }
              >
                Cardio
              </Text>
            </TabsTrigger>
          </TabsList>
        </Tabs>

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

        <View className="gap-3">
          <View className="flex-row gap-2">
            <Input
              placeholder={`Custom ${activeTab} exercise...`}
              value={customExercise}
              onChangeText={setCustomExercise}
              className="h-12 flex-1"
            />
            <Button
              size="lg"
              className="h-12 px-4"
              onPress={handleCustomSubmit}
              disabled={!customExercise.trim()}
              accessibilityLabel="Add custom exercise"
            >
              <Plus size={20} color={colors.primaryForeground} />
            </Button>
          </View>

          {customExercise.trim() && activeTab === "lifting" ? (
            <View className="gap-2">
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Measure By
                </Text>
                <Tabs
                  value={customMeasurementType}
                  onValueChange={(value) =>
                    setCustomMeasurementType(value as "reps" | "duration")
                  }
                >
                  <TabsList>
                    <TabsTrigger value="reps">Reps</TabsTrigger>
                    <TabsTrigger value="duration">Time</TabsTrigger>
                  </TabsList>
                </Tabs>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-foreground">
                  Muscle Groups{" "}
                  {showMuscleGroupPicker && (
                    <Text className="text-destructive">*</Text>
                  )}
                </Text>
                {selectedMuscleGroups.length > 0 && (
                  <Pressable onPress={() => setSelectedMuscleGroups([])}>
                    <Text className="text-xs text-muted-foreground">Clear</Text>
                  </Pressable>
                )}
              </View>

              {showMuscleGroupPicker && selectedMuscleGroups.length === 0 && (
                <Text className="text-xs text-destructive">
                  Please select at least one muscle group
                </Text>
              )}

              <View className="flex-row flex-wrap gap-2">
                {!muscleGroups ? (
                  <Text className="text-sm text-muted-foreground">
                    Loading muscle groups...
                  </Text>
                ) : (
                  muscleGroups.map((muscle) => {
                    const selected = selectedMuscleGroups.includes(muscle);
                    return (
                      <Pressable
                        key={muscle}
                        onPress={() => toggleMuscleGroup(muscle)}
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
            </View>
          ) : null}
        </View>

        <View className="gap-2">
          {exercises?.map((exercise) => (
            <Pressable
              key={exercise._id}
              className="h-14 flex-row items-center justify-between rounded-lg border border-border bg-card px-4 active:bg-muted/70"
              onPress={() =>
                handleSelect({
                  name: exercise.name,
                  category: exercise.category,
                  primaryMetric: exercise.primaryMetric,
                  measurementType: exercise.measurementType,
                  equipment: exercise.equipment,
                  muscleGroups: exercise.muscleGroups,
                })
              }
              accessibilityRole="button"
            >
              <Text
                numberOfLines={1}
                className="flex-1 font-medium text-foreground"
              >
                {exercise.name}
              </Text>
              {exercise.category === "cardio" && (
                <Text className="ml-2 shrink-0 text-xs text-muted-foreground">
                  {exercise.primaryMetric === "distance" ? "Distance" : "Time"}
                </Text>
              )}
              {exercise.category === "lifting" &&
                exercise.measurementType === "duration" && (
                  <Text className="ml-2 shrink-0 text-xs text-muted-foreground">
                    Time
                  </Text>
                )}
            </Pressable>
          ))}
          {exercises?.length === 0 && (
            <View className="items-center py-8">
              <Text className="text-sm text-muted-foreground">
                No exercises found
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Add a custom exercise above
              </Text>
            </View>
          )}
        </View>
      </View>
    </Sheet>
  );
}
