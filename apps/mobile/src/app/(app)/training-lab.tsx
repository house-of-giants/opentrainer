import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Dumbbell,
  FlaskConical,
  Sparkles,
  Timer,
} from "lucide-react-native";

import {
  CardioSummaryCard,
  ExerciseTrendChart,
  MuscleAnalyticsSection,
  ProgressRing,
  RecentPrCard,
  RpeTrendChart,
  StreakBadge,
  TrainingLoadCard,
  VolumeBarChart,
  aggregateVolumeByMuscle,
} from "@/components/training-lab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

// Port of apps/web/src/app/training-lab/page.tsx.
const AMBER = "#f59e0b"; // amber-500
const CYAN = "#06b6d4"; // cyan-500

export default function TrainingLabScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

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
      toast.error(
        error instanceof Error ? error.message : "Failed to generate analysis",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReport = () => doGenerateReport(7);

  if (ctaState === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="h-14 flex-row items-center gap-4 border-b border-border px-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-32" />
        </View>
        <View className="flex-1 gap-4 p-4">
          <View className="flex-row gap-3">
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
          </View>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </View>
      </SafeAreaView>
    );
  }

  if (!ctaState?.isPro) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <ScreenHeader onBack={() => router.back()} showFlask={false} />
        <View className="flex-1 items-center justify-center p-4">
          <FlaskConical size={64} color={colors.mutedForeground} />
          <View className="mb-3 mt-4 rounded-full bg-violet-500/10 px-3 py-1">
            <Text className="text-xs font-semibold text-violet-600">
              Free During Alpha
            </Text>
          </View>
          <Text className="mb-2 text-xl font-bold text-foreground">
            Training Lab
          </Text>
          <Text className="mb-4 text-center text-muted-foreground">
            Get AI-powered training insights — free while we&apos;re in alpha.
          </Text>
          <Button onPress={() => router.push("/(app)/(tabs)")}>
            Go to Dashboard
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const canGenerate = ctaState.canGenerate;
  const hasReport = ctaState.hasReport;
  const muscleAnalytics =
    dashboardStats === undefined
      ? undefined
      : (dashboardStats?.muscleAnalytics ?? null);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScreenHeader onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {dashboardStats && (
          <View className="flex-row gap-2">
            <StatCard label="Workouts" accentClass="bg-primary/30">
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
            </StatCard>

            {dashboardStats.trainingProfile === "cardio_focused" ? (
              <StatCard label="Minutes" accentClass="bg-amber-500/30">
                <View className="h-12 flex-row items-center justify-center gap-1.5">
                  <Timer size={20} color={CYAN} />
                  <Text className="font-mono text-2xl font-bold text-foreground">
                    {dashboardStats.cardioSummary?.totalMinutes ?? 0}
                  </Text>
                </View>
              </StatCard>
            ) : (
              <StatCard label="Sets" accentClass="bg-amber-500/30">
                <View className="h-12 items-center justify-center">
                  <View className="flex-row items-center gap-1.5">
                    <Dumbbell size={20} color={AMBER} />
                    <Text className="font-mono text-2xl font-bold text-foreground">
                      {dashboardStats.totalSetsThisWeek}
                    </Text>
                  </View>
                  {dashboardStats.volumeChangePercent !== null && (
                    <Text
                      className={cn(
                        "mt-0.5 text-[10px] font-medium",
                        dashboardStats.volumeChangePercent > 0
                          ? "text-green-500"
                          : dashboardStats.volumeChangePercent < 0
                            ? "text-red-500"
                            : "text-muted-foreground",
                      )}
                    >
                      {dashboardStats.volumeChangePercent > 0
                        ? "↑"
                        : dashboardStats.volumeChangePercent < 0
                          ? "↓"
                          : ""}
                      {Math.abs(dashboardStats.volumeChangePercent)}% vs last wk
                    </Text>
                  )}
                </View>
              </StatCard>
            )}

            <StatCard label="Week Streak" accentClass="bg-orange-500/30">
              <View className="h-12 items-center justify-center">
                <StreakBadge weeks={dashboardStats.currentStreakWeeks} size="md" />
              </View>
            </StatCard>
          </View>
        )}

        {dashboardStats && dashboardStats.recentPRs.length > 0 && (
          <RecentPrCard prs={dashboardStats.recentPRs} />
        )}

        {dashboardStats && dashboardStats.trainingLoad.total > 0 && (
          <TrainingLoadCard
            total={dashboardStats.trainingLoad.total}
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

        <MuscleAnalyticsSection analytics={muscleAnalytics} />

        {!canGenerate && !hasReport && ctaState.totalWorkouts === 0 && (
          <Card className="p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Dumbbell size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  Getting Started
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {ctaState.message}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {canGenerate && !latestReport && (
          <Card className="p-4">
            <View className="mb-3 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Sparkles size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  Analysis Ready
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {ctaState.message}
                </Text>
              </View>
            </View>
            <Button
              className="w-full"
              onPress={handleGenerateReport}
              disabled={isGenerating}
            >
              <Sparkles size={16} color={colors.primaryForeground} />
              <Text className="text-sm font-medium text-primary-foreground">
                {isGenerating ? "Analyzing..." : "Generate Analysis"}
              </Text>
            </Button>
          </Card>
        )}

        {latestReport && (
          <View className="gap-4">
            <Text className="font-semibold text-foreground">AI Report</Text>
            <Card className="overflow-hidden">
              <Pressable
                accessibilityRole="button"
                className="w-full flex-row items-start gap-3 p-4"
                onPress={() => setSummaryExpanded(!summaryExpanded)}
              >
                <View className="mt-0.5 h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles size={16} color={colors.primary} />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-foreground">
                      AI Summary
                    </Text>
                    {summaryExpanded ? (
                      <ChevronUp size={16} color={colors.mutedForeground} />
                    ) : (
                      <ChevronDown size={16} color={colors.mutedForeground} />
                    )}
                  </View>
                  {summaryExpanded && (
                    <Text className="text-sm leading-relaxed text-muted-foreground">
                      {latestReport.summary}
                    </Text>
                  )}
                </View>
              </Pressable>
              {hasReport && (
                <View className="px-4 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onPress={handleGenerateReport}
                    disabled={isGenerating || !canGenerate}
                  >
                    <Sparkles size={12} color={colors.foreground} />
                    <Text className="text-sm font-medium text-foreground">
                      {isGenerating
                        ? "Generating..."
                        : canGenerate
                          ? "Refresh Analysis"
                          : "Log a workout to refresh"}
                    </Text>
                  </Button>
                </View>
              )}
            </Card>

            {latestReport.type === "full" && (
              <>
                {dashboardStats?.trainingProfile !== "cardio_focused" && (
                  <Card className="p-4">
                    <Text className="mb-4 font-semibold text-foreground">
                      Report-period muscle volume
                    </Text>
                    <VolumeBarChart
                      data={aggregateVolumeByMuscle(
                        latestReport.chartData.volumeByMuscle,
                      )}
                      height={220}
                    />
                  </Card>
                )}

                {dashboardStats?.trainingProfile !== "cardio_focused" &&
                  latestReport.chartData.rpeByWorkout.length > 0 && (
                    <Card className="p-4">
                      <Text className="mb-4 font-semibold text-foreground">
                        RPE Trend
                      </Text>
                      <RpeTrendChart
                        data={latestReport.chartData.rpeByWorkout}
                        height={180}
                      />
                    </Card>
                  )}

                {dashboardStats?.trainingProfile !== "cardio_focused" &&
                  latestReport.chartData.exerciseTrends.length > 0 && (
                    <Card className="p-4">
                      <Text className="mb-4 font-semibold text-foreground">
                        Exercise Trends
                      </Text>
                      <ExerciseTrendChart
                        data={latestReport.chartData.exerciseTrends}
                        weightUnit={latestReport.chartData.weightUnit}
                      />
                    </Card>
                  )}

                {latestReport.insights.length > 0 && (
                  <Card className="p-4">
                    <Text className="mb-4 font-semibold text-foreground">
                      Insights
                    </Text>
                    <View className="gap-4">
                      {latestReport.insights.map((insight, i) => (
                        <InsightItem key={i} insight={insight} />
                      ))}
                    </View>
                  </Card>
                )}

                {latestReport.alerts.length > 0 && (
                  <Card className="border-amber-500/30 bg-amber-500/10 p-4">
                    <View className="mb-3 flex-row items-center gap-2">
                      <AlertTriangle size={16} color={AMBER} />
                      <Text className="font-semibold text-foreground">Alerts</Text>
                    </View>
                    <View className="gap-2">
                      {latestReport.alerts.map((alert, i) => (
                        <Text key={i} className="text-sm text-muted-foreground">
                          {alert.message}
                        </Text>
                      ))}
                    </View>
                  </Card>
                )}
              </>
            )}

            {latestReport.type === "snapshot" && (
              <>
                {dashboardStats?.trainingProfile !== "cardio_focused" &&
                  latestReport.chartData?.volumeByMuscle && (
                    <Card className="p-4">
                      <Text className="mb-4 font-semibold text-foreground">
                        Report-period muscle volume
                      </Text>
                      <VolumeBarChart
                        data={latestReport.chartData.volumeByMuscle}
                        height={200}
                      />
                    </Card>
                  )}

                {latestReport.historicalContext && (
                  <View className="flex-row gap-3">
                    <Card className="flex-1 p-4">
                      <Text className="font-mono text-2xl font-bold text-primary">
                        {latestReport.historicalContext.totalWorkouts}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        Total Workouts
                      </Text>
                    </Card>
                    <Card className="flex-1 p-4">
                      <Text className="font-mono text-2xl font-bold text-primary">
                        {latestReport.historicalContext.trainingAge}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        Training Age
                      </Text>
                    </Card>
                  </View>
                )}

                <Card className="p-4">
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="font-semibold text-foreground">This Week</Text>
                    {latestReport.historicalContext && (
                      <ConsistencyBadge
                        rating={latestReport.historicalContext.consistencyRating}
                      />
                    )}
                  </View>
                  {latestReport.weeklyHighlights && (
                    <View className="gap-2">
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted-foreground">
                          Strongest Area
                        </Text>
                        <Text className="text-sm font-medium capitalize text-foreground">
                          {latestReport.weeklyHighlights.strongestArea}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted-foreground">
                          Total Sets
                        </Text>
                        <Text className="font-mono text-sm text-foreground">
                          {latestReport.weeklyHighlights.totalSets}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted-foreground">
                          Avg Sets/Workout
                        </Text>
                        <Text className="font-mono text-sm text-foreground">
                          {latestReport.weeklyHighlights.avgSetsPerWorkout.toFixed(1)}
                        </Text>
                      </View>
                      {latestReport.weeklyHighlights.standoutExercise && (
                        <View className="flex-row justify-between">
                          <Text className="text-sm text-muted-foreground">
                            Standout Exercise
                          </Text>
                          <Text className="text-sm font-medium text-foreground">
                            {latestReport.weeklyHighlights.standoutExercise}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </Card>

                {latestReport.progressIndicators &&
                  latestReport.progressIndicators.length > 0 && (
                    <Card className="p-4">
                      <Text className="mb-4 font-semibold text-foreground">
                        Progress
                      </Text>
                      <View className="gap-3">
                        {latestReport.progressIndicators.map((indicator, i) => (
                          <View key={i} className="flex-row items-start gap-3">
                            <View
                              className={cn(
                                "h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                indicator.type === "milestone"
                                  ? "bg-violet-500/10"
                                  : indicator.type === "streak"
                                    ? "bg-green-500/10"
                                    : indicator.type === "pr_potential"
                                      ? "bg-amber-500/10"
                                      : "bg-blue-500/10",
                              )}
                            >
                              <Text className="text-base">
                                {indicator.type === "milestone"
                                  ? "🏆"
                                  : indicator.type === "streak"
                                    ? "🔥"
                                    : indicator.type === "pr_potential"
                                      ? "💪"
                                      : "📈"}
                              </Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-foreground">
                                {indicator.title}
                              </Text>
                              <Text className="text-xs text-muted-foreground">
                                {indicator.message}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </Card>
                  )}

                {latestReport.recommendations &&
                  latestReport.recommendations.length > 0 && (
                    <Card className="p-4">
                      <Text className="mb-3 font-semibold text-foreground">
                        Recommendations
                      </Text>
                      <View className="gap-3">
                        {latestReport.recommendations.map((rec, i) => (
                          <View key={i} className="flex-row items-start gap-3">
                            <PriorityBadge priority={rec.priority} />
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-foreground">
                                {rec.area}
                              </Text>
                              <Text className="text-xs text-muted-foreground">
                                {rec.suggestion}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </Card>
                  )}

                {latestReport.lookingAhead && (
                  <Card className="border-primary/20 bg-primary/10 p-4">
                    <Text className="text-center text-sm text-foreground">
                      🎯 {latestReport.lookingAhead}
                    </Text>
                  </Card>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScreenHeader({
  onBack,
  showFlask = true,
}: {
  onBack: () => void;
  showFlask?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View className="h-14 flex-row items-center gap-3 border-b border-border px-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        onPress={onBack}
      >
        <ChevronLeft size={22} color={colors.foreground} />
      </Pressable>
      <View className="flex-row items-center gap-2">
        {showFlask && <FlaskConical size={20} color={colors.primary} />}
        <Text className="text-lg font-semibold text-foreground">Training Lab</Text>
      </View>
    </View>
  );
}

function StatCard({
  label,
  accentClass,
  children,
}: {
  label: string;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-h-[88px] flex-1 items-center justify-center overflow-hidden p-4">
      {children}
      <Text className="mt-2 text-[11px] font-medium text-muted-foreground">
        {label}
      </Text>
      <View className={cn("absolute bottom-0 left-0 right-0 h-1", accentClass)} />
    </Card>
  );
}

function ConsistencyBadge({
  rating,
}: {
  rating: "excellent" | "good" | "moderate" | "developing";
}) {
  const badgeClass =
    rating === "excellent"
      ? "bg-green-500/10 border-green-500/20"
      : rating === "good"
        ? "bg-blue-500/10 border-blue-500/20"
        : rating === "moderate"
          ? "bg-yellow-500/10 border-yellow-500/20"
          : "bg-muted";
  const textClass =
    rating === "excellent"
      ? "text-green-500"
      : rating === "good"
        ? "text-blue-500"
        : rating === "moderate"
          ? "text-yellow-500"
          : "text-muted-foreground";

  return (
    <Badge variant="outline" className={badgeClass} textClassName={textClass}>
      {rating.toUpperCase()}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const badgeClass =
    priority === "high"
      ? "bg-red-500/10 border-red-500/20"
      : priority === "medium"
        ? "bg-yellow-500/10 border-yellow-500/20"
        : "bg-green-500/10 border-green-500/20";
  const textClass =
    priority === "high"
      ? "text-red-500"
      : priority === "medium"
        ? "text-yellow-500"
        : "text-green-500";

  return (
    <Badge variant="outline" className={badgeClass} textClassName={textClass}>
      {priority.toUpperCase()}
    </Badge>
  );
}

function InsightItem({
  insight,
}: {
  insight: {
    category: string;
    observation: string;
    recommendation: string;
    priority: string;
  };
}) {
  const priorityIndicator: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-emerald-500",
  };

  return (
    <View className="flex-row gap-3">
      <View className="items-center pt-1.5">
        <View
          className={cn(
            "h-2 w-2 rounded-full",
            priorityIndicator[insight.priority] ?? "bg-muted",
          )}
        />
        <View className="mt-2 w-px flex-1 bg-border" />
      </View>
      <View className="flex-1 pb-4">
        <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {insight.category}
        </Text>
        <Text className="mt-1 text-sm font-medium text-foreground">
          {insight.observation}
        </Text>
        <Text className="mt-2 text-sm text-muted-foreground">
          <Text className="font-medium text-primary">Recommendation:</Text>{" "}
          {insight.recommendation}
        </Text>
      </View>
    </View>
  );
}
