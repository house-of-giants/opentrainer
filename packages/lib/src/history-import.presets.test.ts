import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseCsv } from "./csv-parse";
import {
  buildImportPlan,
  detectImportSource,
  settingsForSource,
  type ImportPlan,
} from "./history-import";
import type { WeightUnit } from "./units";

// Header rows and data rows are copied from real exports published on GitHub.
// Sources are listed above each fixture.

const NOW = Date.UTC(2030, 0, 1);

function importFile(text: string, fallbackUnit: WeightUnit, isCardio?: (name: string) => boolean) {
  const { headers, rows } = parseCsv(text);
  const source = detectImportSource(headers);
  const settings = settingsForSource(source, headers, fallbackUnit);
  return { source, settings, plan: buildImportPlan(rows, settings, { now: NOW, isCardio }) };
}

function localParts(ms: number) {
  const d = new Date(ms);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
}

function setSummary(plan: ImportPlan) {
  return plan.workouts.map((w) =>
    w.sets.map((s) => [s.exerciseName, s.weight ?? null, s.reps ?? null, s.unit, s.isWarmup ?? false])
  );
}

describe("Strong presets", () => {
  // iOS layout, no unit column.
  // github.com/cbeachiv/the-daily-chase/blob/HEAD/data/strong_workouts.csv (header, Squat rows)
  // github.com/AlexandrosKyriakakis/StrongAppAnalytics/blob/HEAD/Data/strong.csv (Snatch rows)
  // Warm-up and rest timer rows follow the 2025 form in the-daily-chase.
  const strongIos = [
    "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE",
    '2020-12-30 18:51:52,"Evening Workout",2h 38m,"Snatch (Barbell)",1,40.0,3,0,0,"","",',
    '2020-12-30 18:51:52,"Evening Workout",2h 38m,"Snatch (Barbell)",2,40.0,3,0,0,,,',
    '2025-01-01 13:43:00,"Legs & Shoulders",37m,"Squat (Barbell)",W,95.0,10.0,0,0.0,"","",',
    '2025-01-01 13:43:00,"Legs & Shoulders",37m,"Squat (Barbell)",1,135.0,10.0,0,0.0,,,',
    '2025-01-01 13:43:00,"Legs & Shoulders",37m,"Squat (Barbell)",Rest Timer,0,0.0,0,120.0,,,',
    '2025-01-01 13:43:00,"Legs & Shoulders",37m,"Squat (Barbell)",2,135.0,10.0,0,0.0,,,8',
  ].join("\n");

  test("detects the iOS layout and uses the user's unit, since the file has none", () => {
    const { source, settings, plan } = importFile(strongIos, "lb");

    assert.equal(source, "strong");
    assert.equal(settings.defaultUnit, "lb");
    assert.equal(plan.workouts.length, 2);
    const [snatch, legs] = plan.workouts;
    assert.deepEqual(localParts(snatch.startedAt), [2020, 12, 30, 18, 51]);
    assert.equal(snatch.completedAt! - snatch.startedAt, (2 * 60 + 38) * 60_000);
    assert.equal(legs.title, "Legs & Shoulders");
    assert.equal(legs.completedAt! - legs.startedAt, 37 * 60_000);
    assert.deepEqual(setSummary(plan), [
      [
        ["Snatch (Barbell)", 40, 3, "lb", false],
        ["Snatch (Barbell)", 40, 3, "lb", false],
      ],
      [
        ["Squat (Barbell)", 95, 10, "lb", true],
        ["Squat (Barbell)", 135, 10, "lb", false],
        ["Squat (Barbell)", 135, 10, "lb", false],
      ],
    ]);
    assert.equal(legs.sets[2].rpe, 8);
    assert.deepEqual(plan.skipped, [{ row: 6, reason: "rest_timer" }]);
  });

  test("uses kilograms for the same iOS file when the user logs in kilograms", () => {
    const { plan } = importFile(strongIos, "kg");

    assert.ok(plan.workouts.every((w) => w.sets.every((s) => s.unit === "kg")));
  });

  // iOS layout without notes columns, 12-hour time with a narrow no-break space.
  // github.com/joshsawyer/iron-fitness-app/blob/HEAD/strong_workouts.csv
  test("reads 12-hour times in the layout without notes columns", () => {
    const { source, plan } = importFile(
      [
        "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,RPE",
        '2025-09-30 1:46:37 PM,"Pull",1h 11m,"T Bar Row",1,60.0,6.0,0,0.0,',
        '2025-09-30 1:46:37 PM,"Pull",1h 11m,"T Bar Row",2,55.0,7.0,0,0.0,',
      ].join("\n"),
      "kg"
    );

    assert.equal(source, "strong");
    assert.equal(plan.workouts.length, 1);
    assert.deepEqual(localParts(plan.workouts[0].startedAt), [2025, 9, 30, 13, 46]);
    assert.equal(plan.workouts[0].completedAt! - plan.workouts[0].startedAt, 71 * 60_000);
    assert.equal(plan.setCount, 2);
  });

  // Android layout: semicolons and a Weight Unit column.
  // github.com/joshuayoes/strong-backup/blob/HEAD/strong862973258176784790.csv
  test("reads the Android layout with semicolons and a unit on each row", () => {
    const { source, plan } = importFile(
      [
        "Date;Workout Name;Exercise Name;Set Order;Weight;Weight Unit;Reps;RPE;Distance;Distance Unit;Seconds;Notes;Workout Notes;Workout Duration",
        '2022-09-20 16:39:37;"Week B Day 1";"Bench Press (Barbell)";1;115;lbs;4;6;;;0;"";"";17m',
        '2022-09-20 16:39:37;"Week B Day 1";"Bench Press (Barbell)";2;115;lbs;8;8;;;0;;;17m',
      ].join("\n"),
      "kg"
    );

    assert.equal(source, "strong");
    assert.deepEqual(setSummary(plan), [
      [
        ["Bench Press (Barbell)", 115, 4, "lb", false],
        ["Bench Press (Barbell)", 115, 8, "lb", false],
      ],
    ]);
    assert.deepEqual(plan.workouts[0].sets.map((s) => s.rpe), [6, 8]);
    assert.equal(plan.workouts[0].completedAt! - plan.workouts[0].startedAt, 17 * 60_000);
  });

  // Newer layout: every field quoted, unit in the header, length in seconds.
  // github.com/LordRaydenMK/Bybon/blob/HEAD/app/src/test/resources/strong-backup-sample.csv
  test("reads the quoted layout with the unit in the header and lists note rows", () => {
    const { source, settings, plan } = importFile(
      [
        '"Workout #";"Date";"Workout Name";"Duration (sec)";"Exercise Name";"Set Order";"Weight (kg)";"Reps";"RPE";"Distance (meters)";"Seconds";"Notes";"Workout Notes"',
        '"201";"2026-02-17 19:25:59";"Full body B";"4419";"Romanian Deadlift (Barbell)";"W";"20.0";"8";"";"";"";"";"Friday full body workout"',
        '"201";"2026-02-17 19:25:59";"Full body B";"4419";"Romanian Deadlift (Barbell)";"W";"35.0";"4";"";"";"";"";"Friday full body workout"',
        '"201";"2026-02-17 19:25:59";"Full body B";"4419";"Romanian Deadlift (Barbell)";"Rest Timer";"";"";"";"";"120.0";"";"Friday full body workout"',
        '"201";"2026-02-17 19:25:59";"Full body B";"4419";"Incline Bench Press (Dumbbell)";"Note";"";"";"";"";"";"Rep range 11-15";"Friday full body workout"',
      ].join("\n"),
      "lb"
    );

    assert.equal(source, "strong");
    assert.equal(settings.defaultUnit, "kg");
    const [workout] = plan.workouts;
    assert.equal(workout.completedAt! - workout.startedAt, 4419_000);
    assert.equal(workout.notes, "Friday full body workout");
    assert.deepEqual(setSummary(plan), [
      [
        ["Romanian Deadlift (Barbell)", 20, 8, "kg", true],
        ["Romanian Deadlift (Barbell)", 35, 4, "kg", true],
      ],
    ]);
    assert.deepEqual(plan.skipped, [
      { row: 4, reason: "rest_timer" },
      { row: 5, reason: "note_row" },
    ]);
  });
});

describe("Hevy presets", () => {
  // github.com/tylerjrichards/throne/blob/HEAD/data/hevy_workout_data.csv
  const hevyLbs = [
    '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_lbs","reps","distance_miles","duration_seconds","rpe"',
    '"Gut Check - Day 1 🚀","28 May 2024, 07:32","28 May 2024, 08:27","","Running",,"",0,"normal",,,,240,',
    '"Gut Check - Day 1 🚀","28 May 2024, 07:32","28 May 2024, 08:27","","Seated Cable Row - V Grip (Cable)",,"",0,"warmup",70,10,,,6',
    '"Shoulder Shredder","26 May 2024, 14:42","26 May 2024, 15:45","","Rear Delt Reverse Fly (Cable)",,"",3,"failure",15,17,,,10',
  ].join("\n");

  test("reads the app export in pounds, with end times and set types", () => {
    const isCardio = (name: string) => name === "Running";
    const { source, settings, plan } = importFile(hevyLbs, "kg", isCardio);

    assert.equal(source, "hevy");
    assert.equal(settings.defaultUnit, "lb");
    // Sorted by start time: the 26 May workout comes first.
    const [shoulders, gutCheck] = plan.workouts;
    assert.deepEqual(localParts(gutCheck.startedAt), [2024, 5, 28, 7, 32]);
    assert.deepEqual(localParts(gutCheck.completedAt!), [2024, 5, 28, 8, 27]);
    assert.equal(gutCheck.title, "Gut Check - Day 1 🚀");
    assert.deepEqual(setSummary(plan), [
      [["Rear Delt Reverse Fly (Cable)", 15, 17, "lb", false]],
      [["Seated Cable Row - V Grip (Cable)", 70, 10, "lb", true]],
    ]);
    assert.equal(shoulders.sets[0].rpe, 10);
    // The running row is listed, not dropped.
    assert.deepEqual(plan.skipped, [{ row: 2, reason: "cardio" }]);
  });

  // github.com/lleene/hugo-site/blob/HEAD/content/posts/2024/source/workouts.csv
  test("reads the kilogram export", () => {
    const { settings, plan } = importFile(
      [
        '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
        '"Legsback","19 Mar 2024, 16:39","19 Mar 2024, 18:06","","Squat (Barbell)",,"",0,"warmup",60,12,,,',
        '"Legsback","19 Mar 2024, 16:39","19 Mar 2024, 18:06","","Squat (Barbell)",,"",2,"normal",100,10,,,',
        '"Legsback","19 Mar 2024, 16:39","19 Mar 2024, 18:06","","Squat (Barbell)",,"",3,"normal",120,6,,,',
      ].join("\n"),
      "lb"
    );

    assert.equal(settings.defaultUnit, "kg");
    assert.deepEqual(setSummary(plan), [
      [
        ["Squat (Barbell)", 60, 12, "kg", true],
        ["Squat (Barbell)", 100, 10, "kg", false],
        ["Squat (Barbell)", 120, 6, "kg", false],
      ],
    ]);
    const [workout] = plan.workouts;
    assert.equal(workout.completedAt! - workout.startedAt, 87 * 60_000);
  });

  // hevy.com export in US English.
  // github.com/theinhumaneme/hevy-visualizer/blob/HEAD/data/workouts.csv
  test("reads the website's US date format and bodyweight sets", () => {
    const { plan } = importFile(
      [
        '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_lbs","reps","distance_miles","duration_seconds","rpe"',
        '"Repetitions","Oct 1, 2026, 8:28 PM","Oct 1, 2026, 9:56 PM","","Squat (Bodyweight)",,"",0,"normal",,15,,,',
        '"Repetitions","Oct 1, 2026, 8:28 PM","Oct 1, 2026, 9:56 PM","","Iso-Lateral Chest Press (Machine)",,"",0,"normal",32.5,12,,,',
      ].join("\n"),
      "kg"
    );

    const [workout] = plan.workouts;
    assert.deepEqual(localParts(workout.startedAt), [2026, 10, 1, 20, 28]);
    assert.deepEqual(localParts(workout.completedAt!), [2026, 10, 1, 21, 56]);
    assert.deepEqual(setSummary(plan), [
      [
        ["Squat (Bodyweight)", null, 15, "lb", false],
        ["Iso-Lateral Chest Press (Machine)", 32.5, 12, "lb", false],
      ],
    ]);
  });

  test("keeps an exercise note once when Hevy repeats it on each set", () => {
    const { plan } = importFile(
      [
        '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
        '"Legs","19 Mar 2024, 16:39","19 Mar 2024, 18:06","","Squat (Barbell)",,"Belt on",0,"normal",100,5,,,',
        '"Legs","19 Mar 2024, 16:39","19 Mar 2024, 18:06","","Squat (Barbell)",,"Belt on",1,"normal",100,5,,,',
        '"Legs","19 Mar 2024, 16:39","19 Mar 2024, 18:06","","Squat (Barbell)",,"Belt on",2,"normal",100,5,,,',
      ].join("\n"),
      "kg"
    );

    assert.deepEqual(
      plan.workouts[0].sets.map((s) => s.notes ?? null),
      ["Belt on", null, null]
    );
  });
});

describe("OpenTrainer preset", () => {
  // The format the OpenTrainer CSV export writes: one row per lifting set.
  test("reads OpenTrainer's own export with exact start times", () => {
    const { source, plan } = importFile(
      [
        "date,workout_title,exercise,set_number,set_type,weight,unit,reps,duration_seconds,rpe,rir,notes",
        "2024-03-18T07:30:00.000Z,Push A,Bench Press,1,warmup,45,lb,10,,,,",
        "2024-03-18T07:30:00.000Z,Push A,Bench Press,2,work,185,lb,5,,8.5,,paused",
        "2024-03-18T07:30:00.000Z,Push A,Plank,1,work,,lb,,45,,,",
        "2024-03-19T18:00:00.000Z,,Squat,1,work,100,kg,5,,,2,",
      ].join("\n"),
      "lb"
    );

    assert.equal(source, "opentrainer");
    assert.equal(plan.workouts.length, 2);
    const [push, squat] = plan.workouts;
    assert.equal(push.startedAt, Date.UTC(2024, 2, 18, 7, 30));
    assert.equal(push.title, "Push A");
    assert.deepEqual(push.sets, [
      { exerciseName: "Bench Press", unit: "lb", reps: 10, weight: 45, isWarmup: true },
      { exerciseName: "Bench Press", unit: "lb", reps: 5, weight: 185, rpe: 8.5, notes: "paused" },
      { exerciseName: "Plank", unit: "lb", durationSeconds: 45 },
    ]);
    assert.equal(squat.title, undefined);
    assert.deepEqual(squat.sets, [{ exerciseName: "Squat", unit: "kg", reps: 5, weight: 100, rir: 2 }]);
  });
});

describe("custom spreadsheets", () => {
  test("guesses columns by name and reads the unit from the weight header", () => {
    const { source, settings, plan } = importFile(
      ["Date;Exercise;Weight (kg);Reps", "2024-03-18;Squat;102,5;5"].join("\n"),
      "lb"
    );

    assert.equal(source, "custom");
    assert.equal(settings.defaultUnit, "kg");
    assert.deepEqual(setSummary(plan), [[["Squat", 102.5, 5, "kg", false]]]);
  });
});
