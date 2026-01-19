"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface Scores {
  volumeAdherence: number;
  intensityManagement: number;
  muscleBalance: number;
  recoveryBalance: number;
}

interface ScoreRadialChartProps {
  scores: Scores;
  className?: string;
}

const chartConfig = {
  score: {
    label: "Score",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ScoreRadialChart({ scores, className }: ScoreRadialChartProps) {
  const chartData = [
    { category: "Volume", score: scores.volumeAdherence, fullMark: 100 },
    { category: "Intensity", score: scores.intensityManagement, fullMark: 100 },
    { category: "Balance", score: scores.muscleBalance, fullMark: 100 },
    { category: "Recovery", score: scores.recoveryBalance, fullMark: 100 },
  ];

  return (
    <ChartContainer config={chartConfig} className={className ?? "min-h-[250px] w-full"}>
      <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid 
          gridType="polygon"
          stroke="var(--border)"
        />
        <PolarAngleAxis 
          dataKey="category" 
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <ChartTooltip 
          content={<ChartTooltipContent indicator="line" />}
          formatter={(value) => [`${value}/100`, "Score"]}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="var(--color-score)"
          fill="var(--color-score)"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </RadarChart>
    </ChartContainer>
  );
}

interface ScoreCardProps {
  label: string;
  score: number;
  description?: string;
}

export function ScoreCard({ label, score, description }: ScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/30"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className={getScoreColor(score)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold font-mono ${getScoreColor(score)}`}>
            {score}
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
    </div>
  );
}
