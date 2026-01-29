"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHaptic } from "@/hooks/use-haptic";
import { Dumbbell, Heart, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ExerciseSelection {
  name: string;
  category: "lifting" | "cardio" | "mobility" | "other";
  primaryMetric?: "duration" | "distance";
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
  const { vibrate } = useHaptic();

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
  };

  const toggleMuscleGroup = (muscle: string) => {
    setSelectedMuscleGroups((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle]
    );
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        muscleGroups: selectedMuscleGroups.length > 0 ? selectedMuscleGroups : undefined,
      });
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] flex flex-col">
        <DrawerHeader>
          <DrawerTitle>Add Exercise</DrawerTitle>
          <DrawerDescription>
            Select an exercise or create a custom one
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 flex flex-col gap-4 px-4 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "lifting" | "cardio")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lifting" className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Lifting
              </TabsTrigger>
              <TabsTrigger value="cardio" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Cardio
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-10"
            />
          </div>

          <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                placeholder={`Custom ${activeTab} exercise...`}
                value={customExercise}
                onChange={(e) => setCustomExercise(e.target.value)}
                className="h-12"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 px-4"
                disabled={!customExercise.trim()}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {customExercise.trim() && activeTab === "lifting" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Muscle Groups {showMuscleGroupPicker && <span className="text-destructive">*</span>}
                  </span>
                  {selectedMuscleGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMuscleGroups([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {showMuscleGroupPicker && selectedMuscleGroups.length === 0 && (
                  <p className="text-xs text-destructive">
                    Please select at least one muscle group
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {!muscleGroups ? (
                    <p className="text-sm text-muted-foreground">Loading muscle groups...</p>
                  ) : (
                    muscleGroups.map((muscle) => (
                      <Badge
                        key={muscle}
                        variant={selectedMuscleGroups.includes(muscle) ? "default" : "outline"}
                        className="cursor-pointer capitalize h-10 px-4 text-sm font-medium"
                        onClick={() => toggleMuscleGroup(muscle)}
                      >
                        {muscle}
                        {selectedMuscleGroups.includes(muscle) && (
                          <X className="ml-1.5 h-3.5 w-3.5" />
                        )}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}
          </form>

          <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-8">
            <div className="grid grid-cols-1 gap-2">
              {exercises?.map((exercise) => (
                <button
                  key={exercise._id}
                  className="flex items-center justify-between h-14 px-4 rounded-lg border bg-card text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
                  onClick={() =>
                    handleSelect({
                      name: exercise.name,
                      category: exercise.category,
                      primaryMetric: exercise.primaryMetric,
                      equipment: exercise.equipment,
                      muscleGroups: exercise.muscleGroups,
                    })
                  }
                >
                  <span className="font-medium truncate flex-1">{exercise.name}</span>
                  {exercise.category === "cardio" && (
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {exercise.primaryMetric === "distance" ? "Distance" : "Time"}
                    </span>
                  )}
                </button>
              ))}
              {exercises?.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No exercises found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add a custom exercise above
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
