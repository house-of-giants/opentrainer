"use client";

import { useState } from "react";
import { Dumbbell, Activity, TrendingUp, TrendingDown, Zap, Info, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TrainingProfile = "strength_focused" | "cardio_focused" | "hybrid" | "general_fitness";

interface TrainingLoadCardProps {
  total: number;
  liftingLoad: number;
  cardioLoad: number;
  liftingPercent: number;
  cardioPercent: number;
  changePercent: number | null;
  profile: TrainingProfile;
}

const profileConfig: Record<TrainingProfile, { label: string; color: string; bgColor: string }> = {
  strength_focused: {
    label: "Strength",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/20",
  },
  cardio_focused: {
    label: "Cardio",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
  },
  hybrid: {
    label: "Hybrid",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10 border-violet-500/20",
  },
  general_fitness: {
    label: "General",
    color: "text-muted-foreground",
    bgColor: "bg-muted border-muted",
  },
};

export function TrainingLoadCard({
  total,
  liftingLoad,
  cardioLoad,
  liftingPercent,
  cardioPercent,
  changePercent,
  profile,
}: TrainingLoadCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const config = profileConfig[profile];
  const showSplit = liftingPercent > 0 && cardioPercent > 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Training Load</h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="What is training load?"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <Badge variant="outline" className={config.bgColor}>
          <span className={config.color}>{config.label}</span>
        </Badge>
      </div>

      {showInfo && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-muted-foreground">
              Training load combines workout duration and intensity (RPE) into a single number. 
              Use it to track trends over time — a rising load means you&apos;re doing more work, 
              which may require more recovery.
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setShowInfo(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-3xl font-bold font-mono">{total.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">This week</div>
        </div>
        {changePercent !== null && (
          <Badge
            variant="outline"
            className={
              changePercent > 0
                ? "text-green-500 border-green-500/30"
                : changePercent < 0
                  ? "text-red-500 border-red-500/30"
                  : "text-muted-foreground"
            }
          >
            {changePercent > 0 ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : changePercent < 0 ? (
              <TrendingDown className="h-3 w-3 mr-1" />
            ) : null}
            {changePercent > 0 ? "+" : ""}
            {changePercent}%
          </Badge>
        )}
      </div>

      {showSplit && (
        <div className="space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            {liftingPercent > 0 && (
              <div
                className="bg-amber-500 transition-all"
                style={{ width: `${liftingPercent}%` }}
              />
            )}
            {cardioPercent > 0 && (
              <div
                className="bg-cyan-500 transition-all"
                style={{ width: `${cardioPercent}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs">
            <div className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3 text-amber-500" />
              <span className="text-muted-foreground">Lifting</span>
              <span className="font-mono font-medium">{liftingPercent}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-cyan-500" />
              <span className="text-muted-foreground">Cardio</span>
              <span className="font-mono font-medium">{cardioPercent}%</span>
            </div>
          </div>
        </div>
      )}

      {!showSplit && liftingPercent === 100 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Dumbbell className="h-4 w-4 text-amber-500" />
          <span>All lifting this week</span>
        </div>
      )}

      {!showSplit && cardioPercent === 100 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 text-cyan-500" />
          <span>All cardio this week</span>
        </div>
      )}
    </Card>
  );
}
