import { useMemo } from "react";
import { Text, View } from "react-native";
import {
  DashPathEffect,
  Line as SkiaLine,
  LinearGradient,
  vec,
} from "@shopify/react-native-skia";
import { Area, CartesianChart, Line } from "victory-native";

import { useTheme } from "@/theme/theme-provider";

import { getChartFont } from "./chart-font";
import { formatRpeChartData, type RpeDatum } from "./transforms";

interface RpeTrendChartProps {
  data: RpeDatum[];
  /** Chart height in px; web uses min-h-[180px]. */
  height?: number;
}

// Port of apps/web/src/components/training-lab/charts/rpe-trend-chart.tsx.
// recharts AreaChart → victory-native Area (gradient fill) + Line (stroke),
// both in chart2, matching web's var(--chart-2). The dashed reference lines at
// RPE 6 and 8 use chart4 like web's ReferenceLine stroke="var(--chart-4)".
export function RpeTrendChart({ data, height = 180 }: RpeTrendChartProps) {
  const { colors } = useTheme();
  const font = useMemo(() => getChartFont(11), []);
  const formattedData = useMemo(() => formatRpeChartData(data), [data]);

  if (!data || data.length === 0) {
    return (
      <View className="h-[200px] items-center justify-center">
        <Text className="text-sm text-muted-foreground">
          No RPE data available
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height }}>
      <CartesianChart
        data={formattedData}
        xKey="displayDate"
        yKeys={["avgRpe"]}
        domain={{ y: [0, 10] }}
        padding={{ left: 0, right: 12, top: 12, bottom: 0 }}
        axisOptions={{
          font,
          labelColor: colors.mutedForeground,
          lineColor: colors.border,
        }}
      >
        {({ points, chartBounds, yScale }) => (
          <>
            {[6, 8].map((rpe) => (
              <SkiaLine
                key={rpe}
                p1={vec(chartBounds.left, yScale(rpe))}
                p2={vec(chartBounds.right, yScale(rpe))}
                color={colors.chart4}
                strokeWidth={1}
                opacity={0.5}
              >
                <DashPathEffect intervals={[3, 3]} />
              </SkiaLine>
            ))}
            <Area
              points={points.avgRpe}
              y0={chartBounds.bottom}
              curveType="monotoneX"
            >
              <LinearGradient
                start={vec(0, chartBounds.top)}
                end={vec(0, chartBounds.bottom)}
                colors={[`${colors.chart2}4d`, `${colors.chart2}00`]}
              />
            </Area>
            <Line
              points={points.avgRpe}
              color={colors.chart2}
              strokeWidth={2}
              curveType="monotoneX"
            />
          </>
        )}
      </CartesianChart>
    </View>
  );
}
