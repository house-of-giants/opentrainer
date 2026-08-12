import { Text, View } from "react-native";
import Body, { type ExtendedBodyPart } from "react-native-body-highlighter";
import { Info } from "lucide-react-native";
import type {
  MuscleAnalyticsResult,
  MuscleWorkloadDatum,
} from "@opentrainer/backend/convex/lib/muscleAnalytics";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

import {
  formatDateRange,
  formatLastTrained,
  formatPlural,
  getActiveMuscles,
  getBodyMapParts,
  getWorkloadRows,
} from "./muscle-analytics-transforms";

type MuscleAnalyticsSectionProps = {
  analytics: MuscleAnalyticsResult | null | undefined;
};

// Port of apps/web/src/components/training-lab/muscle-analytics-section.tsx.
// react-muscle-highlighter → react-native-body-highlighter v3 (same slug API);
// the web CSS-variable fills become theme hex colors. The web <table> becomes
// flex rows, and the side-by-side lg: layout stacks vertically on mobile.
export function MuscleAnalyticsSection({ analytics }: MuscleAnalyticsSectionProps) {
  if (analytics === undefined) {
    return <MuscleAnalyticsSkeleton />;
  }

  if (analytics === null) {
    return null;
  }

  const rows = getWorkloadRows(analytics);
  const mappedMusclesTrained = rows.filter(
    (row) => !row.isUnmapped && row.setsThisWeek > 0,
  ).length;
  const activeMuscles = getActiveMuscles(rows);

  return (
    <View className="gap-3">
      <View className="gap-3">
        <View>
          <Text className="font-semibold text-foreground">Muscle Workload</Text>
          <Text className="text-xs text-muted-foreground">
            {formatDateRange(analytics.weekStart, analytics.weekEnd)}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Badge variant="outline">
            {formatPlural(analytics.totalWorkingSets, "completed working set")}
          </Badge>
          <Badge variant="outline">
            {formatPlural(mappedMusclesTrained, "mapped muscle group")}
          </Badge>
        </View>
      </View>

      <Card className="p-4">
        <View className="gap-5">
          <MuscleBodyMap activeMuscles={activeMuscles} />
          {rows.length > 0 ? (
            <MuscleWorkloadTable rows={rows} now={analytics.generatedAt} />
          ) : (
            <EmptyWorkloadState />
          )}
        </View>

        <View className="mt-4 flex-row gap-2 rounded-md border border-border bg-muted/35 p-3">
          <InfoIcon />
          <View className="flex-1 gap-1">
            <Text className="text-xs leading-relaxed text-muted-foreground">
              Working sets only. A set is counted for each mapped muscle, so
              compound exercises may appear in multiple rows.
            </Text>
            <Text className="text-xs leading-relaxed text-muted-foreground">
              Last trained comes only from logged workouts and is not a readiness
              score.
            </Text>
            {analytics.unmappedWorkingSets > 0 && (
              <Text className="text-xs leading-relaxed text-muted-foreground">
                {formatPlural(analytics.unmappedWorkingSets, "working set")}{" "}
                {analytics.unmappedWorkingSets === 1 ? "is" : "are"} Unmapped
                because the exercise has no muscle groups yet.
              </Text>
            )}
          </View>
        </View>
      </Card>
    </View>
  );
}

function InfoIcon() {
  const { colors } = useTheme();
  return (
    <View className="mt-0.5">
      <Info size={14} color={colors.mutedForeground} />
    </View>
  );
}

function MuscleWorkloadTable({
  rows,
  now,
}: {
  rows: MuscleWorkloadDatum[];
  now: number;
}) {
  return (
    <View>
      <View className="flex-row border-b border-border pb-2">
        <Text className="flex-1 pr-3 text-xs font-medium text-muted-foreground">
          Muscle
        </Text>
        <Text className="w-24 px-3 text-right text-xs font-medium text-muted-foreground">
          Sets this week
        </Text>
        <Text className="w-24 pl-3 text-right text-xs font-medium text-muted-foreground">
          Last trained
        </Text>
      </View>
      {rows.map((row) => (
        <View
          key={row.muscle}
          className="flex-row items-center border-b border-border py-2.5"
        >
          <View className="min-w-0 flex-1 flex-row items-center gap-2 pr-3">
            <View
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                row.setsThisWeek > 0 ? "bg-primary" : "bg-muted-foreground/35",
              )}
            />
            <Text numberOfLines={1} className="shrink text-sm font-medium text-foreground">
              {row.label}
            </Text>
            {row.isUnmapped && (
              <Badge variant="outline" textClassName="text-[10px]">
                Unmapped
              </Badge>
            )}
          </View>
          <Text className="w-24 px-3 text-right font-mono text-sm text-foreground">
            {row.setsThisWeek.toLocaleString()}
          </Text>
          <Text className="w-24 pl-3 text-right text-sm text-muted-foreground">
            {formatLastTrained(row, now)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MuscleBodyMap({ activeMuscles }: { activeMuscles: Set<string> }) {
  const { colors } = useTheme();
  const bodyMapParts = getBodyMapParts(activeMuscles, {
    active: colors.primary,
    inactive: colors.muted,
    stroke: colors.background,
  });

  return (
    <View className="rounded-md border border-border bg-background p-3">
      <View className="flex-row justify-around gap-3">
        <BodyView label="Front" side="front" bodyMapParts={bodyMapParts} />
        <BodyView label="Back" side="back" bodyMapParts={bodyMapParts} />
      </View>
      <Text className="mt-2 text-center text-xs text-muted-foreground">
        Highlighted regions have at least one mapped working-set exposure this
        week.
      </Text>
    </View>
  );
}

function BodyView({
  label,
  side,
  bodyMapParts,
}: {
  label: string;
  side: "front" | "back";
  bodyMapParts: readonly ExtendedBodyPart[];
}) {
  const { colors } = useTheme();

  return (
    <View className="items-center gap-2">
      <Text className="text-center text-xs font-medium text-muted-foreground">
        {label}
      </Text>
      <Body
        data={bodyMapParts as ExtendedBodyPart[]}
        side={side}
        gender="male"
        scale={0.7}
        border={colors.border}
        defaultFill={colors.muted}
        defaultStroke={colors.background}
        defaultStrokeWidth={2}
      />
    </View>
  );
}

function EmptyWorkloadState() {
  return (
    <View className="min-h-[190px] items-center justify-center rounded-md border border-dashed border-border p-4">
      <Text className="text-sm font-medium text-foreground">
        No muscle workload yet
      </Text>
      <Text className="mt-1 max-w-[280px] text-center text-xs leading-relaxed text-muted-foreground">
        No completed strength working sets are logged for this Monday-starting
        week.
      </Text>
    </View>
  );
}

function MuscleAnalyticsSkeleton() {
  return (
    <View className="gap-3">
      <View className="flex-row items-end justify-between">
        <View className="gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-32" />
        </View>
        <View className="flex-row gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </View>
      </View>
      <Card className="p-4">
        <View className="gap-5">
          <Skeleton className="h-[240px] w-full" />
          <Skeleton className="h-[240px] w-full" />
        </View>
      </Card>
    </View>
  );
}
