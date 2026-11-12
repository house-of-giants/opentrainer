import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ImportPlan } from "@opentrainer/lib/history-import";
import { CREATE_EXERCISE, ImportReviewStep } from "./import-review-step";

const plan: ImportPlan = {
  workouts: [
    {
      startedAt: Date.UTC(2026, 9, 1),
      sets: [],
    } as unknown as ImportPlan["workouts"][number],
  ],
  setCount: 6,
  exerciseNames: [
    { name: "Landmine Press", setCount: 3, timed: false },
    { name: "Bench Press", setCount: 3, timed: false },
  ],
  skipped: [],
};

const exercises = [{ _id: "ex_bench", name: "Bench Press" }];

function renderStep(customMuscleGroups: Record<string, string[]>) {
  return renderToStaticMarkup(
    <ImportReviewStep
      plan={plan}
      exercises={exercises}
      choices={{ "landmine press": CREATE_EXERCISE, "bench press": "ex_bench" }}
      onChoicesChange={() => {}}
      muscleGroups={["back", "chest", "shoulders", "triceps"]}
      customMuscleGroups={customMuscleGroups}
      onCustomMuscleGroupsChange={() => {}}
      onBack={() => {}}
      onImport={() => {}}
    />
  );
}

/** The checkbox for one muscle inside the picker for one exercise name. */
function muscleCheckbox(html: string, exerciseName: string, muscle: string) {
  const fieldset = html.match(
    new RegExp(`<fieldset[^>]*><legend[^>]*>Muscle groups for ${exerciseName}</legend>.*?</fieldset>`)
  )?.[0];
  assert.ok(fieldset, `muscle picker for ${exerciseName}`);
  const label = fieldset.match(new RegExp(`<label[^>]*>(?:(?!</label>).)*${muscle}</label>`))?.[0];
  assert.ok(label, `${muscle} option for ${exerciseName}`);
  return label.match(/<button[^>]*role="checkbox"[^>]*>/)?.[0] ?? "";
}

describe("ImportReviewStep muscle groups for new custom exercises", () => {
  test("offers an optional muscle choice only for names that become custom exercises", () => {
    const html = renderStep({});

    assert.match(html, /Muscle groups for Landmine Press/);
    assert.doesNotMatch(html, /Muscle groups for Bench Press/);
    assert.match(html, /Add muscle groups \(optional\)/);
    assert.match(muscleCheckbox(html, "Landmine Press", "shoulders"), /aria-checked="false"/);
  });

  test("shows the muscles already chosen for a new custom exercise", () => {
    const html = renderStep({ "landmine press": ["shoulders", "triceps"] });

    assert.match(html, /Muscle groups: <span class="capitalize">shoulders, triceps<\/span>/);
    assert.match(muscleCheckbox(html, "Landmine Press", "shoulders"), /aria-checked="true"/);
    assert.match(muscleCheckbox(html, "Landmine Press", "triceps"), /aria-checked="true"/);
    assert.match(muscleCheckbox(html, "Landmine Press", "chest"), /aria-checked="false"/);
  });
});
