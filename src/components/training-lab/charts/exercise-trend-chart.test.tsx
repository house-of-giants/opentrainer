import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ExerciseTrendChart, formatTopWeight } from "./exercise-trend-chart";

describe("ExerciseTrendChart report units", () => {
  test("unitless legacy trend renders no kg or lb label and explains the missing unit", () => {
    const formatted = formatTopWeight(225, undefined);

    assert.deepEqual(formatted, { label: "225", unitUnavailable: true });
    assert.equal(formatted.label.includes("kg"), false);
    assert.equal(formatted.label.includes("lb"), false);

    const html = renderToStaticMarkup(
      <ExerciseTrendChart
        data={[
          {
            exercise: "Bench Press",
            sessions: 3,
            trend: "flat",
            topWeight: 225,
            avgRpe: 8,
          },
        ]}
      />
    );

    assert.match(html, />225</);
    assert.match(html, /Stored unit unavailable/);
    assert.doesNotMatch(html, /225 kg/);
    assert.doesNotMatch(html, /225 lb/);
  });

  test("kg trend remains labeled kg", () => {
    const formatted = formatTopWeight(102.5, "kg");

    assert.deepEqual(formatted, { label: "102.5 kg", unitUnavailable: false });

    const html = renderToStaticMarkup(
      <ExerciseTrendChart
        weightUnit="lb"
        data={[
          {
            exercise: "Deadlift",
            sessions: 2,
            trend: "up",
            topWeight: 102.5,
            weightUnit: "kg",
            avgRpe: 8,
          },
        ]}
      />
    );

    assert.match(html, /102.5 kg/);
    assert.doesNotMatch(html, /Stored unit unavailable/);
  });
});
