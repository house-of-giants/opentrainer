"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Download,
  Dumbbell,
  MoreVertical,
  Plus,
} from "lucide-react";
import { ImportRoutineDialog } from "@/components/workout/import-routine-dialog";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { StartWorkoutSheet } from "@/components/workout/start-workout-sheet";
import { RoutineDetailSheet, type RoutineForDetail } from "@/components/workout/routine-detail-sheet";
import Link from "next/link";

type Routine = {
  _id: Id<"routines">;
  name: string;
  description?: string;
  source: "manual" | "ai_generated" | "imported";
  days: Array<{
    name: string;
    exercises: Array<{
      exerciseName: string;
      kind: "lifting" | "cardio";
      targetSets?: number;
      targetReps?: string;
      targetDuration?: number;
    }>;
  }>;
  isActive: boolean;
  createdAt: number;
};

export default function RoutinesPage() {
  const routines = useQuery(api.routines.getRoutines, {});

  const [selectedRoutine, setSelectedRoutine] = useState<RoutineForDetail | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showStartSheet, setShowStartSheet] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getSourceBadge = (source: Routine["source"]) => {
    switch (source) {
      case "ai_generated":
        return <Badge variant="secondary">AI</Badge>;
      case "imported":
        return <Badge variant="outline">Imported</Badge>;
      default:
        return null;
    }
  };

  if (routines === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center gap-4 px-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="flex-1 p-4">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4">
          <h1 className="flex-1 font-semibold text-lg">My Routines</h1>
          <Link href="/routines/new">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Download className="mr-1 h-4 w-4" />
            Import
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        {routines.length === 0 ? (
          <Card className="p-8 text-center">
            <Dumbbell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 font-semibold">No routines yet</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Create a routine from scratch, or save one from a completed workout.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/routines/new">
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Routine
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowImport(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {(routines as Routine[]).map((routine) => (
              <Card
                key={routine._id}
                className="p-4 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70"
                onClick={() => setSelectedRoutine(routine)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{routine.name}</h3>
                      {getSourceBadge(routine.source)}
                    </div>
                    {routine.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                        {routine.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">
                        {routine.days.length} day{routine.days.length !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(routine.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="shrink-0 -mr-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRoutine(routine);
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <RoutineDetailSheet
        routine={selectedRoutine}
        onOpenChange={(open) => !open && setSelectedRoutine(null)}
      />

      <ImportRoutineDialog
        open={showImport}
        onOpenChange={setShowImport}
      />

      <BottomNav onStartWorkout={() => setShowStartSheet(true)} />
      <StartWorkoutSheet
        open={showStartSheet}
        onOpenChange={setShowStartSheet}
      />
    </div>
  );
}
