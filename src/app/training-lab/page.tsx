"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FlaskConical,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  VolumeBarChart,
  ExerciseTrendChart,
  ScoreCard,
  RpeTrendChart,
  ProgressRing,
  type ExerciseTrendData,
} from "@/components/training-lab/charts";
import { MuscleDrawer } from "@/components/training-lab/muscle-drawer";
import { ExerciseHistorySheet } from "@/components/training-lab/exercise-history-sheet";
import { StreakBadge, RecentPrCard, CardioSummaryCard, TrainingLoadCard } from "@/components/training-lab";

export default function TrainingLabPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [period, setPeriod] = useState<"7" | "30" | "90">("7");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseTrendData | null>(null);

  const ctaState = useQuery(api.ai.trainingLabMutations.getCtaState);
  const latestReport = useQuery(api.ai.trainingLabMutations.getLatestReport);
  const dashboardStats = useQuery(api.ai.trainingLabMutations.getDashboardStats);
  const generateReport = useAction(api.ai.trainingLab.generateReport);

  const doGenerateReport = async (periodDays: number) => {
    setIsGenerating(true);
    try {
      await generateReport({ reportType: "full", periodDays });
      toast.success("Analysis generated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate analysis");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReport = () => doGenerateReport(parseInt(period));

  const handlePeriodChange = (newPeriod: "7" | "30" | "90") => {
    setPeriod(newPeriod);
    if (ctaState?.hasReport) {
      doGenerateReport(parseInt(newPeriod));
    }
  };

  const dataRangeDays = ctaState?.dataRangeDays ?? 0;
  const has30DaysData = dataRangeDays >= 14;
  const has90DaysData = dataRangeDays >= 60;

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
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
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
          <p className="text-muted-foreground mb-4">
            Get AI-powered training insights — free while we&apos;re in alpha.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  const canGenerate = ctaState.canGenerate;
  const hasReport = ctaState.hasReport;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
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
          <Tabs value={period} onValueChange={(v) => handlePeriodChange(v as "7" | "30" | "90")}>
            <TabsList className="h-8">
              <TabsTrigger value="7" className="text-xs px-2" disabled={isGenerating}>7d</TabsTrigger>
              <TabsTrigger value="30" className="text-xs px-2" disabled={!has30DaysData || isGenerating}>30d</TabsTrigger>
              <TabsTrigger value="90" className="text-xs px-2" disabled={!has90DaysData || isGenerating}>90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-8">
        {dashboardStats && (
          <div className="grid grid-cols-3 gap-2">
            <Card className="relative overflow-hidden">
              <div className="p-4 flex flex-col items-center justify-center min-h-[88px]">
                <div className="relative">
                  <ProgressRing
                    value={dashboardStats.workoutsThisWeek}
                    max={dashboardStats.weeklyTarget}
                    size="sm"
                    color={
                      dashboardStats.workoutsThisWeek >= dashboardStats.weeklyTarget
                        ? "success"
                        : "primary"
                    }
                  />
                </div>
                <span className="text-[11px] text-muted-foreground mt-2 font-medium">Workouts</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
            </Card>

            <Card className="relative overflow-hidden">
              <div className="p-4 flex flex-col items-center justify-center min-h-[88px]">
                {dashboardStats.trainingProfile === "cardio_focused" ? (
                  <>
                    <div className="h-12 flex items-center justify-center">
                      <div className="flex items-center gap-1.5">
                        <Timer className="h-5 w-5 text-cyan-500" />
                        <span className="text-2xl font-bold font-mono">
                          {dashboardStats.cardioSummary?.totalMinutes ?? 0}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-2 font-medium">Minutes</span>
                  </>
                ) : (
                  <>
                    <div className="h-12 flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1.5">
                        <Dumbbell className="h-5 w-5 text-amber-500" />
                        <span className="text-2xl font-bold font-mono">
                          {dashboardStats.totalSetsThisWeek}
                        </span>
                      </div>
                      {dashboardStats.volumeChangePercent !== null && (
                        <span
                          className={`text-[10px] font-medium mt-0.5 ${
                            dashboardStats.volumeChangePercent > 0
                              ? "text-green-500"
                              : dashboardStats.volumeChangePercent < 0
                                ? "text-red-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {dashboardStats.volumeChangePercent > 0 ? "↑" : dashboardStats.volumeChangePercent < 0 ? "↓" : ""}
                          {Math.abs(dashboardStats.volumeChangePercent)}% vs last wk
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-2 font-medium">Sets</span>
                  </>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/20 via-amber-500/40 to-amber-500/20" />
            </Card>

            <Card className="relative overflow-hidden">
              <div className="p-4 flex flex-col items-center justify-center min-h-[88px]">
                <div className="h-12 flex items-center justify-center">
                  <StreakBadge weeks={dashboardStats.currentStreakWeeks} size="md" />
                </div>
                <span className="text-[11px] text-muted-foreground mt-2 font-medium">Week Streak</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500/20 via-orange-500/40 to-orange-500/20" />
            </Card>
          </div>
        )}

        {dashboardStats && dashboardStats.recentPRs.length > 0 && (
          <RecentPrCard prs={dashboardStats.recentPRs} />
        )}

        {dashboardStats && dashboardStats.trainingLoad.total > 0 && (
          <TrainingLoadCard
            total={dashboardStats.trainingLoad.total}
            liftingLoad={dashboardStats.trainingLoad.liftingLoad}
            cardioLoad={dashboardStats.trainingLoad.cardioLoad}
            liftingPercent={dashboardStats.trainingLoad.liftingPercent}
            cardioPercent={dashboardStats.trainingLoad.cardioPercent}
            changePercent={dashboardStats.trainingLoad.changePercent}
            profile={dashboardStats.trainingProfile}
          />
        )}

        {dashboardStats?.cardioSummary && (
          <CardioSummaryCard
            totalMinutes={dashboardStats.cardioSummary.totalMinutes}
            totalDistance={dashboardStats.cardioSummary.totalDistance}
            distanceUnit={dashboardStats.cardioSummary.distanceUnit}
            avgRpe={dashboardStats.cardioSummary.avgRpe}
            topModality={dashboardStats.cardioSummary.topModality}
          />
        )}

        {!canGenerate && !hasReport && ctaState.totalWorkouts === 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Getting Started</p>
                <p className="text-xs text-muted-foreground">{ctaState.message}</p>
              </div>
            </div>
          </Card>
        )}

        {canGenerate && !latestReport && (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Analysis Ready</p>
                <p className="text-xs text-muted-foreground">{ctaState.message}</p>
              </div>
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating ? "Analyzing..." : "Generate Analysis"}
            </Button>
          </Card>
        )}

        {latestReport && (
          <div className="space-y-4">
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
                      {latestReport.summary}
                    </p>
                  )}
                </div>
              </button>
              {hasReport && (
                <div className="px-4 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={handleGenerateReport}
                    disabled={isGenerating || !canGenerate}
                  >
                    <Sparkles className="h-3 w-3" />
                    {isGenerating 
                      ? "Generating..." 
                      : canGenerate 
                        ? "Refresh Analysis" 
                        : "Log a workout to refresh"}
                  </Button>
                </div>
              )}
            </Card>

            {latestReport.type === "full" && (
              <>
                {dashboardStats?.trainingProfile !== "cardio_focused" && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Volume by Muscle</h3>
                    <VolumeBarChart
                      data={latestReport.chartData.volumeByMuscle.reduce(
                        (acc, item) => {
                          const existing = acc.find((a) => a.muscle === item.muscle);
                          if (existing) {
                            existing.sets += item.sets;
                          } else {
                            acc.push({ muscle: item.muscle, sets: item.sets });
                          }
                          return acc;
                        },
                        [] as Array<{ muscle: string; sets: number }>
                      )}
                      className="min-h-[220px]"
                      onMuscleClick={setSelectedMuscle}
                    />
                  </Card>
                )}

                {dashboardStats?.trainingProfile !== "cardio_focused" && (
                  <div className="grid grid-cols-2 gap-3">
                    <ScoreCard
                      label="Volume"
                      score={latestReport.scores.volumeAdherence}
                      description="Target adherence"
                    />
                    <ScoreCard
                      label="Intensity"
                      score={latestReport.scores.intensityManagement}
                      description="RPE management"
                    />
                    <ScoreCard
                      label="Balance"
                      score={latestReport.scores.muscleBalance}
                      description="Push/pull ratio"
                    />
                    <ScoreCard
                      label="Recovery"
                      score={latestReport.scores.recoveryBalance}
                      description="Fatigue signals"
                    />
                  </div>
                )}

                {dashboardStats?.trainingProfile !== "cardio_focused" &&
                  latestReport.chartData.rpeByWorkout.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">RPE Trend</h3>
                    <RpeTrendChart
                      data={latestReport.chartData.rpeByWorkout}
                      className="min-h-[180px]"
                    />
                  </Card>
                )}

                {dashboardStats?.trainingProfile !== "cardio_focused" &&
                  latestReport.chartData.exerciseTrends.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Exercise Trends</h3>
                    <ExerciseTrendChart
                      data={latestReport.chartData.exerciseTrends}
                      onExerciseClick={setSelectedExercise}
                    />
                  </Card>
                )}

                {latestReport.insights.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Insights</h3>
                    <div className="space-y-4">
                      {latestReport.insights.map((insight, i) => (
                        <InsightItem key={i} insight={insight} />
                      ))}
                    </div>
                  </Card>
                )}

                {latestReport.alerts.length > 0 && (
                  <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Alerts
                    </h3>
                    <div className="space-y-2">
                      {latestReport.alerts.map((alert, i) => (
                        <div key={i} className="text-sm text-muted-foreground">
                          {alert.message}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}

            {latestReport.type === "snapshot" && (
              <>
                {dashboardStats?.trainingProfile !== "cardio_focused" &&
                  latestReport.chartData?.volumeByMuscle && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Volume Distribution</h3>
                    <VolumeBarChart
                      data={latestReport.chartData.volumeByMuscle}
                      className="min-h-[200px]"
                      onMuscleClick={setSelectedMuscle}
                    />
                  </Card>
                )}

                {latestReport.historicalContext && (
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-4">
                      <div className="text-2xl font-bold font-mono text-primary">
                        {latestReport.historicalContext.totalWorkouts}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Workouts</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-2xl font-bold font-mono text-primary">
                        {latestReport.historicalContext.trainingAge}
                      </div>
                      <div className="text-xs text-muted-foreground">Training Age</div>
                    </Card>
                  </div>
                )}

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">This Week</h3>
                    {latestReport.historicalContext && (
                      <Badge
                        variant="outline"
                        className={
                          latestReport.historicalContext.consistencyRating === "excellent"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : latestReport.historicalContext.consistencyRating === "good"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : latestReport.historicalContext.consistencyRating === "moderate"
                                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                : "bg-muted text-muted-foreground"
                        }
                      >
                        {latestReport.historicalContext.consistencyRating.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {latestReport.weeklyHighlights && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Strongest Area</span>
                          <span className="font-medium capitalize">
                            {latestReport.weeklyHighlights.strongestArea}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Sets</span>
                          <span className="font-mono">{latestReport.weeklyHighlights.totalSets}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg Sets/Workout</span>
                          <span className="font-mono">
                            {latestReport.weeklyHighlights.avgSetsPerWorkout.toFixed(1)}
                          </span>
                        </div>
                        {latestReport.weeklyHighlights.standoutExercise && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Standout Exercise</span>
                            <span className="font-medium">
                              {latestReport.weeklyHighlights.standoutExercise}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Card>

                {latestReport.progressIndicators && latestReport.progressIndicators.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Progress</h3>
                    <div className="space-y-3">
                      {latestReport.progressIndicators.map((indicator, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              indicator.type === "milestone"
                                ? "bg-violet-500/10"
                                : indicator.type === "streak"
                                  ? "bg-green-500/10"
                                  : indicator.type === "pr_potential"
                                    ? "bg-amber-500/10"
                                    : "bg-blue-500/10"
                            }`}
                          >
                            <span className="text-base">
                              {indicator.type === "milestone"
                                ? "🏆"
                                : indicator.type === "streak"
                                  ? "🔥"
                                  : indicator.type === "pr_potential"
                                    ? "💪"
                                    : "📈"}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{indicator.title}</p>
                            <p className="text-xs text-muted-foreground">{indicator.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {latestReport.recommendations && latestReport.recommendations.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Recommendations</h3>
                    <div className="space-y-3">
                      {latestReport.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Badge
                            variant="outline"
                            className={
                              rec.priority === "high"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : rec.priority === "medium"
                                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                  : "bg-green-500/10 text-green-500 border-green-500/20"
                            }
                          >
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <div className="flex-1">
                            <span className="text-sm font-medium">{rec.area}</span>
                            <p className="text-xs text-muted-foreground">{rec.suggestion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {latestReport.lookingAhead && (
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <p className="text-sm text-center">🎯 {latestReport.lookingAhead}</p>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <MuscleDrawer muscle={selectedMuscle} onClose={() => setSelectedMuscle(null)} />
      <ExerciseHistorySheet exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
    </div>
  );
}

function InsightItem({
  insight,
}: {
  insight: { category: string; observation: string; recommendation: string; priority: string };
}) {
  const priorityIndicator = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-emerald-500",
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1.5">
        <div
          className={`h-2 w-2 rounded-full ${priorityIndicator[insight.priority as keyof typeof priorityIndicator] ?? "bg-muted"}`}
        />
        <div className="w-px flex-1 bg-border mt-2" />
      </div>
      <div className="flex-1 pb-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {insight.category}
        </span>
        <p className="text-sm mt-1 font-medium">{insight.observation}</p>
        <p className="text-sm text-muted-foreground mt-2">
          <span className="text-primary font-medium">Recommendation:</span> {insight.recommendation}
        </p>
      </div>
    </div>
  );
}
