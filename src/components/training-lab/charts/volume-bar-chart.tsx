"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface VolumeData {
  muscle: string;
  sets: number;
}

interface VolumeBarChartProps {
  data: VolumeData[];
  className?: string;
  onMuscleClick?: (muscle: string) => void;
}

const chartConfig = {
  sets: {
    label: "Sets",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function VolumeBarChart({ data, className, onMuscleClick }: VolumeBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No volume data available
      </div>
    );
  }

  const sortedData = [...data]
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      muscle: item.muscle.charAt(0).toUpperCase() + item.muscle.slice(1),
    }));

  return (
    <ChartContainer config={chartConfig} className={className ?? "min-h-[200px] w-full"}>
      <BarChart
        accessibilityLayer
        data={sortedData}
        layout="vertical"
        margin={{ left: 0, right: 12 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <YAxis
          dataKey="muscle"
          type="category"
          tickLine={false}
          axisLine={false}
          width={80}
          tick={{ fontSize: 12 }}
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Bar
          dataKey="sets"
          fill="var(--color-sets)"
          radius={[0, 4, 4, 0]}
          className={onMuscleClick ? "cursor-pointer" : ""}
          onClick={(data) => {
            const payload = data?.payload as VolumeData | undefined;
            if (onMuscleClick && payload?.muscle) {
              onMuscleClick(payload.muscle.toLowerCase());
            }
          }}
        />
      </BarChart>
    </ChartContainer>
  );
}
