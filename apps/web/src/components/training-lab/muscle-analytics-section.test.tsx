import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { MuscleAnalyticsResult } from "@opentrainer/backend/convex/lib/muscleAnalytics";
import { MuscleAnalyticsSection } from "./muscle-analytics-section";

const GENERATED_AT = Date.parse("2026-08-11T18:00:00.000Z");

const analytics: MuscleAnalyticsResult = {
  generatedAt: GENERATED_AT,
  weekStart: Date.parse("2026-08-10T00:00:00.000Z"),
  weekEnd: Date.parse("2026-08-16T23:59:59.999Z"),
  recoveryWindowHours: 48,
  recoveryLookbackDays: 14,
  totalWorkingSets: 18,
  totalMuscleSetContributions: 24,
  unmappedWorkingSets: 2,
  split: [],
  recovery: [],
  workload: [
    {
      muscle: "core",
      label: "Core",
      setsThisWeek: 6,
      lastTrainedAt: Date.parse("2026-08-11T16:00:00.000Z"),
      lastTrainedDate: "2026-08-11",
      isUnmapped: false,
    },
    {
      muscle: "back",
      label: "Back",
      setsThisWeek: 5,
      lastTrainedAt: Date.parse("2026-08-10T17:00:00.000Z"),
      lastTrainedDate: "2026-08-10",
      isUnmapped: false,
    },
    {
      muscle: "chest",
      label: "Chest",
      setsThisWeek: 4,
      lastTrainedAt: Date.parse("2026-08-11T15:00:00.000Z"),
      lastTrainedDate: "2026-08-11",
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
    {
      muscle: "unmapped",
      label: "Unmapped",
      setsThisWeek: 2,
      lastTrainedAt: null,
      lastTrainedDate: null,
      isUnmapped: true,
    },
  ],
};

describe("MuscleAnalyticsSection body map integration", () => {
  test("renders decorative responsive front and back open-source models", () => {
    const html = renderMuscleAnalyticsSection();

    assert.match(html, />Front</);
    assert.match(html, />Back</);
    assert.match(html, /aria-label="male-body-front"/);
    assert.match(html, /aria-label="male-body-back"/);
    assert.match(
      html,
      /aria-hidden="true" class="pointer-events-none grid grid-cols-1 gap-3 sm:grid-cols-2"/
    );
    assert.match(
      html,
      /class="mx-auto w-full max-w-\[12rem\] \[&amp;_svg\]:h-auto \[&amp;_svg\]:w-full \[&amp;_svg\]:max-w-full"/
    );
    assert.doesNotMatch(html, /onclick=/i);
  });

  test("highlights mapped groups with binary active colors", () => {
    const html = renderMuscleAnalyticsSection();

    assertSlugFill(html, "chest", "var\\(--primary\\)");
    assertSlugFill(html, "abs", "var\\(--primary\\)");
    assertSlugFill(html, "obliques", "var\\(--primary\\)");
    assertSlugFill(html, "upper-back", "var\\(--primary\\)");
    assertSlugFill(html, "lower-back", "var\\(--primary\\)");
    assertSlugFill(html, "quadriceps", "var\\(--muted\\)");
  });

  test("keeps exact workload table semantics and explanatory copy", () => {
    const html = renderMuscleAnalyticsSection();

    assert.match(html, /Current week working sets and last logged training date by muscle/);
    assert.match(html, /Core/);
    assert.match(html, /Back/);
    assert.match(html, /Chest/);
    assert.match(html, /Quads/);
    assert.match(html, /Unmapped/);
    assert.match(html, /Not mapped/);
    assert.match(
      html,
      /Working sets only\. A set is counted for each mapped muscle, so compound exercises may appear in multiple rows\./
    );
    assert.match(html, /Last trained comes only from logged workouts and is not a readiness score\./);
  });
});

function renderMuscleAnalyticsSection() {
  return renderToStaticMarkup(<MuscleAnalyticsSection analytics={analytics} />);
}

function assertSlugFill(html: string, slug: string, fill: string) {
  assert.match(html, new RegExp(`id="${slug}"[^>]*fill="${fill}"`));
}
