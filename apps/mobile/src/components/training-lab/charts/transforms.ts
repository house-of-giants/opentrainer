import type { WeightUnit } from "@opentrainer/lib/units";

// Pure data transforms shared by the Training Lab charts. Kept free of any
// react-native / skia imports so they can be unit-tested directly. Each
// function mirrors the equivalent web logic exactly:
// - aggregateVolumeByMuscle: apps/web/src/app/training-lab/page.tsx (reduce)
// - prepareVolumeChartData: apps/web/src/components/training-lab/charts/volume-bar-chart.tsx
// - formatRpeChartData: apps/web/src/components/training-lab/charts/rpe-trend-chart.tsx
// - formatTopWeight: apps/web/src/components/training-lab/charts/exercise-trend-chart.tsx

// Note: type aliases (not interfaces) so the chart data satisfies
// victory-native's Record<string, unknown> constraint structurally.
export type VolumeDatum = {
  muscle: string;
  sets: number;
};

/** Collapses weekly volumeByMuscle rows into one total per muscle. */
export function aggregateVolumeByMuscle(
  data: { muscle: string; sets: number }[],
): VolumeDatum[] {
  return data.reduce((acc, item) => {
    const existing = acc.find((a) => a.muscle === item.muscle);
    if (existing) {
      existing.sets += item.sets;
    } else {
      acc.push({ muscle: item.muscle, sets: item.sets });
    }
    return acc;
  }, [] as VolumeDatum[]);
}

/** Sorts by sets desc, keeps the top 8 muscles, capitalizes labels. */
export function prepareVolumeChartData(data: VolumeDatum[]): VolumeDatum[] {
  return [...data]
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      muscle: item.muscle.charAt(0).toUpperCase() + item.muscle.slice(1),
    }));
}

export type RpeDatum = {
  date: string;
  avgRpe: number;
};

export type RpeChartDatum = RpeDatum & {
  displayDate: string;
};

/** Adds the short "Aug 11"-style label the web chart shows on the X axis. */
export function formatRpeChartData(data: RpeDatum[]): RpeChartDatum[] {
  return data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));
}

export function formatTopWeight(
  topWeight: number,
  weightUnit: WeightUnit | undefined,
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
