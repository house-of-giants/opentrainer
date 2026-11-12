import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mock } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Render both signed-in and signed-out branches so every line of copy is checked.
const passThrough = ({ children }: { children?: ReactNode }) => <>{children}</>;
mock.module("@clerk/nextjs", () => ({
  SignedIn: passThrough,
  SignedOut: passThrough,
  SignInButton: passThrough,
  SignUpButton: passThrough,
  UserButton: () => null,
}));

const { default: Home } = await import("./page");

describe("Landing page pricing promises", () => {
  test("says Pro is free during early access and promises no lifetime Pro", () => {
    const html = renderToStaticMarkup(<Home />);

    assert.match(html, /Pro is free during early access/);
    assert.doesNotMatch(html, /lifetime/i);
    assert.doesNotMatch(html, /for life/i);
    assert.doesNotMatch(html, /1,000 users/);
    assert.doesNotMatch(html, /special pricing/i);
  });

  test("shows no struck-through or announced Pro price", () => {
    const html = renderToStaticMarkup(<Home />);

    assert.doesNotMatch(html, /\$8/);
    assert.doesNotMatch(html, /\$39\.99/);
    assert.doesNotMatch(html, /line-through/);
  });
});
