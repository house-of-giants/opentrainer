"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Dumbbell, Heart, Trash2 } from "lucide-react";

export type RoutineExercise = {
  id: string;
  exerciseName: string;
  kind: "lifting" | "cardio";
  targetSets: number;
  targetReps: string;
  targetDuration?: number;
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
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"lifting" | "cardio">("lifting");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState("8-12");
  const [duration, setDuration] = useState(20);
  const [rest, setRest] = useState(90);

  useEffect(() => {
    if (exercise) {
      setName(exercise.exerciseName);
      setKind(exercise.kind);
      setSets(exercise.targetSets);
      setReps(exercise.targetReps);
      setDuration(exercise.targetDuration ?? 20);
      setRest(exercise.restSeconds);
    }
  }, [exercise]);

  const handleSave = () => {
    if (!exercise) return;
    
    onSave({
      ...exercise,
      exerciseName: name,
      kind,
      targetSets: sets,
      targetReps: reps,
      targetDuration: duration,
      restSeconds: rest,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!exercise) return;
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

  return (
    <Sheet open={!!exercise} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit Exercise</SheetTitle>
          <SheetDescription>
            Configure sets, reps, and rest time
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-6">
          <div className="space-y-2">
            <Label>Exercise Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise name"
              className="h-12 text-lg"
            />
          </div>

          <div className="space-y-3">
            <Label>Type</Label>
            <Tabs value={kind} onValueChange={(v) => setKind(v as "lifting" | "cardio")}>
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="lifting" className="h-10 gap-2">
                  <Dumbbell className="h-4 w-4" />
                  Lifting
                </TabsTrigger>
                <TabsTrigger value="cardio" className="h-10 gap-2">
                  <Heart className="h-4 w-4" />
                  Cardio
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {kind === "lifting" ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Sets</Label>
                  <span className="text-2xl font-mono font-bold tabular-nums">{sets}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 text-lg"
                    onClick={() => setSets(Math.max(1, sets - 1))}
                  >
                    −
                  </Button>
                  <Slider
                    value={[sets]}
                    onValueChange={([v]) => setSets(v)}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 text-lg"
                    onClick={() => setSets(Math.min(10, sets + 1))}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Reps</Label>
                <div className="grid grid-cols-4 gap-2">
                  {["5", "8", "10", "12"].map((preset) => (
                    <Button
                      key={preset}
                      variant={reps === preset ? "default" : "outline"}
                      className="h-12 font-mono"
                      onClick={() => setReps(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["6-8", "8-12", "12-15"].map((preset) => (
                    <Button
                      key={preset}
                      variant={reps === preset ? "default" : "outline"}
                      className="h-12 font-mono"
                      onClick={() => setReps(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
                <Input
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="Custom (e.g., AMRAP)"
                  className="h-12 text-center font-mono"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Rest Between Sets</Label>
                  <span className="text-lg font-mono font-semibold">{formatRest(rest)}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {REST_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      variant={rest === preset ? "default" : "outline"}
                      className="h-12"
                      onClick={() => setRest(preset)}
                    >
                      {formatRest(preset)}
                    </Button>
                  ))}
                </div>
                <Slider
                  value={[rest]}
                  onValueChange={([v]) => setRest(v)}
                  min={30}
                  max={300}
                  step={15}
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Duration</Label>
                <span className="text-2xl font-mono font-bold tabular-nums">{duration} min</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 45].map((preset) => (
                  <Button
                    key={preset}
                    variant={duration === preset ? "default" : "outline"}
                    className="h-12 font-mono"
                    onClick={() => setDuration(preset)}
                  >
                    {preset}m
                  </Button>
                ))}
              </div>
              <Slider
                value={[duration]}
                onValueChange={([v]) => setDuration(v)}
                min={5}
                max={90}
                step={5}
              />
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Exercise
          </Button>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
