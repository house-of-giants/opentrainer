import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseCsv } from "./csv-parse";

describe("parseCsv", () => {
  test("splits a header row and data rows on commas", () => {
    const result = parseCsv("date,exercise,reps\n2024-03-18,Squat,5\n2024-03-18,Bench Press,8\n");

    assert.equal(result.delimiter, ",");
    assert.deepEqual(result.headers, ["date", "exercise", "reps"]);
    assert.deepEqual(result.rows, [
      ["2024-03-18", "Squat", "5"],
      ["2024-03-18", "Bench Press", "8"],
    ]);
  });

  test("keeps commas, doubled quotes, and line breaks inside quoted fields", () => {
    const result = parseCsv(
      'exercise,notes\n"Bench Press, Paused","Felt ""heavy""\nslow off chest"\nSquat,""\n'
    );

    assert.deepEqual(result.rows, [
      ["Bench Press, Paused", 'Felt "heavy"\nslow off chest'],
      ["Squat", ""],
    ]);
  });

  test("detects semicolon separators and keeps decimal commas intact", () => {
    const result = parseCsv("Date;Exercise Name;Weight;Reps\r\n2024-03-18 07:30:00;Squat;102,5;5\r\n");

    assert.equal(result.delimiter, ";");
    assert.deepEqual(result.headers, ["Date", "Exercise Name", "Weight", "Reps"]);
    assert.deepEqual(result.rows, [["2024-03-18 07:30:00", "Squat", "102,5", "5"]]);
  });

  test("ignores a semicolon inside a quoted header when it picks the separator", () => {
    const result = parseCsv('"a;b",c,d\n1,2,3\n');

    assert.equal(result.delimiter, ",");
    assert.deepEqual(result.headers, ["a;b", "c", "d"]);
  });

  test("strips a UTF-8 byte order mark from the first header", () => {
    const result = parseCsv("﻿Date,Exercise Name\n2024-03-18,Squat\n");

    assert.deepEqual(result.headers, ["Date", "Exercise Name"]);
  });

  test("skips blank lines and keeps a final row with no trailing newline", () => {
    const result = parseCsv("a,b\n\n1,2\r\n\r\n3,4");

    assert.deepEqual(result.rows, [
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  test("accepts old Mac line endings", () => {
    const result = parseCsv("a,b\r1,2\r3,4\r");

    assert.deepEqual(result.rows, [
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  test("reports an unclosed quote instead of swallowing the rest of the file", () => {
    assert.throws(() => parseCsv('a,b\n"open,2\n3,4\n'), /unclosed quote/i);
  });

  test("returns no headers for an empty file", () => {
    const result = parseCsv("﻿\n\n");

    assert.deepEqual(result.headers, []);
    assert.deepEqual(result.rows, []);
  });
});
