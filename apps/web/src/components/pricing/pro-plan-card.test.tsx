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
