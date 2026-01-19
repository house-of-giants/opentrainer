"use client";

import { Timer, Route, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CardioSummaryCardProps {
  totalMinutes: number;
  totalDistance: number;
  distanceUnit: "km" | "mi";
  avgRpe: number;
  topModality: string | null;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatModality(modality: string): string {
  return modality
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const WEEKLY_CARDIO_TARGET = 150;

export function CardioSummaryCard({
  totalMinutes,
  totalDistance,
  distanceUnit,
  avgRpe,
  topModality,
}: CardioSummaryCardProps) {
  const progressPercent = Math.min((totalMinutes / WEEKLY_CARDIO_TARGET) * 100, 100);
  const isTargetMet = totalMinutes >= WEEKLY_CARDIO_TARGET;

  return (
    <Card className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-500" />
          <h3 className="font-semibold text-cyan-600 dark:text-cyan-400">Cardio This Week</h3>
        </div>
        {topModality && (
          <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600 border-cyan-500/20">
            {formatModality(topModality)}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xl font-bold font-mono">{formatDuration(totalMinutes)}</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
        </div>
        {totalDistance > 0 && (
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xl font-bold font-mono">
                {totalDistance.toFixed(1)} <span className="text-sm font-normal">{distanceUnit}</span>
              </div>
              <div className="text-xs text-muted-foreground">Distance</div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Weekly goal (150 min)</span>
          <span className={isTargetMet ? "text-green-500 font-medium" : "text-muted-foreground"}>
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all ${isTargetMet ? "bg-green-500" : "bg-cyan-500"}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {avgRpe > 0 && (
        <div className="mt-3 pt-3 border-t border-cyan-500/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avg Intensity</span>
            <Badge variant="outline" className="font-mono">
              RPE {avgRpe}
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
}
