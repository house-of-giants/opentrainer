"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ChevronRight, Dumbbell, Play, Zap } from "lucide-react";

interface StartWorkoutSheetDemoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEMO_ROUTINE = {
  id: "demo-routine",
  name: "Push Day",
  days: [
    {
      name: "Push Day A",
      exercises: ["Bench Press", "Overhead Press", "Tricep Dips"],
    },
  ],
};

export function StartWorkoutSheetDemo({ open, onOpenChange }: StartWorkoutSheetDemoProps) {
  const router = useRouter();
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);

  const handleStartEmpty = () => {
    onOpenChange(false);
    router.push("/demo/workout");
  };

  const handleStartFromRoutine = () => {
    onOpenChange(false);
    router.push("/demo/workout");
  };

  const toggleRoutine = (routineId: string) => {
    setExpandedRoutine(expandedRoutine === routineId ? null : routineId);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] flex flex-col">
        <DrawerHeader>
          <DrawerTitle>Start Workout</DrawerTitle>
          <DrawerDescription>
            Start from scratch or use a saved routine
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
          <Button
            size="lg"
            className="h-16 w-full text-lg"
            onClick={handleStartEmpty}
          >
            <Zap className="mr-2 h-5 w-5" />
            Empty Workout
          </Button>

          <section>
            <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3">
              From Routine
            </h3>
            <div className="space-y-2">
              <Card className="overflow-hidden">
                <button
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                  onClick={() => toggleRoutine(DEMO_ROUTINE.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Dumbbell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{DEMO_ROUTINE.name}</p>
                      <p className="text-sm text-muted-foreground font-mono tabular-nums">
                        {DEMO_ROUTINE.days.length} day
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                      expandedRoutine === DEMO_ROUTINE.id ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {expandedRoutine === DEMO_ROUTINE.id && (
                  <div className="border-t divide-y bg-muted/30">
                    {DEMO_ROUTINE.days.map((day, idx) => (
                      <button
                        key={idx}
                        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                        onClick={handleStartFromRoutine}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{day.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {day.exercises.join(", ")}
                          </p>
                        </div>
                        <Play className="ml-3 h-4 w-4 shrink-0 text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
