import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PathStep } from "./path-step";

function radios(html: string): Array<{ value: string; checked: boolean }> {
  return [...html.matchAll(/<button[^>]*role="radio"[^>]*>/g)].map(([tag]) => ({
    value: tag.match(/value="([^"]+)"/)?.[1] ?? "",
    checked: tag.includes('aria-checked="true"'),
  }));
}

describe("PathStep", () => {
  test("offers the three onboarding paths as one labelled radio group", () => {
    const html = renderToStaticMarkup(<PathStep selected={null} onSelect={() => {}} />);

    assert.match(html, /role="radiogroup"/);
    assert.match(html, /aria-labelledby="path-label"/);
    assert.match(html, /id="path-label"[^>]*>How do you want to start\?/);
    assert.deepEqual(radios(html), [
      { value: "bring_program", checked: false },
      { value: "from_scratch", checked: false },
      { value: "generate", checked: false },
    ]);
    for (const label of ["Bring my program", "Start from scratch", "Generate one"]) {
      assert.ok(html.includes(label), `missing ${label}`);
    }
    // Templates do not exist yet, so the step must not promise them.
    assert.doesNotMatch(html, /template/i);
  });

  test("checks only the chosen path", () => {
    const html = renderToStaticMarkup(
      <PathStep selected="from_scratch" onSelect={() => {}} />,
    );

    assert.deepEqual(radios(html), [
      { value: "bring_program", checked: false },
      { value: "from_scratch", checked: true },
      { value: "generate", checked: false },
    ]);
  });
});
