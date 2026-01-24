"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  FlaskConical,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  AlertTriangle,
} from "lucide-react";
import { ScoreCard, VolumeBarChart } from "@/components/training-lab/charts";
import { MOCK_TRAINING_LAB_INSIGHTS, MOCK_DASHBOARD_STATS } from "@/lib/demo-data";

export default function DemoTrainingLab() {
  const router = useRouter();
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Training Lab</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-24">
        <div className="grid grid-cols-3 gap-2">
          <Card className="relative overflow-hidden">
            <div className="p-4 flex flex-col items-center justify-center min-h-[88px]">
              <div className="h-12 flex items-center justify-center">
                <div className="text-2xl font-bold font-mono text-primary">
                  {MOCK_DASHBOARD_STATS.weeklyWorkoutCount}/{MOCK_DASHBOARD_STATS.weeklyGoal}
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground mt-2 font-medium">Workouts</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
          </Card>

          <Card className="relative overflow-hidden">
            <div className="p-4 flex flex-col items-center justify-center min-h-[88px]">
              <div className="h-12 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5">
                  <Dumbbell className="h-5 w-5 text-amber-500" />
                  <span className="text-2xl font-bold font-mono">
                    {MOCK_DASHBOARD_STATS.weeklyTotalSets}
                  </span>
                </div>
                <span className="text-[10px] font-medium mt-0.5 text-green-500">
                  ↑12% vs last wk
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-2 font-medium">Sets</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/20 via-amber-500/40 to-amber-500/20" />
          </Card>

          <Card className="relative overflow-hidden">
            <div className="p-4 flex flex-col items-center justify-center min-h-[88px]">
              <div className="h-12 flex items-center justify-center">
                <div className="text-2xl font-bold">🔥</div>
              </div>
              <span className="text-[11px] text-muted-foreground mt-2 font-medium">Week Streak</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500/20 via-orange-500/40 to-orange-500/20" />
          </Card>
        </div>

        <Card className="overflow-hidden">
          <button
            className="w-full p-4 flex items-start gap-3 text-left"
            onClick={() => setSummaryExpanded(!summaryExpanded)}
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">AI Summary</span>
                {summaryExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {summaryExpanded && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {MOCK_TRAINING_LAB_INSIGHTS.summary}
                </p>
              )}
            </div>
          </button>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-4">Volume by Muscle</h3>
          <VolumeBarChart
            data={MOCK_TRAINING_LAB_INSIGHTS.volumeByMuscle}
            className="min-h-[220px]"
            onMuscleClick={() => {}}
          />
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <ScoreCard
            label="Volume"
            score={MOCK_TRAINING_LAB_INSIGHTS.scores.volumeAdherence}
            description="Target adherence"
          />
          <ScoreCard
            label="Intensity"
            score={MOCK_TRAINING_LAB_INSIGHTS.scores.intensityManagement}
            description="RPE management"
          />
          <ScoreCard
            label="Balance"
            score={MOCK_TRAINING_LAB_INSIGHTS.scores.muscleBalance}
            description="Push/pull ratio"
          />
          <ScoreCard
            label="Recovery"
            score={MOCK_TRAINING_LAB_INSIGHTS.scores.recoveryBalance}
            description="Fatigue signals"
          />
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-4">Insights</h3>
          <div className="space-y-4">
            {MOCK_TRAINING_LAB_INSIGHTS.insights.map((insight, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center pt-1.5">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      insight.priority === "high"
                        ? "bg-red-500"
                        : insight.priority === "medium"
                          ? "bg-yellow-500"
                          : "bg-emerald-500"
                    }`}
                  />
                  <div className="w-px flex-1 bg-border mt-2" />
                </div>
                <div className="flex-1 pb-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {insight.category}
                  </span>
                  <p className="text-sm mt-1 font-medium">{insight.observation}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="text-primary font-medium">Recommendation:</span>{" "}
                    {insight.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alerts
          </h3>
          <div className="space-y-2">
            {MOCK_TRAINING_LAB_INSIGHTS.alerts.map((alert, i) => (
              <div key={i} className="text-sm text-muted-foreground">
                {alert.message}
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
