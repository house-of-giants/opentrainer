import { useMemo } from "react";
import { Text, View } from "react-native";
import { CartesianChart, HorizontalBar } from "victory-native";

import { useTheme } from "@/theme/theme-provider";

import { getChartFont } from "./chart-font";
import { prepareVolumeChartData, type VolumeDatum } from "./transforms";

interface VolumeBarChartProps {
  data: VolumeDatum[];
  /** Chart height in px; web uses min-h-[200px]/min-h-[220px]. */
  height?: number;
}

// Port of apps/web/src/components/training-lab/charts/volume-bar-chart.tsx.
// recharts BarChart layout="vertical" → victory-native CartesianChart
// orientation="horizontal" + HorizontalBar. Series color is chart1, matching
// web's var(--chart-1). The web onMuscleClick handler is unused by the
// training-lab page and was not ported.
export function VolumeBarChart({ data, height = 220 }: VolumeBarChartProps) {
  const { colors } = useTheme();
  const font = useMemo(() => getChartFont(11), []);
  const sortedData = useMemo(() => prepareVolumeChartData(data), [data]);

  if (!data || data.length === 0) {
    return (
      <View className="h-[200px] items-center justify-center">
        <Text className="text-sm text-muted-foreground">
          No volume data available
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height }}>
      <CartesianChart
        data={sortedData}
        xKey="muscle"
        yKeys={["sets"]}
        orientation="horizontal"
        domainPadding={{ top: 12, bottom: 12 }}
        padding={{ left: 0, right: 12 }}
        axisOptions={{
          font,
          labelColor: colors.mutedForeground,
          lineColor: colors.border,
        }}
      >
        {({ points, chartBounds }) => (
          <HorizontalBar
            points={points.sets}
            chartBounds={chartBounds}
            color={colors.chart1}
            innerPadding={0.35}
            roundedCorners={{ topRight: 4, bottomRight: 4 }}
          />
        )}
      </CartesianChart>
    </View>
  );
}
