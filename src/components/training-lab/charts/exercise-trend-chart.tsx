"use client";

import { Line, LineChart } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { WeightUnit } from "@/lib/units";

export interface ExerciseTrendData {
  exercise: string;
  sessions: number;
  trend: "up" | "down" | "flat";
  topWeight: number;
  weightUnit?: WeightUnit;
  avgRpe: number;
}

interface ExerciseTrendChartProps {
  data: ExerciseTrendData[];
  className?: string;
  weightUnit?: WeightUnit;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function TrendBadge({ trend }: { trend: "up" | "down" | "flat" }) {
  const colors = {
    up: "bg-green-500/10 text-green-500 border-green-500/20",
    down: "bg-red-500/10 text-red-500 border-red-500/20",
    flat: "bg-muted text-muted-foreground border-muted-foreground/20",
  };
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${colors[trend]}`}>
      <TrendIcon trend={trend} />
      {trend === "up" ? "Progressing" : trend === "down" ? "Declining" : "Steady"}
    </span>
  );
}

export function ExerciseTrendChart({
  data,
  className,
  weightUnit,
}: ExerciseTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No exercise trend data available
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {data.slice(0, 6).map((exercise) => {
          const topWeight = formatTopWeight(exercise.topWeight, exercise.weightUnit ?? weightUnit);

          return (
            <article
              key={exercise.exercise}
              className="flex w-full items-center justify-between rounded-lg border bg-card p-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{exercise.exercise}</span>
                  <TrendBadge trend={exercise.trend} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{exercise.sessions} sessions</span>
                  {exercise.avgRpe > 0 && (
                    <span>Avg RPE: {exercise.avgRpe.toFixed(1)}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {exercise.topWeight > 0 ? (
                  <>
                    <div className="font-mono font-semibold">{topWeight.label}</div>
                    {topWeight.unitUnavailable && (
                      <div className="text-xs text-muted-foreground">Stored unit unavailable</div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
                <div className="text-xs text-muted-foreground">Top weight</div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function formatTopWeight(
  topWeight: number,
  weightUnit: WeightUnit | undefined
): { label: string; unitUnavailable: boolean } {
  const formattedWeight = `${topWeight}`;

  if (topWeight <= 0) {
    return { label: "—", unitUnavailable: false };
  }

  if (!weightUnit) {
    return { label: formattedWeight, unitUnavailable: true };
  }

  return { label: `${formattedWeight} ${weightUnit}`, unitUnavailable: false };
}

export function ExerciseSparkline({ 
  data,
  className 
}: { 
  data: number[];
  className?: string;
}) {
  if (!data || data.length < 2) return null;

  const chartData = data.map((value, index) => ({ index, value }));
  const config = {
    value: { label: "Weight", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className={className ?? "h-[40px] w-[100px]"}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
