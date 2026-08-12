import {
  aggregateVolumeByMuscle,
  formatRpeChartData,
  formatTopWeight,
  prepareVolumeChartData,
} from "@/components/training-lab/charts/transforms";

import { fullReportFixture } from "../__fixtures__/training-lab";

describe("aggregateVolumeByMuscle", () => {
  it("sums sets per muscle across weeks, preserving first-seen order (web reduce)", () => {
    expect(
      aggregateVolumeByMuscle(fullReportFixture.chartData.volumeByMuscle),
    ).toEqual([
      { muscle: "chest", sets: 10 },
      { muscle: "back", sets: 8 },
    ]);
  });

  it("returns an empty array for no data", () => {
    expect(aggregateVolumeByMuscle([])).toEqual([]);
  });
});

describe("prepareVolumeChartData", () => {
  it("sorts descending by sets, keeps the top 8, and capitalizes labels", () => {
    const data = [
      { muscle: "chest", sets: 4 },
      { muscle: "back", sets: 9 },
      { muscle: "quads", sets: 7 },
      { muscle: "hamstrings", sets: 6 },
      { muscle: "glutes", sets: 5 },
      { muscle: "biceps", sets: 3 },
      { muscle: "triceps", sets: 2 },
      { muscle: "calves", sets: 1 },
      { muscle: "forearms", sets: 0 },
    ];

    const result = prepareVolumeChartData(data);

    expect(result).toHaveLength(8);
    expect(result[0]).toEqual({ muscle: "Back", sets: 9 });
    expect(result[1]).toEqual({ muscle: "Quads", sets: 7 });
    expect(result.map((d) => d.muscle)).not.toContain("Forearms");
  });

  it("does not mutate the input array", () => {
    const data = [
      { muscle: "chest", sets: 1 },
      { muscle: "back", sets: 2 },
    ];
    prepareVolumeChartData(data);
    expect(data[0]).toEqual({ muscle: "chest", sets: 1 });
  });
});

describe("formatRpeChartData", () => {
  it("adds the short en-US display date like the web chart", () => {
    const result = formatRpeChartData(fullReportFixture.chartData.rpeByWorkout);

    expect(result).toEqual([
      { date: "2026-08-04", avgRpe: 7.2, displayDate: "Aug 4" },
      { date: "2026-08-07", avgRpe: 7.8, displayDate: "Aug 7" },
      { date: "2026-08-10", avgRpe: 8.1, displayDate: "Aug 10" },
    ]);
  });
});

describe("formatTopWeight", () => {
  it("returns a dash for non-positive weights", () => {
    expect(formatTopWeight(0, "lb")).toEqual({
      label: "—",
      unitUnavailable: false,
    });
  });

  it("flags a missing stored unit", () => {
    expect(formatTopWeight(185, undefined)).toEqual({
      label: "185",
      unitUnavailable: true,
    });
  });

  it("appends the unit when available", () => {
    expect(formatTopWeight(185, "lb")).toEqual({
      label: "185 lb",
      unitUnavailable: false,
    });
  });
});
