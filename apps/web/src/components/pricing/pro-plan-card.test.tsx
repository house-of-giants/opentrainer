import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProPlanCard } from "./pro-plan-card";

describe("ProPlanCard claims", () => {
  test("does not promise injury prevention or overtraining alerts", () => {
    const html = renderToStaticMarkup(<ProPlanCard />);

    assert.doesNotMatch(html, /injur/i);
    assert.doesNotMatch(html, /overtraining/i);
  });

  test("lists Muscle Workload, a Pro-only dashboard section", () => {
    const html = renderToStaticMarkup(<ProPlanCard />);

    assert.match(html, /Muscle Workload/);
  });
});

describe("ProPlanCard pricing promises", () => {
  test("says Pro is free during early access without a lifetime promise or a struck price", () => {
    const html = renderToStaticMarkup(<ProPlanCard />);

    assert.match(html, /free during early access/i);
    assert.doesNotMatch(html, /lifetime|for life/i);
    assert.doesNotMatch(html, /\$8/);
    assert.doesNotMatch(html, /line-through/);
  });
});
