"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useHaptic } from "@/hooks/use-haptic";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type RoutineExercise = {
  id: string;
  exerciseId?: Id<"exercises">;
  exerciseName: string;
  kind: "lifting" | "cardio";
  targetSets: number;
  targetReps: string;
  restSeconds: number;
};

type RoutineDay = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  isExpanded: boolean;
};

const DEFAULT_EXERCISE: Omit<RoutineExercise, "id" | "exerciseName" | "exerciseId"> = {
  kind: "lifting",
  targetSets: 3,
  targetReps: "8-12",
  restSeconds: 90,
};

const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "traps",
  "forearms",
];

function SortableExerciseItem({
  exercise,
  dayId,
  onRemove,
  onUpdate,
}: {
  exercise: RoutineExercise;
  dayId: string;
  onRemove: (dayId: string, exerciseId: string) => void;
  onUpdate: (dayId: string, exerciseId: string, updates: Partial<RoutineExercise>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="touch-none cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="font-medium text-sm">{exercise.exerciseName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onRemove(dayId, exercise.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Sets</Label>
          <Input
            type="number"
            value={exercise.targetSets || ""}
            onChange={(e) => {
              const parsed = parseInt(e.target.value);
              onUpdate(dayId, exercise.id, {
                targetSets: isNaN(parsed) ? 0 : parsed,
              });
            }}
            onBlur={() => {
              if (!exercise.targetSets || exercise.targetSets < 1) {
                onUpdate(dayId, exercise.id, { targetSets: 1 });
              }
            }}
            className="h-8 text-center"
            min={1}
            max={20}
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Reps</Label>
          <Input
            value={exercise.targetReps}
            onChange={(e) =>
              onUpdate(dayId, exercise.id, {
                targetReps: e.target.value,
              })
            }
            placeholder="8-12"
            className="h-8 text-center"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Rest (s)</Label>
          <Input
            type="number"
            value={exercise.restSeconds < 0 ? "" : exercise.restSeconds}
            onChange={(e) => {
              const parsed = parseInt(e.target.value);
              onUpdate(dayId, exercise.id, {
                restSeconds: isNaN(parsed) ? -1 : parsed,
              });
            }}
            onBlur={() => {
              if (exercise.restSeconds < 0) {
                onUpdate(dayId, exercise.id, { restSeconds: 60 });
              }
            }}
            className="h-8 text-center"
            min={0}
            step={15}
          />
        </div>
      </div>
    </div>
  );
}

export default function NewRoutinePage() {
  const router = useRouter();
  const { vibrate } = useHaptic();
  const createRoutine = useMutation(api.routines.createRoutine);
  const createExercise = useMutation(api.exercises.createExercise);
  const seedExercises = useMutation(api.exercises.seedSystemExercises);
  const exercises = useQuery(api.exercises.getExercises, {});

  const [routineName, setRoutineName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<RoutineDay[]>([
    { id: crypto.randomUUID(), name: "Day 1", exercises: [], isExpanded: true },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExerciseMuscles, setCustomExerciseMuscles] = useState<string[]>([]);
  const [showMuscleGroupDialog, setShowMuscleGroupDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (dayId: string) => (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      vibrate("light");
      setDays((prevDays) =>
        prevDays.map((d) => {
          if (d.id !== dayId) return d;

          const oldIndex = d.exercises.findIndex((e) => e.id === active.id);
          const newIndex = d.exercises.findIndex((e) => e.id === over.id);

          return {
            ...d,
            exercises: arrayMove(d.exercises, oldIndex, newIndex),
          };
        })
      );
    }
  };

  const handleSeedExercises = async () => {
    try {
      const result = await seedExercises({});
      toast.success(`Added ${result.added} exercises`);
    } catch {
      toast.error("Failed to seed exercises");
    }
  };

  const addDay = () => {
    vibrate("light");
    const newDay: RoutineDay = {
      id: crypto.randomUUID(),
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
      days.map((d) => (d.id === dayId ? { ...d, isExpanded: !d.isExpanded } : d))
    );
  };

  const openExercisePicker = (dayId: string) => {
    vibrate("light");
    setActiveDayId(dayId);
    setShowExercisePicker(true);
    setSearchQuery("");
    setSelectedMuscle(null);
  };

  const toggleCustomMuscleGroup = (muscle: string) => {
    setCustomExerciseMuscles((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle]
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
      
      addExerciseToDay(customExerciseName, exerciseId, "lifting");
      setShowMuscleGroupDialog(false);
      setCustomExerciseName("");
      setCustomExerciseMuscles([]);
      setSearchQuery("");
    } catch (error) {
      toast.error("Failed to create exercise");
      console.error(error);
    }
  };

  const addExerciseToDay = (
    exerciseName: string,
    exerciseId?: Id<"exercises">,
    kind: "lifting" | "cardio" = "lifting"
  ) => {
    if (!activeDayId) return;

    vibrate("medium");
    const newExercise: RoutineExercise = {
      id: crypto.randomUUID(),
      exerciseId,
      exerciseName,
      ...DEFAULT_EXERCISE,
      kind,
    };

    setDays(
      days.map((d) =>
        d.id === activeDayId
          ? { ...d, exercises: [...d.exercises, newExercise] }
          : d
      )
    );
    setShowExercisePicker(false);
  };

  const removeExercise = (dayId: string, exerciseId: string) => {
    vibrate("medium");
    setDays(
      days.map((d) =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
          : d
      )
    );
  };

  const updateExercise = (
    dayId: string,
    exerciseId: string,
    updates: Partial<RoutineExercise>
  ) => {
    setDays(
      days.map((d) =>
        d.id === dayId
          ? {
            ...d,
            exercises: d.exercises.map((e) =>
              e.id === exerciseId ? { ...e, ...updates } : e
            ),
          }
          : d
      )
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
            targetReps: e.targetReps,
          })),
        })),
      });

      vibrate("success");
      toast.success("Routine created!");
      router.push("/routines");
    } catch (error) {
      toast.error("Failed to create routine");
      console.error(error);
    } finally {
      setIsSaving(false);
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

  const needsSeeding = exercises && exercises.length === 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/routines">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="flex-1 font-semibold text-lg">Create Routine</h1>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="mr-1 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        <div className="space-y-6">
          <Link href="/routines/new/ai">
            <Card className="p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20 hover:border-violet-500/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Generate with AI</p>
                  <p className="text-xs text-muted-foreground">
                    Create a personalized routine based on your goals and equipment
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or build manually</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Routine Name</Label>
              <Input
                id="name"
                placeholder="e.g., Push Pull Legs"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="A 3-day split focusing on..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Days</h2>
              <Button variant="outline" size="sm" onClick={addDay}>
                <Plus className="mr-1 h-4 w-4" />
                Add Day
              </Button>
            </div>

            {days.map((day) => (
              <Card key={day.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-2 p-3 cursor-pointer"
                  onClick={() => toggleDayExpanded(day.id)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={day.name}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateDayName(day.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 flex-1 font-medium"
                  />
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {day.exercises.length} exercise
                    {day.exercises.length !== 1 ? "s" : ""}
                  </span>
                  {days.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDay(day.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  {day.isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {day.isExpanded && (
                  <div className="border-t p-3 space-y-3">
                    {day.exercises.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No exercises added yet
                      </p>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd(day.id)}
                      >
                        <SortableContext
                          items={day.exercises.map((e) => e.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {day.exercises.map((exercise) => (
                              <SortableExerciseItem
                                key={exercise.id}
                                exercise={exercise}
                                dayId={day.id}
                                onRemove={removeExercise}
                                onUpdate={updateExercise}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openExercisePicker(day.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Exercise
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Sheet open={showExercisePicker} onOpenChange={setShowExercisePicker}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Add Exercise</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 mt-4 h-[calc(85vh-6rem)] overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedMuscle === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedMuscle(null)}
              >
                All
              </Badge>
              {MUSCLE_GROUPS.map((muscle) => (
                <Badge
                  key={muscle}
                  variant={selectedMuscle === muscle ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() =>
                    setSelectedMuscle(selectedMuscle === muscle ? null : muscle)
                  }
                >
                  {muscle}
                </Badge>
              ))}
            </div>

            {needsSeeding && (
              <Card className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No exercises found. Seed the exercise library?
                </p>
                <Button size="sm" onClick={handleSeedExercises}>
                  Load Exercises
                </Button>
              </Card>
            )}

            <div className="flex-1 overflow-y-auto space-y-2">
              {searchQuery.trim() && (
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 mb-2 bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary hover:text-primary"
                  onClick={() => {
                    setCustomExerciseName(searchQuery.trim());
                    setShowMuscleGroupDialog(true);
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">
                      Add &quot;{searchQuery}&quot; as custom exercise
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Create a new exercise
                    </span>
                  </div>
                </Button>
              )}
              {filteredExercises?.map((exercise) => (
                <Button
                  key={exercise._id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3"
                  onClick={() =>
                    addExerciseToDay(
                      exercise.name,
                      exercise._id,
                      exercise.category === "cardio" ? "cardio" : "lifting"
                    )
                  }
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{exercise.name}</span>
                    {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {exercise.muscleGroups.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </div>
                </Button>
              ))}

              {filteredExercises?.length === 0 && !needsSeeding && !searchQuery.trim() && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No exercises found
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showMuscleGroupDialog} onOpenChange={setShowMuscleGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Muscle Groups</DialogTitle>
            <DialogDescription>
              Choose which muscles &quot;{customExerciseName}&quot; targets
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((muscle) => (
                <Badge
                  key={muscle}
                  variant={customExerciseMuscles.includes(muscle) ? "default" : "outline"}
                  className="cursor-pointer capitalize h-10 px-4 text-sm font-medium"
                  onClick={() => toggleCustomMuscleGroup(muscle)}
                >
                  {muscle}
                  {customExerciseMuscles.includes(muscle) && (
                    <X className="ml-1.5 h-3.5 w-3.5" />
                  )}
                </Badge>
              ))}
            </div>

            {customExerciseMuscles.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Select at least one muscle group
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMuscleGroupDialog(false);
                setCustomExerciseName("");
                setCustomExerciseMuscles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomExercise}
              disabled={customExerciseMuscles.length === 0}
            >
              Add Exercise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
