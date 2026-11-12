import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildExerciseHistory, estimateOneRepMax } from "./e1rm";

type TestSet = {
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  unit?: "kg" | "lb";
  isWarmup?: boolean;
  durationSeconds?: number;
};

function session(workoutId: string, date: string, sets: TestSet[]) {
  return {
    workoutId,
    date,
    sets: sets.map((set) => ({ rpe: null, unit: "kg" as const, ...set })),
  };
}

describe("estimateOneRepMax", () => {
  test("uses the Epley formula: weight × (1 + reps / 30)", () => {
    // 100 × (1 + 5/30) = 116.67; 60 × (1 + 10/30) = 80
    assert.ok(Math.abs((estimateOneRepMax(100, 5) ?? 0) - 116.6667) < 0.001);
    assert.equal(estimateOneRepMax(60, 10), 80);
  });

  test("treats a single as its own max", () => {
    assert.equal(estimateOneRepMax(140, 1), 140);
  });

  test("returns null when no load or no reps were lifted", () => {
    assert.equal(estimateOneRepMax(0, 5), null);
    assert.equal(estimateOneRepMax(100, 0), null);
  });
});

describe("buildExerciseHistory", () => {
  test("estimates e1RM from work sets only: no warm-ups, zero-rep or timed sets", () => {
    const history = buildExerciseHistory(
      [
        session("w1", "2026-07-01T00:00:00.000Z", [
          { setNumber: 1, weight: 140, reps: 3, isWarmup: true },
          { setNumber: 2, weight: 150, reps: 0 },
          { setNumber: 3, weight: 200, reps: 1, durationSeconds: 30 },
          { setNumber: 4, weight: 100, reps: 5 },
        ]),
      ],
      "kg"
    );

    const [only] = history.sessions;
    assert.deepEqual(
      only.sets.map((set) => [set.setNumber, set.e1rm]),
      [
        [1, null],
        [2, null],
        [3, null],
        [4, 116.7],
      ]
    );
    assert.equal(only.bestE1rm, 116.7);
    assert.deepEqual(history.best, {
      e1rm: 116.7,
      weight: 100,
      reps: 5,
      date: "2026-07-01T00:00:00.000Z",
      workoutId: "w1",
    });
  });

  test("a 5-rep set at a lower weight is an e1RM PR when its e1RM beats the previous best", () => {
    const history = buildExerciseHistory(
      [
        // Newest first, as entries.getExerciseHistory returns them.
        session("w3", "2026-07-15T00:00:00.000Z", [
          { setNumber: 1, weight: 90, reps: 5 },
        ]),
        session("w2", "2026-07-08T00:00:00.000Z", [
          { setNumber: 1, weight: 95, reps: 5 },
        ]),
        session("w1", "2026-07-01T00:00:00.000Z", [
          { setNumber: 1, weight: 100, reps: 3 },
        ]),
      ],
      "kg"
    );

    const prs = Object.fromEntries(
      history.sessions.map((s) => [s.workoutId, s.sets.map((set) => set.pr)])
    );
    // 100×3 → 110.0; 95×5 → 110.8 (higher, lighter); 90×5 → 105.0.
    assert.deepEqual(prs, { w1: [null], w2: ["e1rm"], w3: [null] });
    assert.equal(history.best?.workoutId, "w2");
  });

  test("more reps than ever at a weight is a rep PR even when e1RM is lower", () => {
    const history = buildExerciseHistory(
      [
        session("w1", "2026-07-01T00:00:00.000Z", [
          { setNumber: 1, weight: 100, reps: 5 },
        ]),
        session("w2", "2026-07-08T00:00:00.000Z", [
          { setNumber: 1, weight: 100, reps: 5 },
          { setNumber: 2, weight: 60, reps: 12 },
          { setNumber: 3, weight: 60, reps: 10 },
        ]),
        session("w3", "2026-07-15T00:00:00.000Z", [
          { setNumber: 1, weight: 60, reps: 11 },
        ]),
      ],
      "kg"
    );

    const byId = new Map(history.sessions.map((s) => [s.workoutId, s]));
    // 100×5 repeats the old record; 60×12 is new; 60×10 is beaten by 60×12.
    assert.deepEqual(
      byId.get("w2")?.sets.map((set) => set.pr),
      [null, "reps", null]
    );
    // 60×11 is beaten by last week's 60×12.
    assert.deepEqual(byId.get("w3")?.sets.map((set) => set.pr), [null]);
  });

  test("bodyweight sets (weight 0) get rep records but no e1RM", () => {
    const history = buildExerciseHistory(
      [
        session("w1", "2026-07-01T00:00:00.000Z", [
          { setNumber: 1, weight: 0, reps: 8 },
        ]),
        session("w2", "2026-07-08T00:00:00.000Z", [
          { setNumber: 1, weight: 0, reps: 12 },
        ]),
      ],
      "kg"
    );

    const byId = new Map(history.sessions.map((s) => [s.workoutId, s]));
    assert.deepEqual(byId.get("w2")?.sets.map((set) => [set.e1rm, set.pr]), [
      [null, "reps"],
    ]);
    assert.deepEqual(
      history.repBests.map((best) => [best.reps, best.weight]),
      [
        [8, 0],
        [12, 0],
      ]
    );
    assert.equal(history.best, null);
  });

  test("the first session sets the baseline and shows no PRs", () => {
    const history = buildExerciseHistory(
      [
        session("w1", "2026-07-01T00:00:00.000Z", [
          { setNumber: 1, weight: 100, reps: 5 },
          { setNumber: 2, weight: 105, reps: 5 },
        ]),
      ],
      "kg"
    );

    assert.deepEqual(
      history.sessions[0].sets.map((set) => set.pr),
      [null, null]
    );
  });

  test("converts every set to the display unit before comparing", () => {
    const history = buildExerciseHistory(
      [
        session("w1", "2026-07-01T00:00:00.000Z", [
          { setNumber: 1, weight: 100, reps: 1, unit: "kg" },
        ]),
        session("w2", "2026-07-08T00:00:00.000Z", [
          { setNumber: 1, weight: 225, reps: 1, unit: "lb" },
        ]),
      ],
      "lb"
    );

    const byId = new Map(history.sessions.map((s) => [s.workoutId, s]));
    // 100 kg = 220.5 lb, so 225 lb is heavier.
    assert.equal(byId.get("w1")?.sets[0].weight, 220.5);
    assert.equal(byId.get("w2")?.sets[0].pr, "e1rm");
    assert.equal(history.unit, "lb");
  });

  test("lists the heaviest work set for each rep count, earliest on a tie", () => {
    const history = buildExerciseHistory(
      [
        session("w1", "2026-07-01T00:00:00.000Z", [
          { setNumber: 1, weight: 120, reps: 1, isWarmup: true },
          { setNumber: 2, weight: 100, reps: 5 },
          { setNumber: 3, weight: 90, reps: 8 },
        ]),
        session("w2", "2026-07-08T00:00:00.000Z", [
          { setNumber: 1, weight: 100, reps: 5 },
          { setNumber: 2, weight: 110, reps: 3 },
          { setNumber: 3, weight: 95, reps: 8 },
        ]),
      ],
      "kg"
    );

    assert.deepEqual(
      history.repBests.map((best) => [best.reps, best.weight, best.workoutId]),
      [
        [3, 110, "w2"],
        [5, 100, "w1"],
        [8, 95, "w2"],
      ]
    );
  });

  test("orders sessions newest first and the e1RM trend oldest first", () => {
    const history = buildExerciseHistory(
      [
        session("w1", "2026-07-01T00:00:00.000Z", [
          { setNumber: 1, weight: 100, reps: 5 },
        ]),
        session("w3", "2026-07-15T00:00:00.000Z", [
          { setNumber: 1, weight: 0, reps: 10 },
        ]),
        session("w2", "2026-07-08T00:00:00.000Z", [
          { setNumber: 1, weight: 105, reps: 5 },
        ]),
      ],
      "kg"
    );

    assert.deepEqual(
      history.sessions.map((s) => s.workoutId),
      ["w3", "w2", "w1"]
    );
    // w3 has no loaded work set, so it has no point on the trend.
    assert.deepEqual(
      history.e1rmTrend.map((point) => [point.workoutId, point.e1rm]),
      [
        ["w1", 116.7],
        ["w2", 122.5],
      ]
    );
  });
});
