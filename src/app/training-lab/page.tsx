"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FlaskConical, Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type ReportType = "snapshot" | "full";

export default function TrainingLabPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const ctaState = useQuery(api.ai.trainingLabMutations.getCtaState);
  const latestReport = useQuery(api.ai.trainingLabMutations.getLatestReport);
  const generateReport = useAction(api.ai.trainingLab.generateReport);

  const handleGenerateReport = async (reportType: ReportType) => {
    setIsGenerating(true);
    try {
      await generateReport({ reportType, periodDays: 7 });
      toast.success("Report generated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  if (ctaState === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center gap-4 px-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="flex-1 p-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  if (!ctaState?.isPro) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center gap-4 px-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">Training Lab</h1>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <FlaskConical className="h-16 w-16 text-muted-foreground mb-4" />
          <span className="mb-3 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600">
            Free During Alpha
          </span>
          <h2 className="text-xl font-bold mb-2">Training Lab</h2>
          <p className="text-muted-foreground mb-4">Get AI-powered training insights — free while we&apos;re in alpha.</p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  const canGenerate = ctaState.reportType !== "none";
  const reportType = ctaState.reportType as ReportType;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-violet-500" />
            <h1 className="font-semibold">Training Lab</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {!canGenerate && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-3">{ctaState.message}</p>
            <Progress value={(ctaState.workoutsSinceLastReport / 3) * 100} className="h-2" />
          </Card>
        )}

        {canGenerate && (
          <Card className="p-4">
            <p className="text-sm mb-3">{ctaState.message}</p>
            {reportType === "snapshot" && (
              <div className="mb-3 flex items-center gap-2">
                <Progress value={(ctaState.workoutsSinceLastReport / 5) * 100} className="h-2" />
                <span className="text-xs font-mono text-muted-foreground">
                  {ctaState.workoutsSinceLastReport}/5
                </span>
              </div>
            )}
            <Button
              className="w-full gap-2"
              onClick={() => handleGenerateReport(reportType)}
              disabled={isGenerating}
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating
                ? "Generating..."
                : reportType === "snapshot"
                  ? "Generate Snapshot"
                  : "Generate Full Report"}
            </Button>
          </Card>
        )}

        {latestReport && (
          <div className="space-y-4">
            <Card className="p-4">
              <p className="text-sm leading-relaxed">{latestReport.summary}</p>
            </Card>

            {latestReport.type === "full" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <ScoreCard label="Volume" score={latestReport.scores.volumeAdherence} />
                  <ScoreCard label="Intensity" score={latestReport.scores.intensityManagement} />
                  <ScoreCard label="Balance" score={latestReport.scores.muscleBalance} />
                  <ScoreCard label="Recovery" score={latestReport.scores.recoverySignals} />
                </div>

                {latestReport.insights.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Insights</h3>
                    <div className="space-y-3">
                      {latestReport.insights.map((insight, i) => (
                        <InsightItem key={i} insight={insight} />
                      ))}
                    </div>
                  </Card>
                )}

                {latestReport.alerts.length > 0 && (
                  <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Alerts
                    </h3>
                    <div className="space-y-2">
                      {latestReport.alerts.map((alert, i) => (
                        <div key={i} className="text-sm">
                          <span className="text-muted-foreground">{alert.message}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {latestReport.chartData.exerciseTrends.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Exercise Trends</h3>
                    <div className="space-y-2">
                      {latestReport.chartData.exerciseTrends.map((trend, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span>{trend.exercise}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono">
                              {trend.topWeight > 0 ? `${trend.topWeight} lb` : "—"}
                            </span>
                            <TrendIcon trend={trend.trend} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}

            {latestReport.type === "snapshot" && (
              <>
                {latestReport.historicalContext && (
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold font-mono text-violet-500">
                        {latestReport.historicalContext.totalWorkouts}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Workouts</div>
                    </Card>
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold font-mono text-violet-500">
                        {latestReport.historicalContext.trainingAge}
                      </div>
                      <div className="text-xs text-muted-foreground">Training Age</div>
                    </Card>
                  </div>
                )}

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">This Week</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Strongest Area</span>
                      <span className="font-medium capitalize">
                        {latestReport.weeklyHighlights?.strongestArea ?? (latestReport as unknown as { volumeBreakdown?: { strongestArea: string } }).volumeBreakdown?.strongestArea ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Sets</span>
                      <span className="font-mono">
                        {latestReport.weeklyHighlights?.totalSets ?? (latestReport as unknown as { volumeBreakdown?: { totalSets: number } }).volumeBreakdown?.totalSets ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Sets/Workout</span>
                      <span className="font-mono">
                        {(latestReport.weeklyHighlights?.avgSetsPerWorkout ?? (latestReport as unknown as { volumeBreakdown?: { avgSetsPerWorkout: number } }).volumeBreakdown?.avgSetsPerWorkout ?? 0).toFixed(1)}
                      </span>
                    </div>
                    {latestReport.weeklyHighlights?.standoutExercise && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Standout Exercise</span>
                        <span className="font-medium">{latestReport.weeklyHighlights.standoutExercise}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {latestReport.historicalContext && (
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Your Journey</h3>
                      <Badge variant="outline" className={
                        latestReport.historicalContext.consistencyRating === "excellent" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        latestReport.historicalContext.consistencyRating === "good" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        latestReport.historicalContext.consistencyRating === "moderate" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        "bg-muted text-muted-foreground"
                      }>
                        {latestReport.historicalContext.consistencyRating.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Primary focus: <span className="capitalize font-medium text-foreground">{latestReport.historicalContext.primaryFocus}</span>
                    </p>
                  </Card>
                )}

                {latestReport.progressIndicators && latestReport.progressIndicators.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Progress</h3>
                    <div className="space-y-3">
                      {latestReport.progressIndicators.map((indicator, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={
                              indicator.type === "milestone" ? "text-violet-500" :
                              indicator.type === "streak" ? "text-green-500" :
                              indicator.type === "pr_potential" ? "text-amber-500" :
                              "text-blue-500"
                            }>
                              {indicator.type === "milestone" ? "🏆" : 
                               indicator.type === "streak" ? "🔥" : 
                               indicator.type === "pr_potential" ? "💪" : "📈"}
                            </span>
                            <span className="text-sm font-medium">{indicator.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">{indicator.message}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {!latestReport.progressIndicators && (latestReport as unknown as { observations?: Array<{ type: string; message: string }> }).observations && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Observations</h3>
                    <div className="space-y-2">
                      {((latestReport as unknown as { observations: Array<{ type: string; message: string }> }).observations).map((obs, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className={obs.type === "positive" ? "text-green-500" : obs.type === "suggestion" ? "text-amber-500" : "text-muted-foreground"}>
                            {obs.type === "positive" ? "✓" : obs.type === "suggestion" ? "💡" : "•"}
                          </span>
                          <span>{obs.message}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {latestReport.recommendations && latestReport.recommendations.length > 0 && (
                  <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                    <h3 className="font-semibold mb-3">Recommendations</h3>
                    <div className="space-y-2">
                      {latestReport.recommendations.map((rec, i) => (
                        <div key={i} className="text-sm">
                          <span className="text-muted-foreground">{rec.area}: </span>
                          <span>{rec.suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card className="p-4 bg-violet-500/5 border-violet-500/20">
                  <p className="text-sm text-center">
                    🎯 {latestReport.lookingAhead ?? (latestReport as unknown as { nextMilestone?: string }).nextMilestone ?? "Keep logging workouts!"}
                  </p>
                </Card>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card className="p-3 text-center">
      <div className={`text-2xl font-bold font-mono ${getScoreColor(score)}`}>{score}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function InsightItem({ insight }: { insight: { category: string; observation: string; recommendation: string; priority: string } }) {
  const priorityColor = {
    high: "bg-red-500/10 text-red-500 border-red-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-green-500/10 text-green-500 border-green-500/20",
  }[insight.priority] ?? "bg-muted text-muted-foreground";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={priorityColor}>
          {insight.priority.toUpperCase()}
        </Badge>
        <span className="text-xs text-muted-foreground capitalize">{insight.category}</span>
      </div>
      <p className="text-sm">{insight.observation}</p>
      <p className="text-sm text-muted-foreground">→ {insight.recommendation}</p>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}
