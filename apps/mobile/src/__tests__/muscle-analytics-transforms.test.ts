import {
  BODY_MAP_SLUGS,
  formatDateRange,
  formatLastTrained,
  formatPlural,
  getActiveMuscles,
  getBodyMapParts,
  getWorkloadRows,
} from "@/components/training-lab/muscle-analytics-transforms";

import { GENERATED_AT, muscleAnalyticsFixture } from "../__fixtures__/training-lab";

const PALETTE = { active: "#7c54cd", inactive: "#e2ded5", stroke: "#f8f5ef" };

describe("getWorkloadRows", () => {
  it("sorts by sets desc, then recency, with unmapped rows last on ties", () => {
    const rows = getWorkloadRows(muscleAnalyticsFixture);

    expect(rows.map((row) => row.muscle)).toEqual([
      "core",
      "back",
      "chest",
      "unmapped",
      "quads",
    ]);
  });

  it("derives rows from split and recovery when workload is empty", () => {
    const rows = getWorkloadRows({
      ...muscleAnalyticsFixture,
      workload: [],
      split: [
        { muscle: "chest", label: "Chest", sets: 4, percentage: 100, isUnmapped: false },
      ],
      recovery: [
        {
          muscle: "quads",
          label: "Quads",
          recoveryPercent: 80,
          hoursSinceLastTrained: 96,
          lastTrainedAt: Date.parse("2026-08-07T18:00:00.000Z"),
          lastTrainedDate: "2026-08-07",
        },
      ],
    });

    expect(rows).toEqual([
      {
        muscle: "chest",
        label: "Chest",
        setsThisWeek: 4,
        lastTrainedAt: null,
        lastTrainedDate: null,
        isUnmapped: false,
      },
      {
        muscle: "quads",
        label: "Quads",
        setsThisWeek: 0,
        lastTrainedAt: Date.parse("2026-08-07T18:00:00.000Z"),
        lastTrainedDate: "2026-08-07",
        isUnmapped: false,
      },
    ]);
  });
});

describe("getActiveMuscles", () => {
  it("keeps only known muscles with sets this week", () => {
    const active = getActiveMuscles(getWorkloadRows(muscleAnalyticsFixture));

    // quads has 0 sets and "unmapped" is not a known muscle group.
    expect([...active].sort()).toEqual(["back", "chest", "core"]);
  });
});

describe("getBodyMapParts", () => {
  it("emits one entry per body slug with binary active/inactive fills", () => {
    const active = getActiveMuscles(getWorkloadRows(muscleAnalyticsFixture));
    const parts = getBodyMapParts(active, PALETTE);

    expect(parts).toHaveLength(BODY_MAP_SLUGS.length);

    const fillBySlug = new Map(parts.map((part) => [part.slug, part.styles?.fill]));
    // chest → chest; core → abs + obliques; back → upper-back + lower-back.
    expect(fillBySlug.get("chest")).toBe(PALETTE.active);
    expect(fillBySlug.get("abs")).toBe(PALETTE.active);
    expect(fillBySlug.get("obliques")).toBe(PALETTE.active);
    expect(fillBySlug.get("upper-back")).toBe(PALETTE.active);
    expect(fillBySlug.get("lower-back")).toBe(PALETTE.active);
    // quads had no working sets this week.
    expect(fillBySlug.get("quadriceps")).toBe(PALETTE.inactive);

    for (const part of parts) {
      expect(part.styles).toEqual(
        expect.objectContaining({ stroke: PALETTE.stroke, strokeWidth: 2 }),
      );
    }
  });

  it("ignores unknown muscle names", () => {
    const parts = getBodyMapParts(new Set(["unmapped", "cardio"]), PALETTE);
    expect(parts.every((part) => part.styles?.fill === PALETTE.inactive)).toBe(true);
  });
});

describe("formatters", () => {
  it("formats the week range in UTC", () => {
    expect(
      formatDateRange(muscleAnalyticsFixture.weekStart, muscleAnalyticsFixture.weekEnd),
    ).toBe("Week of Aug 10 - Aug 16 UTC");
  });

  it("formats last trained relative to the generation time", () => {
    const rows = getWorkloadRows(muscleAnalyticsFixture);
    const byMuscle = new Map(rows.map((row) => [row.muscle, row]));

    expect(formatLastTrained(byMuscle.get("core")!, GENERATED_AT)).toBe("Today");
    expect(formatLastTrained(byMuscle.get("back")!, GENERATED_AT)).toBe("Yesterday");
    expect(formatLastTrained(byMuscle.get("quads")!, GENERATED_AT)).toBe("4 days ago");
    expect(formatLastTrained(byMuscle.get("unmapped")!, GENERATED_AT)).toBe("Not mapped");
  });

  it("pluralizes counts", () => {
    expect(formatPlural(1, "completed working set")).toBe("1 completed working set");
    expect(formatPlural(18, "completed working set")).toBe(
      "18 completed working sets",
    );
  });
});
