import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { UnitsPicker } from "./units-picker";

function checkedLabels(html: string): string[] {
  return [...html.matchAll(/aria-checked="true"[^>]*>([^<]+)</g)].map((m) => m[1]);
}

describe("UnitsPicker", () => {
  test("marks only the selected unit as checked", () => {
    const kg = renderToStaticMarkup(<UnitsPicker value="kg" onChange={() => {}} />);
    const lb = renderToStaticMarkup(<UnitsPicker value="lb" onChange={() => {}} />);

    assert.match(kg, /role="radiogroup" aria-labelledby="units-label"/);
    assert.deepEqual(checkedLabels(kg), ["Kilograms (kg)"]);
    assert.deepEqual(checkedLabels(lb), ["Pounds (lb)"]);
  });
});
