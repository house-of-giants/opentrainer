import assert from "node:assert/strict";
import test from "node:test";
import { getMondayWeekKey, getMondayWeekStartUtc } from "../convex/lib/week.ts";

test("keeps Monday and Sunday in the same Monday-starting week", () => {
  const monday = Date.parse("2026-07-20T00:00:00.000Z");
  const sunday = Date.parse("2026-07-26T23:59:59.999Z");

  assert.equal(getMondayWeekStartUtc(monday), monday);
  assert.equal(getMondayWeekStartUtc(sunday), monday);
  assert.equal(getMondayWeekKey(sunday), "2026-07-20");
});

test("resets the week at Monday 00:00 UTC", () => {
  const sunday = Date.parse("2026-07-19T23:59:59.999Z");
  const monday = Date.parse("2026-07-20T00:00:00.000Z");

  assert.equal(getMondayWeekKey(sunday), "2026-07-13");
  assert.equal(getMondayWeekKey(monday), "2026-07-20");
});

test("handles a Monday-starting week across a year boundary", () => {
  assert.equal(getMondayWeekKey(Date.parse("2027-01-03T12:00:00.000Z")), "2026-12-28");
  assert.equal(getMondayWeekKey(Date.parse("2027-01-04T00:00:00.000Z")), "2027-01-04");
});
