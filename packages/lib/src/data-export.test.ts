import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildDataExportFile } from "./data-export";

const data = {
  exportedAt: "2026-11-12T10:00:00.000Z",
  routines: [{ name: "PPL" }],
  workouts: [
    {
      title: "Push",
      status: "completed",
      startedAt: "2026-11-10T14:03:00.000Z",
      entries: [
        {
          exerciseName: "Bench Press",
          kind: "lifting" as const,
          lifting: { setNumber: 1, reps: 5, weight: 185, unit: "lb" as const },
          createdAt: "2026-11-10T14:05:00.000Z",
        },
      ],
    },
  ],
};
const now = new Date("2026-11-12T23:30:00.000Z");

describe("buildDataExportFile", () => {
  test("builds a dated CSV file with one row per set", () => {
    assert.deepEqual(buildDataExportFile(data, "csv", now), {
      fileName: "opentrainer-export-2026-11-12.csv",
      mimeType: "text/csv",
      content:
        "date,workout_title,exercise,set_number,set_type,weight,unit,reps,duration_seconds,rpe,rir,notes\r\n" +
        "2026-11-10T14:03:00.000Z,Push,Bench Press,1,work,185,lb,5,,,,\r\n",
    });
  });

  test("builds a dated JSON file that keeps the whole payload", () => {
    const file = buildDataExportFile(data, "json", now);
    assert.equal(file.fileName, "opentrainer-export-2026-11-12.json");
    assert.equal(file.mimeType, "application/json");
    assert.deepEqual(JSON.parse(file.content), data);
  });
});
