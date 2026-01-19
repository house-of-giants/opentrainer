"use client";

import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface RpeData {
  date: string;
  avgRpe: number;
}

interface RpeTrendChartProps {
  data: RpeData[];
  className?: string;
}

const chartConfig = {
  avgRpe: {
    label: "Average RPE",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function RpeTrendChart({ data, className }: RpeTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No RPE data available
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ChartContainer config={chartConfig} className={className ?? "min-h-[200px] w-full"}>
      <AreaChart
        accessibilityLayer
        data={formattedData}
        margin={{ left: 0, right: 12, top: 12, bottom: 0 }}
      >
        <defs>
          <linearGradient id="rpeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-avgRpe)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-avgRpe)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="displayDate"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          domain={[0, 10]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          width={30}
        />
        <ReferenceLine
          y={6}
          stroke="var(--chart-4)"
          strokeDasharray="3 3"
          strokeOpacity={0.5}
        />
        <ReferenceLine
          y={8}
          stroke="var(--chart-4)"
          strokeDasharray="3 3"
          strokeOpacity={0.5}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value) => [`RPE ${Number(value).toFixed(1)}`, ""]}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="avgRpe"
          stroke="var(--color-avgRpe)"
          strokeWidth={2}
          fill="url(#rpeGradient)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
