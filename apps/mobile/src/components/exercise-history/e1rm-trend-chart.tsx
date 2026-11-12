import { useMemo } from "react";
import { View } from "react-native";
import { CartesianChart, Line, Scatter } from "victory-native";
import type { WeightUnit } from "@opentrainer/lib/units";

import { getChartFont } from "@/components/training-lab/charts/chart-font";
import { useTheme } from "@/theme/theme-provider";

type E1rmPoint = { date: string; e1rm: number };

interface E1rmTrendChartProps {
  data: E1rmPoint[];
  unit: WeightUnit;
  height?: number;
}

function shortDate(time: number) {
  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Same victory-native + Skia setup as the Training Lab RPE chart. Time is the
// x value so sessions keep their real spacing.
export function E1rmTrendChart({ data, unit, height = 180 }: E1rmTrendChartProps) {
  const { colors } = useTheme();
  const font = useMemo(() => getChartFont(11), []);
  const points = useMemo(
    () => data.map((point) => ({ time: Date.parse(point.date), e1rm: point.e1rm })),
    [data],
  );

  const first = data[0];
  const last = data[data.length - 1];
  const summary = first
    ? `e1RM over time: ${first.e1rm} ${unit} on ${shortDate(Date.parse(first.date))}, ${last.e1rm} ${unit} on ${shortDate(Date.parse(last.date))}, ${data.length} sessions.`
    : "No e1RM data.";

  return (
    <View
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
    >
      <CartesianChart
        data={points}
        xKey="time"
        yKeys={["e1rm"]}
        domainPadding={{ top: 16, bottom: 16, left: 8, right: 8 }}
        padding={{ left: 0, right: 12, top: 12, bottom: 0 }}
        axisOptions={{
          font,
          tickCount: { x: 4, y: 4 },
          labelColor: colors.mutedForeground,
          lineColor: colors.border,
          formatXLabel: (time) => shortDate(time),
          formatYLabel: (value) => `${Math.round(value)}`,
        }}
      >
        {({ points: chartPoints }) => (
          <>
            <Line points={chartPoints.e1rm} color={colors.chart1} strokeWidth={2} />
            <Scatter points={chartPoints.e1rm} radius={3} color={colors.chart1} />
          </>
        )}
      </CartesianChart>
    </View>
  );
}
