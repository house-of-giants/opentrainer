"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ExerciseTrend {
  exercise: string;
  sessions: number;
  trend: "up" | "down" | "flat";
  topWeight: number;
  avgRpe: number;
}

interface ExerciseHistorySheetProps {
  exercise: ExerciseTrend | null;
  onClose: () => void;
}

export function ExerciseHistorySheet({ exercise, onClose }: ExerciseHistorySheetProps) {
  return (
    <Sheet open={exercise !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{exercise?.exercise}</SheetTitle>
          <SheetDescription>Exercise performance history</SheetDescription>
        </SheetHeader>
        {exercise && <ExerciseHistoryContent exercise={exercise} />}
      </SheetContent>
    </Sheet>
  );
}

function ExerciseHistoryContent({ exercise }: { exercise: ExerciseTrend }) {
  const TrendIcon =
    exercise.trend === "up"
      ? TrendingUp
      : exercise.trend === "down"
        ? TrendingDown
        : Minus;

  return (
    <div className="py-4 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono">{exercise.sessions}</div>
          <div className="text-xs text-muted-foreground">Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono flex items-center justify-center gap-1">
            {exercise.topWeight > 0 ? exercise.topWeight : "—"}
            {exercise.topWeight > 0 && (
              <span className="text-sm font-normal text-muted-foreground">lb</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">Top Weight</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono">
            {exercise.avgRpe > 0 ? exercise.avgRpe.toFixed(1) : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Avg RPE</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Badge
          variant="outline"
          className={`${
            exercise.trend === "up"
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : exercise.trend === "down"
                ? "bg-red-500/10 text-red-500 border-red-500/20"
                : "bg-muted text-muted-foreground"
          }`}
        >
          <TrendIcon className="h-3 w-3 mr-1" />
          {exercise.trend === "up"
            ? "Progressing"
            : exercise.trend === "down"
              ? "Declining"
              : "Steady"}
        </Badge>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <div className="text-sm text-muted-foreground text-center">
          Detailed session history coming soon
        </div>
        <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-4">
          <li>Session-by-session breakdown</li>
          <li>Weight progression chart</li>
          <li>PR history with dates</li>
          <li>Volume and intensity analysis</li>
        </ul>
      </div>
    </div>
  );
}
