import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FileStep } from "./history-import-flow";

function fileInput(html: string): string {
  return html.match(/<input[^>]*type="file"[^>]*>/)?.[0] ?? "";
}

describe("FileStep", () => {
  test("blocks file choice until the profile has loaded", () => {
    const html = renderToStaticMarkup(<FileStep error={null} onFile={() => {}} disabled />);

    assert.match(fileInput(html), /disabled=""/);
    assert.match(html, /Loading your profile…/);
  });

  test("allows file choice once the profile has loaded", () => {
    const html = renderToStaticMarkup(<FileStep error={null} onFile={() => {}} />);

    assert.doesNotMatch(fileInput(html), /disabled/);
    assert.match(html, /Choose CSV file/);
  });
});
