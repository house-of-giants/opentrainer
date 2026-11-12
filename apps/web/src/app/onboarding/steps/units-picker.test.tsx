import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { UnitsPicker } from "./units-picker";

function radios(html: string): Array<{ value: string; checked: boolean }> {
  return [...html.matchAll(/<button[^>]*role="radio"[^>]*>/g)].map(([tag]) => ({
    value: tag.match(/value="([^"]+)"/)?.[1] ?? "",
    checked: tag.includes('aria-checked="true"'),
  }));
}

describe("UnitsPicker", () => {
  test("renders a labelled radio group with only the selected unit checked", () => {
    const kg = renderToStaticMarkup(<UnitsPicker value="kg" onChange={() => {}} />);
    const lb = renderToStaticMarkup(<UnitsPicker value="lb" onChange={() => {}} />);

    assert.match(kg, /role="radiogroup"/);
    assert.match(kg, /aria-labelledby="units-label"/);
    // The Radix radio group owns arrow-key navigation and roving focus.
    assert.match(kg, /data-slot="radio-group"/);
    assert.deepEqual(radios(kg), [
      { value: "kg", checked: true },
      { value: "lb", checked: false },
    ]);
    assert.deepEqual(radios(lb), [
      { value: "kg", checked: false },
      { value: "lb", checked: true },
    ]);
  });
});
