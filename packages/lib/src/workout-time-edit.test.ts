import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildWorkoutTimeEditRange,
  getLocalDateInputValue,
  validateWorkoutTimeEditRange,
} from "./workout-time-edit";

const packageDir = fileURLToPath(new URL(".", import.meta.url));

describe("workout time editing date math", () => {
  test("moves same-day workouts to the selected local calendar date", () => {
    const range = buildWorkoutTimeEditRange({
      initialStartedAt: new Date(2026, 0, 12, 9, 15).getTime(),
      initialCompletedAt: new Date(2026, 0, 12, 10, 45).getTime(),
      dateValue: "2026-02-03",
      startedAtTimeValue: "07:30",
      completedAtTimeValue: "08:45",
    });

    assert.equal(range.startedAt, new Date(2026, 1, 3, 7, 30).getTime());
    assert.equal(range.completedAt, new Date(2026, 1, 3, 8, 45).getTime());
    assert.equal(getLocalDateInputValue(range.startedAt!), "2026-02-03");
    assert.deepEqual(
      validateWorkoutTimeEditRange(
        range,
        new Date(2026, 1, 3, 9, 0).getTime()
      ),
      { message: null }
    );
  });

  test("preserves the existing end-day offset for overnight workouts", () => {
    const range = buildWorkoutTimeEditRange({
      initialStartedAt: new Date(2026, 0, 12, 23, 30).getTime(),
      initialCompletedAt: new Date(2026, 0, 13, 1, 15).getTime(),
      dateValue: "2026-02-03",
      startedAtTimeValue: "22:45",
      completedAtTimeValue: "00:30",
    });

    assert.equal(range.startedAt, new Date(2026, 1, 3, 22, 45).getTime());
    assert.equal(range.completedAt, new Date(2026, 1, 4, 0, 30).getTime());
    assert.deepEqual(
      validateWorkoutTimeEditRange(
        range,
        new Date(2026, 1, 4, 1, 0).getTime()
      ),
      { message: null }
    );
  });

  test("rejects nonexistent spring-forward local times instead of normalizing them", () => {
    const child = spawnSync(
      process.execPath,
      [
        "--eval",
        `
          import assert from "node:assert/strict";
          import {
            buildWorkoutTimeEditRange,
            validateWorkoutTimeEditRange,
          } from "./workout-time-edit.ts";

          assert.equal(new Date(2026, 2, 8, 2, 30).getHours(), 3);

          const range = buildWorkoutTimeEditRange({
            initialStartedAt: new Date(2026, 0, 12, 9, 15).getTime(),
            initialCompletedAt: new Date(2026, 0, 12, 10, 45).getTime(),
            dateValue: "2026-03-08",
            startedAtTimeValue: "02:30",
            completedAtTimeValue: "03:45",
          });

          assert.equal(range.startedAt, null);
          assert.equal(range.completedAt, new Date(2026, 2, 8, 3, 45).getTime());
          assert.deepEqual(validateWorkoutTimeEditRange(range), {
            message: "Choose a start time",
            startInvalid: true,
          });
        `,
      ],
      {
        cwd: packageDir,
        encoding: "utf8",
        env: { NODE_ENV: "test", TZ: "America/Los_Angeles" },
      }
    );

    assert.ifError(child.error);
    assert.equal(child.status, 0, child.stderr || child.stdout);
  });

  test("rejects invalid local dates before parsing them as timestamps", () => {
    const range = buildWorkoutTimeEditRange({
      initialStartedAt: new Date(2026, 0, 12, 9, 15).getTime(),
      initialCompletedAt: new Date(2026, 0, 12, 10, 45).getTime(),
      dateValue: "2026-02-31",
      startedAtTimeValue: "07:30",
      completedAtTimeValue: "08:45",
    });

    assert.equal(range.startedAt, null);
    assert.equal(range.completedAt, null);
    assert.deepEqual(validateWorkoutTimeEditRange(range), {
      message: "Choose a workout date",
      dateInvalid: true,
    });
  });

  test("rejects end-before-start for same-day workouts", () => {
    const range = buildWorkoutTimeEditRange({
      initialStartedAt: new Date(2026, 0, 12, 9, 15).getTime(),
      initialCompletedAt: new Date(2026, 0, 12, 10, 45).getTime(),
      dateValue: "2026-02-03",
      startedAtTimeValue: "10:00",
      completedAtTimeValue: "09:59",
    });

    assert.deepEqual(
      validateWorkoutTimeEditRange(
        range,
        new Date(2026, 1, 3, 12, 0).getTime()
      ),
      { message: "End time must be after start time", endInvalid: true }
    );
  });

  test("allows timestamps at now and rejects future boundaries", () => {
    const validRange = buildWorkoutTimeEditRange({
      initialStartedAt: new Date(2026, 0, 12, 9, 15).getTime(),
      initialCompletedAt: new Date(2026, 0, 12, 10, 45).getTime(),
      dateValue: "2026-02-03",
      startedAtTimeValue: "08:00",
      completedAtTimeValue: "09:00",
    });
    const now = new Date(2026, 1, 3, 9, 0).getTime();

    assert.deepEqual(validateWorkoutTimeEditRange(validRange, now), {
      message: null,
    });

    const futureRange = buildWorkoutTimeEditRange({
      initialStartedAt: new Date(2026, 0, 12, 9, 15).getTime(),
      initialCompletedAt: new Date(2026, 0, 12, 10, 45).getTime(),
      dateValue: "2026-02-03",
      startedAtTimeValue: "08:00",
      completedAtTimeValue: "09:01",
    });

    assert.deepEqual(validateWorkoutTimeEditRange(futureRange, now), {
      message: "Workout timestamps can't be in the future",
      endInvalid: true,
    });
  });
});
