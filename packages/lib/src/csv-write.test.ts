import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { workoutsToCsv, type CsvWorkout } from "./csv-write";

const HEADER =
  "date,workout_title,exercise,set_number,set_type,weight,unit,reps,duration_seconds,rpe,rir,notes";

function lines(csv: string): string[] {
  assert.ok(csv.endsWith("\r\n"), "every record ends with CRLF");
  return csv.slice(0, -2).split("\r\n");
}

function liftingEntry(
  exerciseName: string,
  createdAt: string,
  lifting: NonNullable<CsvWorkout["entries"][number]["lifting"]>,
  notes?: string,
): CsvWorkout["entries"][number] {
  return { exerciseName, kind: "lifting", lifting, notes, createdAt };
}

describe("workoutsToCsv", () => {
  test("writes only the header when there is no history", () => {
    assert.equal(workoutsToCsv([]), `${HEADER}\r\n`);
  });

  test("writes one row per lifting set with the warm-up flag and empty cells for absent values", () => {
    const csv = workoutsToCsv([
      {
        title: "Push Day",
        status: "completed",
        startedAt: "2026-11-10T14:03:00.000Z",
        entries: [
          liftingEntry("Bench Press", "2026-11-10T14:05:00.000Z", {
            setNumber: 1,
            reps: 10,
            weight: 95,
            unit: "lb",
            isWarmup: true,
          }),
          liftingEntry("Bench Press", "2026-11-10T14:08:00.000Z", {
            setNumber: 2,
            reps: 5,
            weight: 185.5,
            unit: "lb",
            rpe: 8.5,
          }),
          liftingEntry("Plank", "2026-11-10T14:20:00.000Z", {
            setNumber: 1,
            durationSeconds: 60,
            unit: "kg",
            rir: 2,
          }),
        ],
      },
    ]);

    assert.deepEqual(lines(csv), [
      HEADER,
      "2026-11-10T14:03:00.000Z,Push Day,Bench Press,1,warmup,95,lb,10,,,,",
      "2026-11-10T14:03:00.000Z,Push Day,Bench Press,2,work,185.5,lb,5,,8.5,,",
      "2026-11-10T14:03:00.000Z,Push Day,Plank,1,work,,kg,,60,,2,",
    ]);
  });

  test("quotes cells with commas, double quotes, and line breaks per RFC 4180", () => {
    const csv = workoutsToCsv([
      {
        title: 'Legs, "heavy"',
        status: "completed",
        startedAt: "2026-11-11T09:00:00.000Z",
        entries: [
          liftingEntry(
            "Squat",
            "2026-11-11T09:01:00.000Z",
            { setNumber: 1, reps: 3, weight: 140, unit: "kg" },
            "felt good\nbelt on",
          ),
          liftingEntry(
            "Squat",
            "2026-11-11T09:04:00.000Z",
            { setNumber: 2, reps: 3, weight: 140, unit: "kg" },
            "knee\r\nok",
          ),
        ],
      },
    ]);

    assert.equal(
      csv,
      `${HEADER}\r\n` +
        '2026-11-11T09:00:00.000Z,"Legs, ""heavy""",Squat,1,work,140,kg,3,,,,"felt good\nbelt on"\r\n' +
        '2026-11-11T09:00:00.000Z,"Legs, ""heavy""",Squat,2,work,140,kg,3,,,,"knee\r\nok"\r\n',
    );
  });

  test("orders workouts by start, exercises by first logged set, and sets by set number", () => {
    const csv = workoutsToCsv([
      {
        title: "Later",
        status: "completed",
        startedAt: "2026-11-12T10:00:00.000Z",
        entries: [
          liftingEntry("Row", "2026-11-12T10:01:00.000Z", { setNumber: 1, reps: 8, unit: "lb" }),
        ],
      },
      {
        title: "Earlier",
        status: "completed",
        startedAt: "2026-11-05T10:00:00.000Z",
        entries: [
          // Stored out of order: a superset logged Curl, Press, Curl, and a
          // set edited later sorts by its set number.
          liftingEntry("Press", "2026-11-05T10:03:00.000Z", { setNumber: 1, reps: 6, unit: "lb" }),
          liftingEntry("Curl", "2026-11-05T10:09:00.000Z", { setNumber: 2, reps: 12, unit: "lb" }),
          liftingEntry("Curl", "2026-11-05T10:01:00.000Z", { setNumber: 1, reps: 12, unit: "lb" }),
        ],
      },
    ]);

    assert.deepEqual(
      lines(csv)
        .slice(1)
        .map((row) => row.split(",").slice(1, 4).join(",")),
      ["Earlier,Curl,1", "Earlier,Curl,2", "Earlier,Press,1", "Later,Row,1"],
    );
  });

  test("skips cardio and mobility entries and workouts that are not completed", () => {
    const csv = workoutsToCsv([
      {
        title: "Mixed",
        status: "completed",
        startedAt: "2026-11-10T08:00:00.000Z",
        entries: [
          { exerciseName: "Treadmill", kind: "cardio", createdAt: "2026-11-10T08:01:00.000Z" },
          { exerciseName: "Hip Opener", kind: "mobility", createdAt: "2026-11-10T08:02:00.000Z" },
          liftingEntry("Deadlift", "2026-11-10T08:10:00.000Z", {
            setNumber: 1,
            reps: 5,
            weight: 315,
            unit: "lb",
          }),
        ],
      },
      {
        title: "Abandoned",
        status: "cancelled",
        startedAt: "2026-11-09T08:00:00.000Z",
        entries: [
          liftingEntry("Squat", "2026-11-09T08:01:00.000Z", { setNumber: 1, reps: 5, unit: "lb" }),
        ],
      },
      {
        title: "Still going",
        status: "in_progress",
        startedAt: "2026-11-12T08:00:00.000Z",
        entries: [
          liftingEntry("Squat", "2026-11-12T08:01:00.000Z", { setNumber: 1, reps: 5, unit: "lb" }),
        ],
      },
    ]);

    assert.deepEqual(lines(csv), [
      HEADER,
      "2026-11-10T08:00:00.000Z,Mixed,Deadlift,1,work,315,lb,5,,,,",
    ]);
  });

  test("leaves the title cell empty for an untitled workout", () => {
    const csv = workoutsToCsv([
      {
        status: "completed",
        startedAt: "2026-11-10T08:00:00.000Z",
        entries: [
          liftingEntry("Pull-up", "2026-11-10T08:01:00.000Z", {
            setNumber: 1,
            reps: 10,
            unit: "lb",
          }),
        ],
      },
    ]);

    assert.equal(lines(csv)[1], "2026-11-10T08:00:00.000Z,,Pull-up,1,work,,lb,10,,,,");
  });
});
