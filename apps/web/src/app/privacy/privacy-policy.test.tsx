import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPage from "./page";

describe("Privacy policy analytics disclosure", () => {
  test("names PostHog and does not call the app's analytics anonymous", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);

    assert.match(html, /PostHog/);
    assert.doesNotMatch(html, /anonymous usage analytics/i);
    assert.doesNotMatch(html, /does not track individuals/i);
  });
});
