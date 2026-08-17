import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";
import { Activity, Dumbbell, Heart, Trash2, X } from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/workout/edit-exercise-sheet.tsx (a vaul
// Drawer on web). Used by the routine editor to configure a routine exercise;
// mutates the exercise catalog (create/update) for custom lifting exercises
// exactly like web before handing the row back through onSave.
export type RoutineExercise = {
  id: string;
  exerciseId?: Id<"exercises">;
  exerciseName: string;
  kind: "lifting" | "cardio" | "mobility";
  targetSets: number;
  targetReps: string;
  measurementType?: "reps" | "duration";
  targetDuration?: number;
  targetHoldSeconds?: number;
  perSide?: boolean;
  restSeconds: number;
};

interface EditExerciseSheetProps {
  exercise: RoutineExercise | null;
  onOpenChange: (open: boolean) => void;
  onSave: (exercise: RoutineExercise) => void;
  onDelete: (exerciseId: string) => void;
}

const REST_PRESETS = [60, 90, 120, 180];

export function EditExerciseSheet({
  exercise,
  onOpenChange,
  onSave,
  onDelete,
}: EditExerciseSheetProps) {
  return (
    <Sheet
      open={!!exercise}
      onOpenChange={onOpenChange}
      snapPoints={["85%"]}
      scrollable
    >
      {exercise && (
        <EditExerciseForm
          key={exercise.id}
          exercise={exercise}
          onOpenChange={onOpenChange}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </Sheet>
  );
}

function EditExerciseForm({
  exercise,
  onOpenChange,
  onSave,
  onDelete,
}: {
  exercise: RoutineExercise;
  onOpenChange: (open: boolean) => void;
  onSave: (exercise: RoutineExercise) => void;
  onDelete: (exerciseId: string) => void;
}) {
  const { colors } = useTheme();

  const [name, setName] = useState(exercise.exerciseName);
  const [kind, setKind] = useState<"lifting" | "cardio" | "mobility">(
    exercise.kind,
  );
  const [sets, setSets] = useState(exercise.targetSets);
  const [reps, setReps] = useState(exercise.targetReps);
  const [measurementType, setMeasurementType] = useState<"reps" | "duration">(
    exercise.measurementType ?? "reps",
  );
  const [duration, setDuration] = useState(exercise.targetDuration ?? 20);
  const [holdSeconds, setHoldSeconds] = useState(
    exercise.targetHoldSeconds ?? 30,
  );
  const [perSide, setPerSide] = useState(exercise.perSide ?? false);
  const [rest, setRest] = useState(exercise.restSeconds);

  const createExercise = useMutation(api.exercises.createExercise);
  const updateExercise = useMutation(api.exercises.updateExercise);
  const exerciseData = useQuery(
    api.exercises.getExercise,
    exercise.exerciseId ? { id: exercise.exerciseId } : "skip",
  );
  const availableMuscleGroups = useQuery(api.exercises.getMuscleGroups, {});

  const [muscleGroupsOverride, setMuscleGroupsOverride] = useState<
    string[] | null
  >(null);
  const muscleGroups = muscleGroupsOverride ?? exerciseData?.muscleGroups ?? [];

  const toggleMuscleGroup = (muscle: string) => {
    if (exerciseData?.isSystemExercise) {
      return;
    }
    setMuscleGroupsOverride((prev) => {
      const current = prev ?? exerciseData?.muscleGroups ?? [];
      return current.includes(muscle)
        ? current.filter((m) => m !== muscle)
        : [...current, muscle];
    });
  };

  const isSystemExercise = exerciseData?.isSystemExercise ?? false;

  const handleSave = async () => {
    if (kind === "lifting" && muscleGroups.length === 0 && !isSystemExercise) {
      toast.error(
        "Please select at least one muscle group for lifting exercises",
      );
      return;
    }

    let exerciseId = exercise.exerciseId;

    if (kind === "lifting" && !isSystemExercise) {
      if (exerciseId) {
        try {
          await updateExercise({
            id: exerciseId,
            muscleGroups,
            name,
            measurementType,
          });
        } catch (error) {
          toast.error("Failed to update exercise");
          console.error(error);
          return;
        }
      } else {
        try {
          exerciseId = await createExercise({
            name,
            category: kind,
            muscleGroups,
            measurementType,
          });
        } catch (error) {
          toast.error("Failed to create exercise");
          console.error(error);
          return;
        }
      }
    }

    onSave({
      ...exercise,
      exerciseId,
      exerciseName: name,
      kind,
      targetSets: sets,
      targetReps: reps,
      measurementType: kind === "lifting" ? measurementType : undefined,
      targetDuration: duration,
      targetHoldSeconds: holdSeconds,
      perSide,
      restSeconds: rest,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(exercise.id);
    onOpenChange(false);
  };

  const formatRest = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  const kindTabText = (value: string, label: string) => (
    <Text
      className={
        kind === value
          ? "text-sm font-medium text-foreground"
          : "text-sm font-medium text-muted-foreground"
      }
    >
      {label}
    </Text>
  );

  return (
    <View className="gap-6 pb-8">
      <SheetHeader>
        <SheetTitle>Edit Exercise</SheetTitle>
        <SheetDescription>
          Configure how this exercise is measured and logged
        </SheetDescription>
      </SheetHeader>

      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">
          Exercise Name
        </Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Exercise name"
          className="h-12 text-lg"
          editable={!isSystemExercise}
        />
      </View>

      <View className="gap-3">
        <Text className="text-sm font-medium text-foreground">Type</Text>
        <Tabs
          value={kind}
          onValueChange={(v) => setKind(v as "lifting" | "cardio" | "mobility")}
        >
          <TabsList className="h-12">
            <TabsTrigger
              value="lifting"
              className="h-10"
              disabled={isSystemExercise}
            >
              <Dumbbell
                size={16}
                color={
                  kind === "lifting" ? colors.foreground : colors.mutedForeground
                }
              />
              {kindTabText("lifting", "Lifting")}
            </TabsTrigger>
            <TabsTrigger
              value="cardio"
              className="h-10"
              disabled={isSystemExercise}
            >
              <Heart
                size={16}
                color={
                  kind === "cardio" ? colors.foreground : colors.mutedForeground
                }
              />
              {kindTabText("cardio", "Cardio")}
            </TabsTrigger>
            <TabsTrigger
              value="mobility"
              className="h-10"
              disabled={isSystemExercise}
            >
              <Activity
                size={16}
                color={
                  kind === "mobility"
                    ? colors.foreground
                    : colors.mutedForeground
                }
              />
              {kindTabText("mobility", "Mobility")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </View>

      {kind === "lifting" ? (
        <>
          <View className="gap-3">
            <Text className="text-sm font-medium text-foreground">
              Measure By
            </Text>
            <Tabs
              value={measurementType}
              onValueChange={(value) =>
                setMeasurementType(value as "reps" | "duration")
              }
            >
              <TabsList className="h-12">
                <TabsTrigger value="reps" className="h-10">
                  Reps
                </TabsTrigger>
                <TabsTrigger value="duration" className="h-10">
                  Time
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-medium text-foreground">
              Muscle Groups
              {isSystemExercise && (
                <Text className="text-xs font-normal text-muted-foreground">
                  {"  "}(read-only)
                </Text>
              )}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {!availableMuscleGroups ? (
                <Text className="text-sm text-muted-foreground">
                  Loading muscle groups...
                </Text>
              ) : (
                availableMuscleGroups.map((muscle) => {
                  const selected = muscleGroups.includes(muscle);
                  return (
                    <Pressable
                      key={muscle}
                      onPress={() => toggleMuscleGroup(muscle)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      disabled={isSystemExercise}
                    >
                      <Badge
                        variant={selected ? "default" : "outline"}
                        className={
                          isSystemExercise
                            ? "h-10 px-4 opacity-60"
                            : "h-10 px-4"
                        }
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
                        {selected && !isSystemExercise && (
                          <X size={14} color={colors.primaryForeground} />
                        )}
                      </Badge>
                    </Pressable>
                  );
                })
              )}
            </View>
            {muscleGroups.length === 0 && !isSystemExercise && (
              <Text className="text-sm text-muted-foreground">
                Select at least one muscle group
              </Text>
            )}
            {isSystemExercise && (
              <Text className="text-sm text-muted-foreground">
                Muscle groups are predefined for this exercise
              </Text>
            )}
          </View>

          <SetsControl sets={sets} onChange={setSets} />

          {measurementType === "reps" ? (
            <View className="gap-3">
              <Text className="text-sm font-medium text-foreground">Reps</Text>
              <View className="flex-row gap-2">
                {["5", "8", "10", "12"].map((preset) => (
                  <Button
                    key={preset}
                    variant={reps === preset ? "default" : "outline"}
                    className="h-12 flex-1"
                    textClassName="font-mono"
                    onPress={() => setReps(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </View>
              <View className="flex-row gap-2">
                {["6-8", "8-12", "12-15"].map((preset) => (
                  <Button
                    key={preset}
                    variant={reps === preset ? "default" : "outline"}
                    className="h-12 flex-1"
                    textClassName="font-mono"
                    onPress={() => setReps(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </View>
              <Input
                value={reps}
                onChangeText={setReps}
                placeholder="Custom (e.g., AMRAP)"
                className="h-12 text-center font-mono"
              />
            </View>
          ) : (
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-foreground">
                  Hold Duration
                </Text>
                <Text className="font-mono text-2xl font-bold text-foreground">
                  {holdSeconds}s
                </Text>
              </View>
              <View className="flex-row gap-2">
                {[15, 30, 45, 60].map((preset) => (
                  <Button
                    key={preset}
                    variant={holdSeconds === preset ? "default" : "outline"}
                    className="h-12 flex-1"
                    textClassName="font-mono"
                    onPress={() => setHoldSeconds(preset)}
                  >
                    {`${preset}s`}
                  </Button>
                ))}
              </View>
              <Slider
                value={holdSeconds}
                onValueChange={setHoldSeconds}
                min={5}
                max={300}
                step={5}
              />
            </View>
          )}

          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">
                Rest Between Sets
              </Text>
              <Text className="font-mono text-lg font-semibold text-foreground">
                {formatRest(rest)}
              </Text>
            </View>
            <View className="flex-row gap-2">
              {REST_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={rest === preset ? "default" : "outline"}
                  className="h-12 flex-1"
                  onPress={() => setRest(preset)}
                >
                  {formatRest(preset)}
                </Button>
              ))}
            </View>
            <Slider
              value={rest}
              onValueChange={setRest}
              min={30}
              max={300}
              step={15}
            />
          </View>
        </>
      ) : kind === "cardio" ? (
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground">Duration</Text>
            <Text className="font-mono text-2xl font-bold text-foreground">
              {duration} min
            </Text>
          </View>
          <View className="flex-row gap-2">
            {[10, 20, 30, 45].map((preset) => (
              <Button
                key={preset}
                variant={duration === preset ? "default" : "outline"}
                className="h-12 flex-1"
                textClassName="font-mono"
                onPress={() => setDuration(preset)}
              >
                {`${preset}m`}
              </Button>
            ))}
          </View>
          <Slider
            value={duration}
            onValueChange={setDuration}
            min={5}
            max={90}
            step={5}
          />
        </View>
      ) : (
        <>
          <SetsControl sets={sets} onChange={setSets} />

          <View className="gap-3">
            <Text className="text-sm font-medium text-foreground">Reps</Text>
            <View className="flex-row gap-2">
              {["5", "10", "15", "20"].map((preset) => (
                <Button
                  key={preset}
                  variant={reps === preset ? "default" : "outline"}
                  className="h-12 flex-1"
                  textClassName="font-mono"
                  onPress={() => setReps(preset)}
                >
                  {preset}
                </Button>
              ))}
            </View>
            <Input
              value={reps}
              onChangeText={setReps}
              placeholder="Reps (leave empty for hold)"
              className="h-12 text-center font-mono"
            />
          </View>

          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">
                Hold Duration
              </Text>
              <Text className="font-mono text-2xl font-bold text-foreground">
                {holdSeconds}s
              </Text>
            </View>
            <View className="flex-row gap-2">
              {[15, 30, 45, 60].map((preset) => (
                <Button
                  key={preset}
                  variant={holdSeconds === preset ? "default" : "outline"}
                  className="h-12 flex-1"
                  textClassName="font-mono"
                  onPress={() => setHoldSeconds(preset)}
                >
                  {`${preset}s`}
                </Button>
              ))}
            </View>
            <Slider
              value={holdSeconds}
              onValueChange={setHoldSeconds}
              min={5}
              max={120}
              step={5}
            />
          </View>

          <View className="flex-row items-center justify-between py-2">
            <Text className="text-sm font-medium text-foreground">Per Side</Text>
            <Button
              variant={perSide ? "default" : "outline"}
              size="sm"
              onPress={() => setPerSide(!perSide)}
            >
              {perSide ? "Yes" : "No"}
            </Button>
          </View>
        </>
      )}

      <Button
        variant="ghost"
        className="w-full active:bg-destructive/10"
        onPress={handleDelete}
      >
        <Trash2 size={16} color={colors.destructive} />
        <Text className="text-sm font-medium text-destructive">
          Remove Exercise
        </Text>
      </Button>

      <View className="flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onPress={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button className="flex-1" onPress={handleSave}>
          Save Changes
        </Button>
      </View>
    </View>
  );
}

function SetsControl({
  sets,
  onChange,
}: {
  sets: number;
  onChange: (sets: number) => void;
}) {
  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">Sets</Text>
        <Text className="font-mono text-2xl font-bold text-foreground">
          {sets}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Button
          variant="outline"
          size="icon-lg"
          textClassName="text-lg"
          onPress={() => onChange(Math.max(1, sets - 1))}
          accessibilityLabel="Decrease sets"
        >
          −
        </Button>
        <Slider
          value={sets}
          onValueChange={onChange}
          min={1}
          max={10}
          step={1}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon-lg"
          textClassName="text-lg"
          onPress={() => onChange(Math.min(10, sets + 1))}
          accessibilityLabel="Increase sets"
        >
          +
        </Button>
      </View>
    </View>
  );
}
