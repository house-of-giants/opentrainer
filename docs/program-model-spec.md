# Program model v1

| | |
|---|---|
| Status | Draft for review. Implementation starts after review. |
| Issue | P2-01. The model also serves P2-02, P2-03, P2-04, P3-03, and P3-04. |
| Base | `main` at `b6f4804` |
| Date | 2026-11-12 |

This spec uses ASD-STE100 Simplified Technical English. Section 2 defines each term once. The spec uses each term with that one meaning.

## 1. Problem and goals

### 1.1 Problem

A routine is a list of days. A day is a list of exercises. Each exercise has `targetSets`, a rep text such as `"8-12"`, and a `targetRpe` that no screen uses. One rule changes the load: double progression in `packages/lib/src/progression.ts`. The lifter cannot see or change that rule.

Lifters who run 5/3/1, GZCLP, nSuns, or a Stronger By Science (SBS) template need these parts:

- Weeks that change the targets.
- A training max for each lift.
- Loads as a percent of the training max.
- AMRAP sets, top sets, and back-off sets.
- Deload weeks.

OpenTrainer has none of these parts. Thus the spreadsheet stays the main tool, and OpenTrainer is only a log. All three council members ranked this gap as the top reason that lifters do not move to OpenTrainer.

Liftosaur is the direct rival. It runs these programs, but the lifter writes them in Liftoscript, a scripting language. OpenTrainer can give the same result for the common programs with structured fields.

### 1.2 Goals

1. A lifter can enter each of these programs with fields only, and run it from start to end:
   - 5/3/1: training max waves, a deload week, and an AMRAP set.
   - GZCLP: tiered linear progression with failure stages.
   - nSuns 5/3/1 LP: many percent sets, with an AMRAP set that moves the training max.
   - SBS-style RTF: an AMRAP rep target that moves the training max each week.
   - An RPE top set with back-off sets.
2. The app computes every planned load. The lifter sees the rule and the reason for each change.
3. Existing routines load, run, and progress with no change in behavior.
4. One model serves the mobile builder, the web grid (P2-04), templates (P2-03), import and export, and sheet conversion (P3-04).

### 1.3 Non-goals

- No scripting language. No field accepts an expression.
- No import of arbitrary spreadsheet formulas. Import maps each cell to a field, or lists the cell as not mapped.
- No program marketplace and no program library. P2-03 ships three or four templates.
- No coach accounts. No program sharing between users.
- The v1 limits in section 7.6. Examples: no supersets, no tempo prescriptions, and no change of exercises between blocks.

## 2. Terms

| Term | Meaning |
|---|---|
| Routine | A document in the `routines` table. It has days. Each day has exercises. |
| Program | A routine that has a `program` field. A routine without that field runs as a program with one week. |
| Week | One entry in `program.weeks`. A week has a name and an optional deload setting. |
| Cycle | One pass through all weeks of a program. After the last week, the program starts at week 1 again, and the cycle number increases by 1. |
| Block | A run of weeks that use one day layout. In v1, a program has exactly one block. |
| Day | One entry in `routine.days`. All weeks use the same days. |
| Slot | One exercise entry in a day (`days[d].exercises[i]`). A slot has a stable `slotId`. |
| Set prescription | One planned set, or `count` copies of it. It has a role, reps, a load, and an optional RPE target. |
| Prescription | The list of set prescriptions for one slot in one week. |
| Set role | `warmup`, `work`, or `backoff`. A separate `amrap` flag marks an AMRAP set. The app shows four labels: Warm-up, Work, AMRAP, and Back-off. |
| Top set | The first set with the role `work` in the prescription of a slot. |
| Back-off set | A lighter set after the top set or after the main work sets. |
| AMRAP set | A set that the lifter does for "as many reps as possible". Its `reps` value is the minimum or the rep target. |
| Training max (TM) | A weight for one lift and one user. Percent loads use it. It is usually a little below the true one-rep max. The app keeps every TM value in a history. |
| Working weight | The weight that a linear or double progression rule holds for one slot. |
| Load | The method that gives the planned weight of a set: fixed, percent of TM, working weight, percent of the top set, or RPE target. |
| Resolved set | A set prescription after the app computes its weight in the unit of the lifter. |
| Progression rule | A rule on a slot. It changes a TM or a working weight from logged results. |
| Deload week | A week with a `deload` setting. It reduces load or volume. Its sessions do not run session rules, and boundary rules ignore their results. |
| Position | The cycle, week, and day of the next session of a program. |
| Weight step | The step for each exercise from P0-09 (`packages/lib/src/weight-step.ts`). The default is 5 lb or 2.5 kg. |
| e1RM | Estimated one-rep max. `packages/lib/src/e1rm.ts` computes it with the Epley formula. |

## 3. Data model

### 3.1 Decision: extend `routines`, and keep runtime state in new tables

A program is a routine with extra optional fields. Runtime state goes into two new tables: `trainingMaxes` and `programStates`.

Reasons:

1. Every runtime path uses `routines` now:
   - `workouts.routineId` and `workouts.routineDayIndex`.
   - `workouts.getRoutineExercisesForWorkout`.
   - `getNextRoutineDay` in `packages/lib/src/next-session.ts`.
   - The start sheets, the onboarding first day, AI generation, JSON import, both routine editors, and analytics.

   A new table needs a second copy of each path.
2. "An old routine is a program with one week" needs no migration. A routine without `program` is that program.
3. The editors save the full `days` array through `routines.updateRoutine`. If progression state lived in `days`, a save from an old editor tab can overwrite a new TM or working weight. Separate tables prevent this race.
4. A TM history needs one row for each change. A table gives that. A field does not.

Rejected option: a new `programs` table with its own days. It doubles each path above. It needs a conversion in both directions. It gives no capability that the extension does not give.

The decision has two costs. Section 3.4 and section 13 give the mitigations.

- An old client can drop the program fields when it saves a routine. A server guard stops this.
- The routine document becomes larger. Limits keep it far below the Convex limit of 1 MiB for each document.

### 3.2 Shared validators (new file)

`packages/backend/convex/lib/programValidators.ts` holds the validators. `schema.ts` and `routines.ts` both import them, so the stored shape and the mutation arguments cannot differ. `packages/lib/src/program.ts` mirrors them as TypeScript types, as `routine-editor.ts` does now for routine exercises.

```ts
import { v } from "convex/values";

export const weightUnit = v.union(v.literal("kg"), v.literal("lb"));

export const setRole = v.union(
  v.literal("warmup"),
  v.literal("work"),
  v.literal("backoff"),
);

// How the app computes the planned weight of one set. Section 4.2.
export const load = v.union(
  v.object({ type: v.literal("fixed"), weight: v.number(), unit: weightUnit }),
  // tmExercise names another lift's TM (nSuns T2). Absent: the slot's exercise.
  v.object({
    type: v.literal("percentTm"),
    percent: v.number(),
    tmExercise: v.optional(v.string()),
  }),
  // The working weight from the slot's progression rule.
  v.object({ type: v.literal("working") }),
  // A percent of the slot's top set in the same session.
  v.object({ type: v.literal("percentTop"), percent: v.number() }),
  // The load that meets the set's RPE target. Needs `rpe` on the set.
  v.object({ type: v.literal("rpe") }),
);

export const setPrescription = v.object({
  role: setRole,
  count: v.optional(v.number()), // Copies of this set. Absent means 1.
  reps: v.number(), // Exact reps, the low end of a range, or the AMRAP target.
  repsMax: v.optional(v.number()), // The high end of a rep range.
  amrap: v.optional(v.boolean()),
  load: load,
  rpe: v.optional(v.number()), // Target RPE, 6 to 10 in half steps.
});

// The prescription of one slot for one week. It replaces the slot's `sets`.
export const weekSets = v.object({
  week: v.number(), // Index into program.weeks.
  sets: v.array(setPrescription),
});

const tmChange = v.union(
  v.object({ type: v.literal("amount"), value: v.number(), unit: weightUnit }),
  v.object({ type: v.literal("percent"), value: v.number() }),
);

// P2-02. Section 5.
export const progressionRule = v.union(
  v.object({
    type: v.literal("double"),
    sessionsAtTop: v.number(), // Today: 2.
  }),
  v.object({
    type: v.literal("linear"),
    increment: v.object({ value: v.number(), unit: weightUnit }),
    success: v.union(
      v.object({ type: v.literal("allSets") }),
      v.object({ type: v.literal("totalReps") }),
      v.object({ type: v.literal("amrapReps"), reps: v.number() }),
    ),
    // Failure stages. Each stage is a full prescription (GZCLP 5x3+, 6x2+, 10x1+).
    stages: v.optional(v.array(v.array(setPrescription))),
    failuresToAdvance: v.number(),
    reset: v.union(
      v.object({ type: v.literal("percent"), percent: v.number() }),
      v.object({ type: v.literal("stageStartPlus"), value: v.number(), unit: weightUnit }),
    ),
  }),
  v.object({
    type: v.literal("trainingMax"),
    timing: v.union(v.literal("week"), v.literal("cycle")),
    // Sorted by minRepsOverTarget, highest first. The first match applies.
    steps: v.array(v.object({ minRepsOverTarget: v.number(), change: tmChange })),
    otherwise: v.optional(tmChange),
  }),
  v.object({ type: v.literal("rpe") }),
);

export const programWeek = v.object({
  name: v.optional(v.string()),
  deload: v.optional(
    v.object({
      loadPercent: v.number(), // 1 to 100. Multiplies the load.
      setsPercent: v.number(), // 1 to 100. Multiplies the set count.
    }),
  ),
});

export const program = v.object({
  version: v.literal(1),
  weeks: v.array(programWeek),
  // TM setup only: proposed TM = this percent of the e1RM that the lifter enters.
  tmPercentOfMax: v.optional(v.number()),
});
```

### 3.3 Schema additions

All additions are optional fields, new tables, or new indexes. No production record needs a migration.

```ts
routines: defineTable({
  // ...all existing fields stay
  program: v.optional(program),
  days: v.array(v.object({
    name: v.string(),
    exercises: v.array(v.object({
      // ...all existing fields stay
      slotId: v.optional(v.string()),
      sets: v.optional(v.array(setPrescription)),
      weekSets: v.optional(v.array(weekSets)),
      progression: v.optional(progressionRule),
    })),
  })),
}),

workouts: defineTable({
  // ...all existing fields stay
  // The server sets these three when the workout starts from a program.
  programWeek: v.optional(v.number()),
  programCycle: v.optional(v.number()),
  isDeload: v.optional(v.boolean()),
  // What the rules changed when this workout completed. Section 5.5.
  progressionOutcomes: v.optional(v.array(v.object({
    slotId: v.string(),
    exerciseName: v.string(),
    rule: v.union(v.literal("linear"), v.literal("trainingMax")),
    result: v.union(
      v.literal("increase"), v.literal("hold"), v.literal("decrease"),
      v.literal("nextStage"), v.literal("reset"), v.literal("none"),
    ),
    reason: v.string(),
  }))),
})
  // ...existing indexes stay
  .index("by_user_routine_started", ["userId", "routineId", "startedAt"]),

entries: defineTable({
  // ...all existing fields stay
  lifting: v.optional(v.object({
    // ...all existing fields stay
    // The plan row that this set logged against. Programs only.
    planned: v.optional(v.object({
      slotId: v.string(),
      setIndex: v.number(), // Index after `count` expansion. Section 4.1.
      role: setRole,
      amrap: v.optional(v.boolean()),
      reps: v.number(),
      repsMax: v.optional(v.number()),
      weight: v.optional(v.number()), // In this entry's unit. Absent: no input.
      rpe: v.optional(v.number()),
    })),
  })),
}),

// One row for each TM value. The newest row for a lift is the current TM.
trainingMaxes: defineTable({
  userId: v.id("users"),
  exerciseName: v.string(), // Key, as in userExerciseSettings, until P2-05.
  exerciseId: v.optional(v.id("exercises")),
  value: v.number(), // Not rounded to the weight step. Stored to 0.01.
  unit: weightUnit,
  source: v.union(
    v.literal("manual"), v.literal("setup"), v.literal("rule"), v.literal("import"),
  ),
  reason: v.optional(v.string()),
  routineId: v.optional(v.id("routines")),
  workoutId: v.optional(v.id("workouts")),
  createdAt: v.number(),
})
  .index("by_user_exercise_created", ["userId", "exerciseName", "createdAt"])
  .index("by_user_workout", ["userId", "workoutId"]),

// One row for each program that the user ran. Created on the first write.
programStates: defineTable({
  userId: v.id("users"),
  routineId: v.id("routines"),
  cycle: v.number(), // 0 for the first cycle.
  week: v.number(), // Position: week of the next session.
  day: v.number(), // Position: day of the next session.
  slots: v.array(v.object({
    slotId: v.string(),
    exerciseName: v.string(), // The slot's exercise when the state was written.
    workingWeight: v.optional(v.number()),
    unit: v.optional(weightUnit),
    stage: v.optional(v.number()),
    failures: v.optional(v.number()),
    stageStartWeight: v.optional(v.number()),
    // The values before the last change, for Undo. Section 5.4.
    previous: v.optional(v.object({
      workoutId: v.optional(v.id("workouts")),
      workingWeight: v.optional(v.number()),
      stage: v.optional(v.number()),
      failures: v.optional(v.number()),
      stageStartWeight: v.optional(v.number()),
    })),
  })),
  updatedAt: v.number(),
})
  .index("by_user_routine", ["userId", "routineId"]),
```

Notes on the choices:

- The TM is "on the user" as P2-01 asks: each row has a `userId`, and one TM serves all programs of that user. A separate table keeps the `users` document small and gives the history.
- The TM key is the exercise name, as in `userExerciseSettings` and in exercise history today. P2-05 (exercise identity) moves both keys to IDs. The rows store `exerciseId` when it is known, so P2-05 can migrate them.
- The app does not round a TM to the weight step. A percent change, such as +1% of 300 lb, is 3 lb. A 5 lb step would remove it.
- `routines.deleteRoutine` also deletes the `programStates` row of that routine. TM rows stay, because they belong to the user.
- `users.exportAllData` adds `trainingMaxes` and `programStates`, and keeps the new workout and entry fields (section 10.3).

### 3.4 Backward compatibility

| Case | Behavior |
|---|---|
| A routine without `program` | No change. Screens use today's code paths. The next day comes from `getNextRoutineDay` as today. Double progression runs as today. The server writes no state. The client writes no `planned` field. |
| A slot without `sets` in a program | The slot runs from its old fields (section 4.1, step 1.4). It gets `targetSets` copies of one work set with the load `working`. |
| An old client loads a program | It reads only the old fields. `getRoutineExercisesForWorkout` fills `targetSets` and `targetReps` from the prescription of the current week (count of non-warm-up sets, and the reps of the top set). The old client shows the right set count and reps. Its suggested weight comes from double progression. The OTA update fixes the weight. |
| An old client saves a program | Data loss risk: the old editor mapper drops unknown fields. Guard: `updateRoutine` gets a new optional argument `editorVersion`. If the stored routine has `program`, and the call sends `days` without `editorVersion >= 1`, the server rejects the call with "This routine is a program. Update the app to edit it." Calls that change only the name, the description, or `isActive` still work. |
| An old client logs sets in a program workout | The sets have no `planned` field. Rules match the sets to the plan by exercise name and set order (section 5.4). |
| An old client edits a logged set | `updateLiftingEntry` replaces the whole `lifting` object now. Change: it keeps the stored `planned` when the payload has none. |
| A failed AMRAP set (0 reps) | `addLiftingEntry` rejects 0 reps now (`entries.ts`, "Reps must be greater than zero"). Change: it accepts 0 reps only when `planned.amrap` is true. Old clients never send `planned`, so their validation does not change. `isWorkSet` already excludes 0-rep sets from e1RM and history best sets. |
| An old client completes a program workout | The server runs all program logic in `completeWorkout`. The client version does not matter. |
| An old client starts a program workout | `createWorkout` gets no week. The server takes the week and cycle from `programStates`. |
| A program JSON file before slice 8 ships | `importRoutineFromJson` copies only the old fields. The file imports as a plain routine. The export keeps `targetSets` and `targetReps` filled, so the plain routine is still useful. |
| New web code against the old backend | The new arguments fail validation. Convex must deploy before the web merge (section 12). |

The editor mapper in `packages/lib/src/routine-editor.ts` must carry every program field from load to save. P0-01 fixed the same class of bug for `targetRpe`, `notes`, and rest. The mapper also writes `targetSets` and `targetReps` from the prescription, so old readers stay correct.

### 3.5 Validation and limits

`packages/lib/src/program-validate.ts` holds one validation function. The editors call it before a save. `createRoutine`, `updateRoutine`, and the import mutations call it again on the server.

| Check | Limit or rule |
|---|---|
| Weeks | 1 to 26. |
| Set prescriptions in one routine | At most 3,000 entries, counted before `count` expansion. 3,000 entries of about 120 bytes each is about 360 KB. |
| `count` | Integer, 1 to 20. |
| `reps` | Integer, 1 to 100. `repsMax` is more than `reps`. An AMRAP set has no `repsMax`. |
| `percent` | 1 to 200. |
| `rpe` | 6 to 10 in steps of 0.5, the same scale as `effort.ts`. Required when the load type is `rpe`. |
| `weekSets` | Each `week` is a valid index. Each week appears once for each slot. |
| `slotId` | Unique in the routine. The server assigns an ID to each slot of a program that has none. |
| Program fields on a slot | Allowed only on a slot with `kind: "lifting"` and reps (not `measurementType: "duration"`), and only when the routine has `program`. |
| One slot for each lift and day | In a program, a day has at most one rep-based lifting slot for each exercise name. The active workout groups sets by exercise name (`getExerciseGroupKey` in `active.tsx`), so two slots for one lift on one day collide. Put a main lift and its back-off sets in one slot. |
| `percentTop` | The top set itself cannot use `percentTop`. |
| Rule fit | `double` and `linear` need a work set with the load `working`. `trainingMax` needs a `percentTm` set and an AMRAP set. `rpe` needs a set with the load `rpe`. |
| Linear stages | A slot with a `linear` rule that has `stages` has no `sets` and no `weekSets`. The stages are its prescription. |
| Deload percents | 1 to 100. |
| `sessionsAtTop` | Integer, 1 to 5. |

## 4. Prescription resolution

`packages/lib/src/program.ts` resolves a session plan with one pure function. The mobile active workout, the next-up card, the editor previews, the web grid preview, and the templates tests all call it.

```ts
resolveSlotPlan(input: {
  slot: ProgramSlot;
  week: ProgramWeek;            // A routine without `program` uses {}.
  weekIndex: number;
  state?: SlotState;            // From programStates.
  trainingMaxes: Map<string, { value: number; unit: WeightUnit }>;
  weightStep: WeightStepSetting | null; // From exercises.getWeightStep.
  unit: WeightUnit;             // The lifter's preferred unit.
  history: ExerciseSession[];   // From entries.getExerciseHistory.
  loggedSets: LoggedSet[];      // This session, for percentTop.
}): ResolvedSet[]
```

The server does not resolve loads. It uses only steps 1 to 3 of section 4.1, which give the sets without weights. `getRoutineExercisesForWorkout` and the fallback match in section 5.4 need only that. At completion, the rules need only the logged sets, the `planned` fields, the state, and the TM.

### 4.1 Which sets a slot has in a session

1. Select the prescription:
   1. If the slot has a `linear` rule with `stages`, use the stage at `state.stage`. With no state, use stage 0.
   2. Else, if `weekSets` has an entry for this week, use it.
   3. Else, if the slot has `sets`, use them.
   4. Else, use the old fields: `targetSets` copies of `{ role: "work", reps, repsMax, load: { type: "working" }, rpe: targetRpe }`. `parseRepRange` in `progression.ts` gives `reps` and `repsMax` from `targetReps`.
2. If the week is a deload week, and step 1 did not use a `weekSets` entry, apply the deload change:
   - New count is `max(1, round(count × setsPercent / 100))`.
   - The `amrap` flag is removed.
   - The load gets the multiplier `loadPercent / 100`. Step 4 applies it before it rounds, so the app rounds once. A `percentTop` load does not get the multiplier, because its top set already has it.
3. Expand `count` into single sets. Number them from 0 in order. That number is `setIndex`.
4. Compute each load (section 4.2), then round it (section 4.3).

### 4.2 Load types

| Load | Weight | When an input is missing |
|---|---|---|
| `fixed` | `weight`, converted to the unit of the lifter. | Never missing. |
| `percentTm` | Current TM of `tmExercise`, or of the slot exercise, × `percent / 100`. | No TM: the weight is empty. The row shows "Set TM". |
| `working` | `linear` rule: `state.workingWeight`, converted from `state.unit` to the unit of the lifter. `double` rule or no rule: `targetWeight` and `targetReps` from `calculateProgressionSuggestion`, as the active workout uses today. | No state and no history: the weight is empty. The lifter selects a weight. |
| `percentTop` | Top set weight × `percent / 100`. If the lifter logged the top set in this session, the app uses the logged weight. Else it uses the resolved weight of the top set. The top set weight already has the deload multiplier, so a `percentTop` set does not get it again. | Top set weight empty: the weight is empty. |
| `rpe` | e1RM × the fraction for the target reps and RPE (section 4.5). | No history: the weight is empty. The row shows "Work up to 5 @ RPE 8". |

### 4.3 Rounding and units

- The display unit is the preferred unit of the lifter (`users.preferredUnits`).
- `convertWeight` in `packages/lib/src/units.ts` converts TM rows and fixed loads.
- The step is `resolveWeightStep(unit, setting)` for the slot exercise. It is the same step that the set stepper and the "add weight" suggestion use (P0-09).
- New helper `roundToStep(weight, step)`: the nearest multiple of the step. A half step rounds up. The helper removes float noise as `stepWeight` does.
- A result of 0 or less is empty.
- Examples: TM 300 lb × 85% = 255 lb. TM 310 lb × 85% = 263.5 lb, which rounds to 265 lb with a 5 lb step. TM 140 kg × 85% = 119 kg, which rounds to 120 kg with a 2.5 kg step.
- The `roundWeight` function in `progression.ts` (1 kg or 2.5 lb) stays only for the old deload suggestion. Program loads do not use it.

### 4.4 Warm-ups

- A warm-up is a set prescription with the role `warmup`. Its load is usually `percentTm`, `percentTop`, or `fixed`.
- When the lifter logs a warm-up set, the app writes `isWarmup: true`, as today. `isWorkSet` already excludes warm-ups from progression, e1RM, and history best sets.
- v1 has no automatic warm-up generator. The report puts it after the program engine. A template can include warm-up rows.

### 4.5 RPE loads

The app reuses the Epley formula from `e1rm.ts`. It counts the reps in reserve as more reps:

- Reps in reserve (RIR) is `10 − RPE`. Effective reps `n` is `reps + RIR`.
- e1RM from a logged set is `estimateOneRepMax(weight, n)`. For a set with no RPE, `n` is the reps, which is the e1RM that the history screen shows.
- The fraction for a target is 1 when `n ≤ 1`. Else it is `1 / (1 + n / 30)`.
- The suggested load is the e1RM × the fraction, rounded with the weight step.
- The e1RM source is the newest logged work set of this slot with an RPE (by `planned.slotId`). If none exists, the app uses the newest work set of the exercise from history.

Example: the last top set was 315 lb × 5 @ RPE 7. `n` is 8, so the e1RM is 315 × (1 + 8/30) = 399 lb. Today the target is 5 @ RPE 8. `n` is 7, so the load is 399 / (1 + 7/30) = 323.5 lb, which rounds to 325 lb.

Check against the RPE chart from Reactive Training Systems (RTS), as a third party copies it (source R2). That chart is a function of effective reps. The Epley fraction differs from it by at most 1.75 percentage points for `n` from 1 to 10:

| n | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RTS chart % | 100 | 95.5 | 92.2 | 89.2 | 86.3 | 83.7 | 81.1 | 78.6 | 76.2 | 73.9 | 70.7 | 68.0 |
| Epley % | 100 | 93.8 | 90.9 | 88.2 | 85.7 | 83.3 | 81.1 | 78.9 | 76.9 | 75.0 | 73.2 | 71.4 |

The difference grows above `n = 10`, which is high reps at a low RPE. Top sets are usually in the range of `n` from 2 to 9. Open question 7 asks if the app needs the chart.

When the effort scale of the lifter is RIR, the app shows a target RPE 8 as "2 RIR". `effort.ts` already maps RPE 6 to 10 to RIR 4 to 0.

## 5. Progression rules (P2-02 interface)

### 5.1 Interface

`packages/lib/src/program-rules.ts` holds pure functions. The server calls them in `completeWorkout` and in `programs.skipDay`. The editors call them for the preview.

```ts
type LoggedSlotSet = {
  setIndex?: number; // From `planned`. Absent for an extra set.
  role: SetRole;
  amrap: boolean;
  plannedReps: number;
  reps: number;
  weight: number;
  unit: WeightUnit;
  rpe: number | null;
};

type RuleOutcome = {
  result: "increase" | "hold" | "decrease" | "nextStage" | "reset" | "none";
  state?: SlotState; // New slot state (linear).
  tm?: { exerciseName: string; value: number; unit: WeightUnit }; // New TM (trainingMax).
  reason: string;
};

// The planned sets after `count` expansion (section 4.1, steps 1 to 3). No weights.
type PlannedSlotSet = { setIndex: number; role: SetRole; amrap: boolean; reps: number };
type SlotSession = { planned: PlannedSlotSet[]; logged: LoggedSlotSet[] };

applySessionRule(rule, state, session: SlotSession, step): RuleOutcome; // linear
applyBoundaryRule(rule, tm, sessions: SlotSession[], step): RuleOutcome; // trainingMax
describeRule(rule, unit): string; // "Linear +5 lb · 2 misses: −10%"
previewNextTarget(rule, state, history, step): ResolvedSet[]; // Editor preview
```

### 5.2 Rule types

| Rule | Settings that the lifter sees | Runs | Writes | Programs |
|---|---|---|---|---|
| `double` | Rep range (from the sets), weight step (P0-09), sessions at the top of the range (default 2). | When the plan resolves. | Nothing. It reads history, as today. | The default for old routines. The "double progression upper and lower" template. |
| `linear` | Increment, failures before a change (default 2), reset percent (default 10%). Advanced: the success test and the stages. | At session end. | `programStates` slot state. | The P2-02 linear rule. GZCLP T1, T2, and T3. |
| `trainingMax` | Timing (each week or each cycle), the steps table, and the "otherwise" change. | At a week or cycle boundary. | A `trainingMaxes` row. | 5/3/1, nSuns, SBS-style RTF. |
| `rpe` | None. The target RPE is on the sets. | When the plan resolves. | Nothing. | RPE top set and back-off sets. |

`double` is the current `calculateProgressionSuggestion`. It gets an optional `sessionsAtTop` argument with the default 2, so old callers get the same result. The setting is 1 to 5. `entries.getExerciseHistory` returns 3 sessions by default, so a caller requests `sessionCount: max(3, sessionsAtTop)`.

### 5.3 When rules run

- **Session end.** `completeWorkout` runs each `linear` rule of a slot with logged sets in that workout.
- **Week boundary.** The position moves past the last day of a week. Each `trainingMax` rule with the timing `week` runs on that week.
- **Cycle boundary.** The position moves past the last day of the last week. Each `trainingMax` rule with the timing `cycle` runs on that cycle. A cycle end is also a week end, so week rules run too.
- Two actions move the position: the completion of a program workout, and "Skip day" (section 6). "Choose day" moves the position, but no rule runs.
- A session in a deload week does not run session rules. Boundary rules ignore the results of deload-week sessions. A boundary still runs its rules when a deload session crosses it. Example: the completion of the last 5/3/1 deload day ends the cycle, so the cycle rule runs on weeks 1 to 3.
- In one completion, the order is: session rules, position move, week rules, cycle rules. One Convex mutation does all writes, so the result is atomic.
- A new TM or working weight applies to the next plan that the app resolves.

### 5.4 Session results and failure handling

**Which sets count.** The sets of a slot are the logged lifting entries of the workout with `planned.slotId` equal to the slot. If no entry has `planned` (an old client, or the web), the server uses the entries with the slot exercise name. It removes warm-ups and matches the rest in set-number order to the planned non-warm-up sets. Extra sets have no `setIndex`. Rules ignore extra sets.

**No result.** If the slot has no logged non-warm-up sets, the result is `none`. A planned AMRAP set logged with 0 reps is a logged set, so it gives a result. A skipped slot does not count as a failure. If the entries of a slot have another exercise name (a swap during the session), the result is also `none`.

**Linear rule.**

1. Units: the slot state has its own `unit`. Before a comparison, the rule converts each logged weight and the increment to that unit. A reset result rounds with the weight step for that unit.
2. With no state, the first logged work weight becomes the working weight and `stageStartWeight`. The state takes the unit of that set.
3. The success test:
   - `allSets`: each planned work set has a logged set with reps at or above the planned reps.
   - `totalReps`: the total logged work reps are at or above the total planned work reps. GZCLP uses this test.
   - `amrapReps`: the AMRAP set reaches the given reps. Sometimes the planned reps are met, but the AMRAP set is below the given reps. Then the result is `hold`, and the failure count does not change.
4. Each logged work set must also be at or above the working weight, minus half a step. If not, the session is a failure.
5. After each stage-0 session, success or failure, `stageStartWeight` becomes the working weight of that session.
6. On success: the working weight increases by the increment. The failure count goes to 0.
7. On failure: the failure count increases by 1. When it reaches `failuresToAdvance`:
   - If a next stage exists, the slot moves to that stage. The working weight does not change.
   - Else the slot resets. `percent`: the working weight × (1 − percent / 100), rounded. `stageStartPlus`: `stageStartWeight` + the value. The stage goes to 0.
   - The failure count goes to 0.

**Training max rule.**

1. For each session of the slot in the period, "reps over target" is the reps of the first AMRAP set minus its planned reps.
2. Timing `week`: the newest session of the slot in that week. Timing `cycle`: the lowest value from the non-deload sessions of the cycle.
3. The first step with reps over target at or above `minRepsOverTarget` applies. If no step applies, `otherwise` applies. If `otherwise` is absent, the TM does not change.
4. An `amount` change is converted to the TM unit. A `percent` change uses the current TM. The new TM is stored to 0.01. A TM never goes below one weight step.
5. The rule changes the TM that the first `percentTm` set of the slot reads.
6. If no AMRAP set was logged, or no TM exists, the TM does not change. The reason says why.
7. A failed AMRAP set is a logged set with 0 reps, so its reps over target are negative. An AMRAP set that the lifter did not log is "no data" for that session. It is not a failure.

**Undo.** The summary screen offers "Undo changes" (`programs.undoWorkoutProgression`). Undo restores `previous` for each slot that this workout changed. It deletes the TM rows with this `workoutId`. It does not move the position. Undo is available until the next program workout of that routine completes.

**Edits after completion.** In v1, the rules do not run again when the lifter edits a completed workout. The lifter can use Undo, or edit the TM or working weight. Open question 6 covers this.

### 5.5 The rule and reason line

Each slot shows two short lines: the rule, and the reason for the current target.

| Rule | Rule line | Reason line examples |
|---|---|---|
| `double` | "Double progression 8-12, +5 lb" | "Hit 12 on all sets twice → 140 lb." |
| `linear` | "Linear +5 lb · 2 misses: −10%" | "Hit 3×5 at 225 → 230 lb." "Missed 3×5 at 230 (1 of 2) → repeat 230." "Missed twice → −10% → 205 lb." |
| `linear` with stages | "Linear +10 lb · stage 2 of 3 (6×2+)" | "Missed 15 reps at 235 (13) → 6×2+ at 235." |
| `trainingMax`, cycle | "TM +10 lb each cycle" | "Cycle 1 AMRAPs met their targets → TM 310 lb." "Week 3 AMRAP 1 under target → TM −10% → 270 lb." |
| `trainingMax`, week | "TM by AMRAP each week" | "285 × 4 on the 1+ set (3 over) → TM +10 lb → 310 lb." |
| `rpe` | "RPE target" | "Last 315 × 5 @ 7 → e1RM 399 → 5 @ 8: 325 lb." |

- The reason uses the logged numbers. It never shows a score.
- `linear` and `trainingMax` reasons are text that the server stores when the rule runs: in `trainingMaxes.reason` and in `workouts.progressionOutcomes[].reason`. `double` and `rpe` reasons come from the history when the plan resolves, as `calculateProgressionSuggestion` builds `reasoning` today.
- The lines appear in these places:
  - The exercise header in the active workout.
  - The next-up card.
  - The summary ("What changes next").
  - The rule editor preview.
  - The TM history.

### 5.6 Reuse of existing code

| Code | Use |
|---|---|
| `isWorkSet`, `pickBestSet` (`progression.ts`) | Unchanged. History, e1RM, and `double` keep using them. `linear` and `trainingMax` do not: they select sets by `planned.role`, so a 0-rep AMRAP set stays in their input (section 5.4). |
| `calculateProgressionSuggestion` | Is the `double` rule. New optional `sessionsAtTop` argument, default 2. |
| `parseRepRange` | Gives `reps` and `repsMax` from the old `targetReps` text. |
| `resolveWeightStep`, `stepWeight` (`weight-step.ts`) | Rounding and increments. |
| `estimateOneRepMax` (`e1rm.ts`) | RPE loads, and the TM setup from a recent set. |
| `effortForStorage`, the RPE and RIR scale (`effort.ts`) | Unchanged. A target RPE shows as RIR for RIR users. |
| `getNextRoutineDay`, `routineDayLabel` (`next-session.ts`) | Extended in section 6. |
| `describeNextSessionChange` | Unchanged for old routines. A program summary uses `progressionOutcomes`. |
| `createProgressionSuggestionTracker` (`analytics.ts`) | Gets a `rule_type` property. |
| `entries.getExerciseHistory` | New optional argument `excludeDeload`. Progression callers send `true`, and the query then skips workouts with `isDeload: true`. The exercise history screen (`exercise/[name].tsx`) sends nothing and still shows deload sessions. The query also returns `planned.slotId` for each set. |

### 5.7 Fit with the health hold rule (P3-03)

- A health rule changes only the resolved sets of one workout: it holds the load, or it removes one back-off set.
- A health rule never writes a TM or a slot state.
- `completeWorkout` records a held slot with the result `hold`. Thus a held session does not count as a linear failure.
- P3-03 adds its own fields on `workouts` to store the rule that fired and the choice of the lifter.

## 6. Program position

### 6.1 Storage

- `programStates.cycle`, `week`, and `day` hold the position.
- `createWorkout` copies the week, the cycle, and the deload flag to the workout: `programWeek`, `programCycle`, `isDeload`. `routineDayIndex` keeps the day, as today.

Why a stored position: P1-02 gets the next routine day from history, but a program needs more. Cycle rules need an exact cycle end. "Skip day" needs a place to write. A position from history cannot tell "repeat day 2" from "did day 2 twice by mistake".

### 6.2 Start a workout

`workouts.createWorkout` gets one new optional argument: `programWeek`. For a program:

- The week is `programWeek`, else `state.week`, else 0.
- The cycle is `state.cycle`, else 0.
- `isDeload` comes from that week.
- If no state exists, the server creates it with this position.

### 6.3 Next session (extends P1-02)

`getNextRoutineDay(routines, completedWorkouts, programStates = [])`:

- The routine choice does not change: the routine of the newest completed routine workout, else the newest routine.
- A routine without `program`: no change.
- A program with a state: `dayIndex`, `week`, and `cycle` come from the state. The function limits them to the current number of days and weeks.
- A program without a state: `dayIndex` as today, `week` 0, `cycle` 0.
- The return type gets optional `week` and `cycle`. Current callers keep working.
- New `programDayLabel(week, weekName, dayIndex, dayName)` gives "Week 2 · Day 1 · Squat". A deload week adds the tag "Deload".

### 6.4 Advance

`advancePosition(program, dayCount, from)` returns the next position and the boundaries that it crossed:

1. The next day in the same week.
2. After the last day: day 0 of the next week. That crosses a week boundary.
3. After the last week: week 0 and cycle + 1. That crosses a week boundary and a cycle boundary.

On completion, the server advances from the week and day of the completed workout, not from the stored position. Thus "do day 3 in place of day 2" continues with day 4, as P1-02 does today.

### 6.5 Skip, repeat, and choose

| Action | Mutation | Position | Rules |
|---|---|---|---|
| Complete a program workout | `workouts.completeWorkout` | Advances from the workout's week and day. | Session, week, and cycle rules (section 5.3). |
| Skip day | `programs.skipDay({ routineId })` | Advances from the stored position. | Week and cycle rules, if it crosses a boundary. |
| Repeat a day | Choose the same day and start it. | Its completion advances from that day again. | As a completion. |
| Choose day | `programs.setPosition({ routineId, week, day })`, or start any week and day | Set to the chosen week and day. | None. |
| Cancel a workout | `workouts.cancelWorkout` | No change. | None. |
| Delete a completed workout | `workouts.deleteWorkout` | No change. | No change. Undo stays available as in section 5.4. |

### 6.6 Edits to a running program

- If the program has fewer weeks or days than the stored position, the app limits the position when it reads it. The next advance starts from the limited position.
- If an edit changes the exercise of a slot, the server deletes the state of that slot on the next write. The `exerciseName` in the slot state shows the change.
- A deleted slot leaves its state unused. The next write removes it.

## 7. Program mappings

Each table shows the program, its fields in this model, and planned loads. The loads use a 5 lb step and the rounding in section 4.3. Section 15 lists the sources. "UNVERIFIED" marks a value that no fetched source confirmed.

### 7.1 5/3/1 (Jim Wendler)

Source structure (sources W1, W2): TM is 90% of the 1RM. Three main sets each week, and the third set is the "+" (AMRAP) set in weeks 1 to 3. Week 4 is a deload. The TM increases by 5 lb (bench, press) or 10 lb (squat, deadlift) each cycle. "Boring But Big" (BBB) adds 5 × 10 at about 50 to 60% of the TM.

| Part | Model |
|---|---|
| TM | One `trainingMaxes` row for each main lift. `program.tmPercentOfMax: 90` for the setup. |
| Weeks | 4 weeks: "5s", "3s", "5/3/1", "Deload". Week 4 has `deload: { loadPercent: 100, setsPercent: 50 }`. The deload change applies only to slots without week 4 sets, such as assistance (product default, not from a source). |
| Days | 4 days, one main lift each. The lifter selects the order. |
| Main slot | `weekSets` for weeks 0 to 3. Set 3 has `amrap: true` in weeks 0 to 2. |
| BBB | One more set prescription in the same slot: `{ role: "backoff", count: 5, reps: 10, load: { type: "percentTm", percent: 50 } }` in weeks 0 to 2. |
| Rule | `trainingMax`, timing `cycle`. Steps: `[{ minRepsOverTarget: 0, change: +10 lb }]` for squat and deadlift, +5 lb for bench and press. `otherwise: −10%` (UNVERIFIED as a Wendler rule; W1 says the article gives no reset rule). |

Worked plan, squat TM 300 lb:

| Week | Set 1 | Set 2 | Set 3 | BBB |
|---|---|---|---|---|
| 1 | 65% → 195 × 5 | 75% → 225 × 5 | 85% → 255 × 5+ | 5 × 10 @ 50% → 150 |
| 2 | 70% → 210 × 3 | 80% → 240 × 3 | 90% → 270 × 3+ | 5 × 10 @ 50% → 150 |
| 3 | 75% → 225 × 5 | 85% → 255 × 3 | 95% → 285 × 1+ | 5 × 10 @ 50% → 150 |
| 4 (deload) | 40% → 120 × 5 | 50% → 150 × 5 | 60% → 180 × 5 | none |

Cycle end: the AMRAP sets were 9, 6, and 3 reps. The reps over target are 4, 3, and 2. The lowest is 2, which is at or above 0, so the TM increases by 10 lb to 310 lb. Next cycle, week 1, set 3: 310 × 85% = 263.5, which rounds to 265 lb. If one AMRAP set misses its target, `otherwise` applies, and the TM goes to 270 lb.

### 7.2 GZCLP (Cody Lefever)

Source structure (sources G1, G2, G3, G4): four days with tiers T1, T2, and T3. T1 starts at 5 × 3+ at about 85% of the 5RM. On a failure, T1 moves to 6 × 2+, then to 10 × 1+. After a failure at 10 × 1+, the lifter tests a new 5RM and starts again at 85% of it. T2 moves from 3 × 10 to 3 × 8 to 3 × 6. After a failure at 3 × 6, T2 starts again at 3 × 10. The new weight is the last 3 × 10 weight plus about 15 to 20 lb. T3 is 3 × 15+. It adds weight when the AMRAP set reaches 25 reps. Each success adds 10 lb (5 kg) to squat and deadlift, and 5 lb (2.5 kg) to bench and press. "Failure" means fewer total reps than planned for the stage.

| Part | Model |
|---|---|
| Weeks | 1 week. No deload. The four days rotate. The calendar does not matter. |
| Days | Day 1: Squat T1, Bench T2, Lat pulldown T3. Day 2: Press T1, Deadlift T2, Row T3. Day 3: Bench T1, Squat T2, Lat pulldown T3. Day 4: Deadlift T1, Press T2, Row T3. |
| T1 slot | Load `working`. Rule `linear`: increment +10 lb (squat, deadlift) or +5 lb (bench, press). `success: totalReps`. `stages`: [4 × 3, 1 × 3+], [5 × 2, 1 × 2+], [9 × 1, 1 × 1+]. `failuresToAdvance: 1`. `reset: { type: "percent", percent: 10 }`. |
| T2 slot | Rule `linear`, same increments. `stages`: [3 × 10], [3 × 8], [3 × 6]. `failuresToAdvance: 1`. `success: totalReps`. `reset: { type: "stageStartPlus", value: 15, unit: "lb" }`. |
| T3 slot | Sets: 2 × 15, then 1 × 15+. Rule `linear`: +5 lb, `success: { type: "amrapReps", reps: 25 }`, `failuresToAdvance: 2`, reset 10%. |

Differences from the sources:

- T1 reset: the original says "test a new 5RM, then use 85% of it". The model cannot run a test session. It uses a 10% reset, which source G4 (Liftosaur) gives as an option. The lifter can set the working weight after a test.
- T2 reset: sources give +15 to 20 lb (G1), +20 lb or 10 kg (G3), and +15 lb (G4 text). The template uses +15 lb. The lifter can edit it.
- T3 failure: G1 and G2 give no rule. G3 says "drop 10 to 15%". The template uses 2 failures and 10%.

Worked plan, squat T1 at a working weight of 225 lb. The table counts stages from 1. The stored `stage` counts from 0.

| Session | Stage | Plan | Logged | Result | Next |
|---|---|---|---|---|---|
| 1 | 1 | 5 × 3+ @ 225 | 3, 3, 3, 3, 6 = 18 of 15 | Success | 235, stage 1 |
| 2 | 1 | 5 × 3+ @ 235 | 3, 3, 3, 2, 2 = 13 of 15 | Failure | 235, stage 2 |
| 3 | 2 | 6 × 2+ @ 235 | 2, 2, 2, 2, 2, 4 = 14 of 12 | Success | 245, stage 2 |
| 4 | 2 | 6 × 2+ @ 245 | 2, 2, 2, 2, 1, 1 = 10 of 12 | Failure | 245, stage 3 |
| 5 | 3 | 10 × 1+ @ 245 | 9 singles = 9 of 10 | Failure | 245 × 0.9 = 220.5 → 220, stage 1 |

### 7.3 nSuns 5/3/1 LP, 5-day version

Source structure (sources N1 to N5): TM is 90% of the 1RM. Each day has a T1 lift with nine sets and a T2 lift with eight to ten sets, all as a percent of a TM. The T1 lift has AMRAP sets. The reps on the 1+ set change that TM each week. The sources do not agree on which AMRAP set drives the change. Most name the 1+ set at 95%.

| Part | Model |
|---|---|
| Weeks | 1 week. The same week repeats. Each week end is also a cycle end. |
| Days | Day 1: Bench (volume), Press. Day 2: Squat, Sumo deadlift. Day 3: Press, Incline bench. Day 4: Deadlift, Front squat. Day 5: Bench, Close-grip bench. |
| T1 slot | `sets`: nine single set prescriptions with `percentTm`. AMRAP on the 95% 1+ set and on the last set. |
| T2 slot | `percentTm` with `tmExercise` when the T2 lift uses another TM. Example: Sumo deadlift reads the Deadlift TM (common sheet practice, UNVERIFIED). |
| Rule | On the T1 slot that drives each TM: `trainingMax`, timing `week`. The rule reads the first AMRAP set (the 1+ set). Steps: `[{ 5, +15 lb }, { 3, +10 lb }, { 1, +5 lb }]`. No `otherwise`. |
| Bench | Bench is T1 on day 1 and day 5. Only one of the two slots has the rule. |

The steps come from the AMRAP table: 0 to 1 reps, no change. 2 to 3 reps, +5 lb. 4 to 5 reps, +10 lb. 6 or more reps, +15 lb. The target of the 1+ set is 1, so "2 to 3 reps" is "1 to 2 over target". Source N4 gives +10 and +15 lb. Sources N2 and N3 give the ranges +5 to 10 and +10 to 15 lb. The model stores one number for each step. The lifter can edit it.

Worked plan, day 2, squat TM 300 lb and deadlift TM 400 lb:

| Set | Squat (T1) | Sumo deadlift (T2, Deadlift TM) |
|---|---|---|
| 1 | 75% → 225 × 5 | 50% → 200 × 5 |
| 2 | 85% → 255 × 3 | 60% → 240 × 5 |
| 3 | 95% → 285 × 1+ | 70% → 280 × 3 |
| 4 | 90% → 270 × 3 | 70% → 280 × 3 |
| 5 | 85% → 255 × 3 | 70% → 280 × 3 |
| 6 | 80% → 240 × 3 | 70% → 280 × 5 |
| 7 | 75% → 225 × 5 | 70% → 280 × 7 |
| 8 | 70% → 210 × 5 | 70% → 280 × 4 |
| 9 | 65% → 195 × 5+ | 70% → 280 × 6 |
| 10 | none | 70% → 280 × 8 |

Rule example: the lifter does 285 × 4 on the 1+ set. That is 3 over target, so the squat TM increases by 10 lb to 310 lb at the week end.

### 7.4 SBS-style RTF (Stronger By Science, reps to failure)

Source structure (sources S1, S2, S3): on the official page, the lifter does a final set to failure for each main lift. The lifter tries to match or beat a rep target. Loads change week to week from that result. Third-party sources add these details: 4 normal sets and 1 final set, 21 weeks in three 7-week blocks, and deloads in weeks 7, 14, and 21. A copy of the instructions (seen only in a search result) gives this TM rule:

- 2 or more reps short: decrease a lot.
- 1 rep short: decrease a little.
- 1 to 2 reps over: increase a little.
- Many reps over: increase a lot.

The exact percentages and the week targets are in the paid spreadsheet. They are UNVERIFIED.

| Part | Model |
|---|---|
| Weeks | 21 weeks in one block. Weeks 7, 14, and 21 have explicit lighter `weekSets` and the `deload` setting. |
| Main slot | `weekSets` for each week: `{ role: "work", count: 4, reps: R, load: percentTm P }` and `{ role: "work", reps: T, amrap: true, load: percentTm P }`. T is the rep target of the week. |
| Rule | `trainingMax`, timing `week`, steps by reps over target, and `otherwise` as a decrease. |

The numbers below are placeholders to show the mapping. They are not SBS values.

- Week values: P = 75%, R = 5, T = 8.
- Steps: 3 or more over, +2%. 1 or 2 over, +1%. On target, +0%. 1 under, −1%. Otherwise, −2%.

Worked plan, squat TM 300 lb: 4 × 5 @ 225 lb, then 1 × 8+ @ 225 lb. The lifter does 10 reps. That is 2 over target, so the TM increases by 1% to 303 lb. Next week at 75% the load is 227.25 lb, which rounds to 225 lb. The small change stays in the TM and shows in a later week. This is why the app does not round a TM.

### 7.5 RPE top set with back-off sets

Source structure (sources R1 to R4): the top set is written as sets × reps @ RPE, for example 1 × 5 @ RPE 8. Back-off sets use a load drop from the top set. Guides give 5 to 10% for strength. No official RTS or Barbell Medicine value was confirmed. RPE 10 is 0 reps in reserve, RPE 9 is 1, and RPE 8 is 2.

| Part | Model |
|---|---|
| Main slot | `sets`: `{ role: "work", reps: 5, rpe: 8, load: { type: "rpe" } }`, then `{ role: "backoff", count: 3, reps: 5, load: { type: "percentTop", percent: 90 } }`. |
| Warm-ups (optional) | `{ role: "warmup", reps: 5, load: percentTop 50 }`, `{ role: "warmup", reps: 3, load: percentTop 70 }`, `{ role: "warmup", reps: 1, load: percentTop 85 }`. These are a product example, not from a source. |
| Rule | `rpe`. |

Worked plan, squat. The last top set was 315 × 5 @ RPE 7.

| Set | Load | Planned |
|---|---|---|
| Top set | e1RM 399 × fraction for 5 @ RPE 8 | 323.5 → 325 × 5 @ 8 |
| Back-off 1 to 3 | 90% of the top set | 292.5 → 295 × 5 |

If the lifter logs the top set at 320 × 5, the back-off sets change. 90% of 320 is 288, which rounds to 290 lb.

### 7.6 What v1 cannot express

| Pattern | Example | v1 workaround |
|---|---|---|
| Back-off sets until an RPE is reached ("repeats", fatigue percent) | RTS "repeat 5 @ top load until RPE 9" | The lifter logs extra back-off sets. |
| Conditional changes other than stages | "If the AMRAP is over 10, add a set" | None. |
| Formula loads | TM × 0.85 + 5 | A sheet import lists the cell as not mapped. |
| Different exercises in each block | Block 2 replaces squat with pause squat | One program for each block. |
| A TM test week with a conditional reset | The 5/3/1 Forever TM test week (source W3) | Run the week, then edit the TM by hand. |
| Loads as a percent of the e1RM | "80% of e1RM" | Candidate for v2 (`percentE1rm`). |
| Supersets, timed holds, or cardio in a prescription | A plank for 60 s | The slot keeps its old fields. |
| Two slots for one lift on one day | 5/3/1 main sets and BBB as two entries | Put both in one slot. |

## 8. Runtime UX on mobile

The phone is the place to run a program. This section gives flows and states, not layouts.

### 8.1 Start a program day

1. The home "Next up" card (P1-02) shows these items:
   - The routine name.
   - The position: "Week 2 of 4 · Day 3 · Bench".
   - A "Deload" tag in a deload week.
   - The top set of the first lift: "270 lb × 3+ (90% of TM 300)".
2. The card menu has "Skip day" and "Choose day". "Choose day" opens a picker for the week and the day.
3. "Start" calls `createWorkout` with `routineId`, `routineDayIndex`, and `programWeek`.

### 8.2 TM setup

1. If a slot of the day reads a TM that does not exist, "Start" first opens the TM setup sheet.
2. For each lift, the lifter enters a TM, or a recent set (weight × reps).
3. For a recent set, the sheet shows the math: "e1RM 333 × 90% = TM 300". The percent is `program.tmPercentOfMax`, default 90.
4. "Save" writes `trainingMaxes` rows with `source: "setup"`.
5. "Skip for now" starts the workout. The rows without a TM show "Set TM", and the lifter selects the weight.

A `linear` slot without state does not need setup. It uses the first logged work weight (section 5.4).

### 8.3 Active workout

- Each program slot shows its plan rows. A row shows:
  - The number and the label: Warm-up, Work, AMRAP, or Back-off.
  - The load source: "85% TM".
  - The weight and reps: "255 × 5+".
  - The RPE target: "@8", or "2 RIR".
  - A done mark.
- The rule line and the reason line show under the exercise name (section 5.5).
- The set stepper starts at the first plan row that has no logged set. The lifter can tap another row to make it the next row.
- A logged set writes `planned` for its row, and `isWarmup` for a warm-up row.
- An AMRAP row shows "5+". The reps start at the target. The row also has "Missed (0 reps)". It logs the set with `reps: 0`, so a rule can see a failed AMRAP set.
- Back-off rows with `percentTop` change after the lifter logs the top set.
- The lifter can change the weight and reps of any set. The plan row keeps the planned values.
- A set after the last plan row is an extra set. It has no `planned`. Volume and e1RM count it. Rules ignore it.
- The session progress ("x of y sets") counts the plan rows.
- The rest timer uses `restSeconds` of the slot, as today.
- If a TM changes during the session (for example, from the web), the rows without a logged set change to the new loads. Logged rows keep their `planned` values.

### 8.4 Finish and summary

- The summary shows "What changes next" (P1-03) with one line for each entry in `progressionOutcomes`, for example "Squat: TM +10 lb → 310 lb".
- "Undo changes" calls `programs.undoWorkoutProgression`.
- At a cycle end, the summary shows "Cycle 2 done" and the new TM of each lift.

### 8.5 Training max screen

- The screen lists each lift that a program reads, with the current TM and the last reason.
- A tap opens the TM history: value, date, source, and reason.
- "Edit TM" writes a row with `source: "manual"`.
- A `linear` slot shows its working weight and stage. The lifter can edit them (`programs.setWorkingWeight`).

### 8.6 States

| State | What the lifter sees |
|---|---|
| Loading | Plan rows show a skeleton. The stepper waits for the plan, so the default does not jump. The active workout does the same for the weight step today. |
| No TM for a lift | The rows show "Set TM". The stepper uses the last logged weight. |
| Deload week | A "Deload" tag on the card and on the workout. The session does not change a working weight. At a cycle end, the cycle rule can change a TM. |
| No history for an RPE row | "Work up to 5 @ RPE 8". The stepper uses the last logged weight. |
| A rule changed a TM or working weight | The summary line, then the reason line on the next session. |
| Undo is available | "Undo changes" on the summary and on the workout detail. |
| The program changed during the session | Rows without a logged set follow the new program. Logged rows keep their plan. |
| The app version is old | The workout shows set counts and reps without plan rows. A save in the old editor fails with the update message from section 3.4. |

### 8.7 Web runtime

In v1, the web active workout runs a program day as a plain routine day. It reads the old fields, which the server fills from the current week. It writes no `planned`. The rules use the fallback match (section 5.4). Plan rows on the web are a follow-up.

## 9. Editing surfaces

### 9.1 Rules for every editor

- One mapper: `routine-editor.ts` carries `program`, `slotId`, `sets`, `weekSets`, and `progression` from load to save. It also fills `targetSets` and `targetReps` from `sets`, else from the first `weekSets` entry.
- Each save of `days` sends `editorVersion: 1`.
- Text and number inputs follow the house draft rule: `onChange` changes a local draft, and the value commits on blur or Apply. Number inputs use `type="text" inputMode="decimal"`.
- The editor calls `validateProgram` before a save, and shows each error on its field. The server calls it again.
- The preview uses `resolveSlotPlan` with the current TMs and state. It changes when a draft value changes (P2-02 acceptance).

### 9.2 Mobile builder

1. The routine editor gets a "Weeks" row. One week looks like the current editor.
2. "Add weeks" makes the routine a program. The editor gives each lifting slot `sets` from its old fields, and the rule `double` with 2 sessions at the top. The server gives each slot a `slotId`. The behavior stays the same until the lifter changes a slot.
3. Week chips select the week to edit. The week menu has: rename, deload on or off (with the two percents), copy week to another week, and delete week.
4. The edit exercise sheet gets a "Sets" list. Each row has a role, a count, reps, a range or AMRAP, a load type and value, and an RPE. A switch selects "All weeks" (`sets`) or "This week only" (`weekSets`).
5. The sheet gets a "Rule" picker with the settings in section 5.2, and the preview line.
6. The routine screen links to the training max screen (section 8.5).

### 9.3 Web grid editor (P2-04)

- The grid has one row for each set prescription. The columns are the same as the program CSV (section 10.2), with a computed preview weight at the end.
- Rows group by week, then day, then slot. A group can collapse.
- The lifter edits cells in place, with the keyboard. No dialog opens for each exercise.
- "Copy week" copies all rows of one week to another week.
- "Fill down" copies the value of one cell to the selected rows below it.
- The preview column uses the current TMs. It changes while the lifter types (P2-04 acceptance).
- Rules and TMs are not set fields, so they open in a side panel for each slot.
- "Save" writes `program` and `days` in one `updateRoutine` call. If `updatedAt` changed after the grid loaded, the grid warns before it saves. The last save wins, as today.

### 9.4 Templates (P2-03)

- Templates are JSON files in `packages/lib/src/program-templates/`, in the format of section 10.1.
- "Use template" calls `createRoutine` with the template content and the tag `template:<id>`. The lifter can edit all of it.
- The names are generic: "3-week TM wave with deload", "Tiered linear (T1, T2, T3)", "Double progression upper and lower", "RPE top set with back-offs".
- Each template has a test that resolves a full cycle and compares the loads with a table that a person computed by hand.

## 10. Import and export

### 10.1 Program JSON (the main format)

The format extends the current routine JSON that `routines.importRoutineFromJson` reads. Exercises use `name`, as now.

```json
{
  "version": 2,
  "exportType": "program",
  "name": "3-week TM wave with deload",
  "program": {
    "version": 1,
    "tmPercentOfMax": 90,
    "weeks": [
      { "name": "5s" }, { "name": "3s" }, { "name": "5/3/1" },
      { "name": "Deload", "deload": { "loadPercent": 100, "setsPercent": 50 } }
    ]
  },
  "days": [
    {
      "name": "Squat day",
      "exercises": [
        {
          "name": "Squat",
          "kind": "lifting",
          "slotId": "squat-main",
          "targetSets": 3,
          "targetReps": "5",
          "weekSets": [
            { "week": 0, "sets": [
              { "role": "work", "reps": 5, "load": { "type": "percentTm", "percent": 65 } },
              { "role": "work", "reps": 5, "load": { "type": "percentTm", "percent": 75 } },
              { "role": "work", "reps": 5, "amrap": true, "load": { "type": "percentTm", "percent": 85 } }
            ] }
          ],
          "progression": {
            "type": "trainingMax", "timing": "cycle",
            "steps": [{ "minRepsOverTarget": 0, "change": { "type": "amount", "value": 10, "unit": "lb" } }],
            "otherwise": { "type": "percent", "value": -10 }
          }
        }
      ]
    }
  ],
  "trainingMaxes": [{ "exercise": "Squat", "value": 300, "unit": "lb" }]
}
```

- Import runs `validateProgram`. On an error, it names the day, the exercise, and the field.
- Import offers to set the TMs in `trainingMaxes`. It does not write them without a confirmation.
- A file without `program` imports as today.
- New query `routines.exportRoutineAsJson` writes this format. Today no routine export exists, only the workout export.

### 10.2 Program CSV

The CSV carries the grid only. Rules and TMs travel in JSON only. A slot with `linear` stages exports the sets of its first stage, because the other stages are part of the rule. After a CSV import, the app tells the lifter that the program has no rules and no TMs yet.

- One row for each set prescription, header row first, UTF-8, RFC 4180, as `csv-write.ts` does now.
- Columns: `week, week_name, deload_load_percent, deload_sets_percent, day, day_name, exercise, role, sets, reps, reps_max, amrap, load_type, load_value, load_unit, tm_exercise, rpe, preview_weight, preview_unit`.
- `week` and `day` start at 1. Empty deload cells mean "not a deload week". `load_type` is one of `fixed`, `percentTm`, `working`, `percentTop`, `rpe`.
- Export writes each week in full. A slot that uses `sets` for all weeks repeats its rows in each week.
- Import groups rows by day and exercise into slots. For each slot, the most common week list becomes `sets`, and the other weeks become `weekSets`.
- Import ignores `preview_weight` and `preview_unit`, and any unknown column.
- Import lists each row that it cannot read, with the row number and the reason. It never drops a row silently. The lifter confirms before the save.
- The parser reuses `csv-parse.ts`.

### 10.3 Full data export

`users.exportAllData` (JSON) adds `trainingMaxes` (all rows), `programStates`, and the new fields of workouts and entries. The history CSV (`WORKOUT_CSV_COLUMNS`) adds `planned_reps` and `planned_weight` at the end, and `set_type` gets the values `amrap` and `backoff`. The history import already treats any `set_type` other than a warm-up word as a work set, so old files and new files both import.

### 10.4 Sheet to program (P3-04)

- The model maps a pasted range or CSV to the program JSON in section 10.1. The JSON format is the contract. The model never writes the database.
- The app validates the result with `validateProgram`.
- If the sheet has computed loads, the app resolves the program with the TMs from the sheet and compares each load. It lists each difference larger than one weight step.
- The model returns `unmapped: [{ cell, text, reason }]` for each cell that it cannot map. Examples: a formula other than a percent of a TM, or a conditional rule. The app shows that list before the save.
- The app shows the sheet and the result side by side. It saves only after the lifter confirms.

## 11. Analytics events

All events go through the current wrappers: `apps/mobile/src/lib/analytics.ts` on mobile and `posthog-js` on the web. The existing `is_internal` person property excludes staff accounts. No server-side capture is added.

| Event | When | Properties |
|---|---|---|
| `program_created` | A save creates a program, or converts a routine. | `source` (`blank`, `converted`, `template`, `json_import`, `csv_import`, `ai_sheet`), `week_count`, `day_count`, `slot_count`, `rule_types` (comma list), `uses_training_max` |
| `program_saved` | A save of a program from an editor. | `surface` (`mobile_builder`, `web_grid`), `week_count`, `set_entry_count` |
| `training_max_set` | The lifter saves a TM by hand or in setup. | `source` (`manual`, `setup`), `method` (`direct`, `from_set`) |
| `program_position_changed` | Skip day or choose day. | `action` (`skip`, `choose`), `from_week`, `to_week` |
| `progression_outcome_shown` | The summary shows a rule outcome. Once for each outcome. | `rule`, `result`, `timing` |
| `progression_outcome_undone` | The lifter taps Undo. | `outcome_count` |
| `program_cycle_completed` | The summary shows a cycle end. | `cycle_number`, `week_count` |
| `program_exported` | A program JSON or CSV export. | `format` (`json`, `csv`) |

New properties on existing events:

- `workout_started`: `is_program`, `program_week`, `program_cycle`, `is_deload`.
- `workout_completed`: `is_program`.
- `routine_imported`: `is_program`, `format`.
- `progression_suggestion_shown` and `progression_suggestion_accepted`: `rule_type`.

The funnel to watch has three steps. The last step is the north-star metric in the report.

1. `program_created`.
2. `workout_started` with `is_program`.
3. A second completed program workout on another day within 14 days.

## 12. Delivery plan

Deploy facts: a merge to `main` deploys the web at once. Convex deploys only by a manual `convex deploy`. The iOS app updates only by a manual OTA update. No slice adds a native module.

| # | Slice | Scope | Acceptance | Deploy | Tests |
|---|---|---|---|---|---|
| 1 | Lib core | `program.ts` (types, `resolveSlotPlan`, deload change, `roundToStep`), `program-rules.ts`, `program-position.ts`, `program-validate.ts`, RPE helpers in `e1rm.ts`, `sessionsAtTop` in `calculateProgressionSuggestion`. | Each rule type has unit tests with expected values from a hand calculation (P2-02). The five plans in section 7 resolve to the tables in section 7. Old `calculateProgressionSuggestion` tests pass with no change. | None. | `bun test` in `packages/lib`. |
| 2 | Backend storage | Shared validators. Schema additions. New modules `programs.ts` and `trainingMaxes.ts`, with `bunx convex codegen`. `createRoutine`, `updateRoutine` (`editorVersion` guard), `importRoutineFromJson`. `updateLiftingEntry` keeps `planned`. `trainingMaxes` queries and mutations. `programStates` read, `setPosition`, `setWorkingWeight`. `deleteRoutine` removes state. | An old routine round trip is byte-for-byte the same. Program fields persist. A `days` save without `editorVersion` on a program fails. A TM history returns the newest row first. The largest template at 26 weeks stays under the limits. | Convex deploy. No client uses it yet. | convex-test in `packages/backend`. |
| 3 | Backend runtime | `createWorkout` week snapshot. `getRoutineExercisesForWorkout` returns the program fields and fills the old fields from the week. `completeWorkout` runs the rules and the advance, and writes `progressionOutcomes`. `skipDay`, `undoWorkoutProgression`. `getExerciseHistory` gets `excludeDeload`. `addLiftingEntry` accepts 0 reps for a planned AMRAP set. | A simulated 5/3/1 cycle (12 sessions) ends with TM +10 lb, and the deload week changes nothing. A GZCLP T1 simulation matches the table in section 7.2. A completion with no `planned` uses the fallback match. Old routines complete with no new writes. | Convex deploy before slice 4 ships. | convex-test. |
| 4 | Mobile runtime | Plan rows in the active workout, `planned` on logged sets, TM setup sheet, next-up card with week, skip and choose day, summary outcomes and Undo, TM screen. Analytics events. | A lifter runs a 3-week TM wave with a deload from a template or JSON import, from start to end, on the phone. Old routines show today's screen. | OTA after the Convex deploy of slices 2 and 3. | Jest through the real screens: active workout, summary, home. No iOS simulator on the build host. |
| 5 | Templates (P2-03) | Four JSON templates, "Use template" on the Routines tab and in onboarding (P1-01). | Each template resolves a full cycle with the hand-built table. | OTA. Convex only if slice 2 is not deployed. | `bun test` on the templates, Jest on the picker. |
| 6 | Mobile builder | Weeks row, week chips and menu, set list editor, "All weeks" or "This week only", rule picker with preview. Mapper changes in `routine-editor.ts`. | A lifter builds a 3-week TM wave with a deload on the phone (P2-01). A rule change moves the preview at once (P2-02). An edit and save keeps every program field. | OTA after Convex. | Mapper round-trip tests. Jest through the editor and the sheet with the draft rule (type, blur, one commit). |
| 7 | Web grid (P2-04) | Grid, copy week, fill down, preview column, rule and TM side panel. | A lifter builds a 4-week, 4-day program with no dialog for each exercise. Copy a week, change one percent, and the preview changes all affected loads. | Merge only after the Convex deploy of slice 2. | `bun test` in `apps/web` through the real grid. |
| 8 | Import and export | Program JSON export and import, program CSV export and import, `exportAllData` additions, history CSV columns. | A JSON round trip of each template gives the same program. A CSV round trip gives the same grid: weeks, days, slots, and sets. CSV import says that it sets no rules and no TMs. Bad rows are listed, not dropped. | Convex deploy, then web merge, then OTA. | Lib and backend tests. |
| 9 | Sheet to program (P3-04, Pro) | Model call, validation, load comparison, unmapped list, side-by-side review. | A common TM-wave sheet and a linear tier sheet convert with correct targets for all weeks. Unmapped cells show before the save. | Convex deploy, then web, then OTA. | Fixture sheets with expected programs. |

Slices 1 to 4 and 6 complete P2-01 and P2-02. Slice 4 can ship before slice 6, because a template or a JSON import gives the lifter a program to run.

## 13. Risks

| Risk | Mitigation |
|---|---|
| An old client saves a program and drops its fields (the P0-01 class of bug). | The `editorVersion` guard in `updateRoutine`. The mapper carries every field. Mapper round-trip tests. |
| An automatic TM change surprises the lifter. | The reason line shows the numbers. Undo on the summary. The TM history. Open question 1. |
| Program loads do not match the sheet of the lifter by one step. | One rounding rule (nearest, half up) with tests. The P2-03 check against a hand-built sheet. Open question 3. |
| Large programs make large routine documents. `getRoutines` sends all routines to the home screen. | The limits in section 3.5 (about 360 KB at most). A smaller list query is a follow-up if needed. |
| Exercise names are the key for TMs and history. A rename breaks the link. | Rows store `exerciseId` when known. P2-05 moves the keys to IDs. |
| Double progression reads history by exercise name. Two slots of one lift on different days mix their history. | Today's behavior, with no change. Slot history through `planned.slotId` is a follow-up. |
| Old app versions show wrong suggested weights on program days until the OTA. | The server fills the old fields from the week. The OTA follows the Convex deploy at once. |
| The RPE math (Epley with RIR) differs from the RTS chart by up to 1.75 points. | Section 4.5 states the difference. Open question 7. |
| A deload session lowers the double progression target after the deload. | Progression callers send `excludeDeload: true` to `getExerciseHistory`. |
| An edit of a completed workout does not change the rule result. | Undo, and manual TM and working weight edits. Open question 6. |
| Program names can be trademarks. | Generic template names (section 9.4). Open question 8. |

## 14. Open questions for Dominic

| # | Question | Recommendation |
|---|---|---|
| 1 | Do rule outcomes apply at once, or does the lifter confirm each one? | Apply at once, with the reason line and Undo. A sheet changes at once too. The P3-03 health rule keeps its Apply step, because it uses outside data. |
| 2 | Is the TM shared by all programs of a lifter, or kept for each program? | Shared, as P2-01 says. One squat TM is what lifters expect. A slot can read another lift's TM with `tmExercise`. |
| 3 | Rounding: only "nearest", or also "round down"? | Only "nearest" in v1. Add a program setting for "down" if the P2-03 check against real sheets fails. |
| 4 | Which editor comes first: the mobile builder or the web grid? | Mobile runtime and templates first (slices 4 and 5), then the mobile builder (slice 6), then the web grid (slice 7). Most users are on the phone. A template gives a program to run before any builder ships. |
| 5 | Is the program engine free? | Free, as the council decided. Health rules (P3-03) and sheet conversion (P3-04) stay Pro. |
| 6 | When a lifter edits a completed workout, do the rules run again? | Not in v1. Undo and manual edits cover it. Run again later, only when the workout is the newest program workout of that routine. |
| 7 | Do RPE loads use the RTS chart in place of Epley with RIR? | No. One e1RM formula for the whole app. Only one third-party copy of the chart was checked. Revisit if lifters report differences. |
| 8 | Do templates use program names (5/3/1, GZCLP, nSuns)? | No. Use generic names, as P2-03 says, unless we get the rights. The docs can say "in the style of". |
| 9 | No source confirms some template defaults: the 5/3/1 reset of −10%, the GZCLP T1 reset of 10%, the T2 reset of +15 lb, and the deload percents. Are they acceptable? | Yes, as editable defaults. Each one shows in the rule line, so the lifter sees it and can change it. |

## 15. Sources

A research pass fetched these pages on 2026-11-12. "Snippet" means that only a search result was read.

5/3/1:

- W1. Garage Gym Reviews, "5/3/1 workout": https://www.garagegymreviews.com/5-3-1-workout (week table, +5/+10 lb, BBB 5 × 10, rounding examples; says the article gives no reset rule and no warm-ups).
- W2. Lift Vault, "Jim Wendler's 5/3/1 spreadsheet": https://liftvault.com/programs/strength/jim-wendlers-531-spreadsheet/ (TM 90%, week table, BBB at 50 to 60% of TM).
- W3. The Fitness Wiki, "5/3/1 primer": https://thefitness.wiki/5-3-1-primer/ (TM 85% or 90%, later 3-week cycles, TM test week).
- The original T-Nation article (https://www.t-nation.com/workouts/5-3-1-how-to-build-pure-strength/) returned 404.

GZCLP:

- G1. The Fitness Wiki, "GZCLP": https://thefitness.wiki/routines/gzclp/ (day layout, tier tables, increments, T2 reset +15 to 20 lb, T3 at 25 reps, the meaning of failure).
- G2. The Fitness Wiki archive of the original post: https://thefitness.wiki/reddit-archive/gzcl-method-novice-to-elite/ (base volume failure rule, T1 retest at 85%).
- G3. Boostcamp, "GZCLP": https://www.boostcamp.app/coaches/cody-lefever/gzcl-program-gzclp (3-day and 4-day schedules, kg increments, T2 reset +20 lb or 10 kg, T3 failure drop).
- G4. Liftosaur, "GZCLP": https://www.liftosaur.com/programs/gzclp (T1 10% reset option, T2 +15 lb text).
- Cody Lefever's own blog covers the general GZCL method only, not GZCLP: http://swoleateveryheight.blogspot.com/2014/07/the-gzcl-method-simplified_13.html

nSuns:

- N1. StrongRFastR, nSuns LP 5-day in % of TM: https://www.strongrfastr.com/en/api/v1/workout_routines/73093/preview_pdf.html (day sets, TM 90%).
- N2. Muscle Evo, "nSuns program": https://muscleevo.net/nsuns-program/ (squat day sets, progression table with ranges, weekly change).
- N3. The Fitness Wiki, "nSuns LP": https://thefitness.wiki/routines/nsuns-lp/ (TM 90%, weekly AMRAP progression).
- N4. Liftosaur, "nSuns": https://www.liftosaur.com/programs/nsuns (5-day layout, sets in % of 1RM, table with +5, +10, +15 lb).
- N5. Lift Vault, "nSuns spreadsheets": https://liftvault.com/programs/strength/n-suns-lifting-spreadsheets/ (progression table, weekly).
- The original Reddit post was not reachable.

SBS RTF:

- S1. Stronger By Science, program bundle: https://www.strongerbyscience.com/program-bundle/ (final set to failure against a rep target, week-to-week changes, 21 weeks in three blocks).
- S2. Lift Vault, "SBS program bundle": https://liftvault.com/programs/strength/stronger-by-science-sbs-program-bundle-by-greg-nuckols/ (4 + 1 sets, deload weeks, approximate TM changes; third party).
- S3. A copy of the SBS instructions: https://studylib.net/doc/25783740/instructions (snippet only; the fetch returned HTTP 429).

RPE top set and back-off sets:

- R1. Mike Tuchscherer, EliteFTS, "Rate of perceived exertion": https://elitefts.com/blogs/training/rate-of-perceived-exertion-rpe (RPE definitions, top set style).
- R2. Fitness Volt, "Tuchscherer chart explained": https://fitnessvolt.com/rpe-training/guides/tuchscherer-chart-explained (RPE chart values; a third-party copy).
- R3. RippedBody, "RPE": https://rippedbody.com/rpe/ (RPE and RIR table).
- R4. Brainbound, "RPE drop-out training guide": https://brainbound.blog/rpe-dropout-training-guide (back-off load drop of 5 to 10%; a blog).

Market context: `research.md` and `report.md` in the hill-climb artifacts (Liftosaur and Liftoscript, spreadsheet barriers, the council ranking).
