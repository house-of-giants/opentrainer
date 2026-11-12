"use client";

import { useMemo } from "react";
import {
  matchExerciseName,
  SKIP_REASON_LABELS,
  type ImportPlan,
  type MatchableExercise,
  type SkipReason,
} from "@opentrainer/lib/history-import";
import { normalizeExerciseName } from "@opentrainer/lib/exercise-names";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Choice value for "make a custom exercise with this name". */
export const CREATE_EXERCISE = "__create__";

const PREVIEW_WORKOUTS = 10;

type ImportReviewStepProps = {
  plan: ImportPlan;
  exercises: MatchableExercise[];
  choices: Record<string, string>;
  onChoicesChange: (choices: Record<string, string>) => void;
  onBack: () => void;
  onImport: () => void;
};

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ImportReviewStep({
  plan,
  exercises,
  choices,
  onChoicesChange,
  onBack,
  onImport,
}: ImportReviewStepProps) {
  const sortedExercises = useMemo(
    () => [...exercises].sort((a, b) => a.name.localeCompare(b.name)),
    [exercises]
  );
  const names = useMemo(
    () =>
      plan.exerciseNames.map((entry) => ({
        ...entry,
        key: normalizeExerciseName(entry.name),
        match: matchExerciseName(entry.name, exercises),
      })),
    [plan.exerciseNames, exercises]
  );
  const unresolved = names.filter(({ key }) => !choices[key]);
  const toCreate = names.filter(({ key }) => choices[key] === CREATE_EXERCISE).length;

  const skippedByReason = useMemo(() => {
    const groups = new Map<SkipReason, number[]>();
    for (const { row, reason } of plan.skipped) {
      const rows = groups.get(reason);
      if (rows) rows.push(row);
      else groups.set(reason, [row]);
    }
    return [...groups.entries()];
  }, [plan.skipped]);

  const createRemaining = () => {
    const next = { ...choices };
    for (const { key } of unresolved) next[key] = CREATE_EXERCISE;
    onChoicesChange(next);
  };

  const first = plan.workouts[0];
  const last = plan.workouts[plan.workouts.length - 1];
  const shown = plan.workouts.slice(0, PREVIEW_WORKOUTS);

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Check before you import</h2>
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-xs text-muted-foreground">Workouts</dt>
            <dd className="text-2xl font-mono font-bold tabular-nums">{plan.workouts.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sets</dt>
            <dd className="text-2xl font-mono font-bold tabular-nums">{plan.setCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dates</dt>
            <dd className="text-sm font-medium">
              {first ? `${formatDate(first.startedAt)} – ${formatDate(last.startedAt)}` : "None"}
            </dd>
          </div>
        </dl>

        {plan.skipped.length > 0 && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">
              {plan.skipped.length} {plan.skipped.length === 1 ? "row" : "rows"} won&apos;t be
              imported
            </p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {skippedByReason.map(([reason, rows]) => (
                <li key={reason}>
                  {SKIP_REASON_LABELS[reason]}: {rows.length}{" "}
                  {rows.length <= 5 ? (
                    `(row${rows.length === 1 ? "" : "s"} ${rows.join(", ")})`
                  ) : (
                    <details className="inline">
                      <summary className="inline cursor-pointer underline-offset-2 hover:underline">
                        (rows {rows.slice(0, 5).join(", ")}, …)
                      </summary>
                      <span className="block font-mono text-xs">{rows.join(", ")}</span>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.workouts.length === 0 && (
          <p role="alert" className="text-sm text-destructive">
            No workouts found. Go back and check the date, exercise, and reps columns.
          </p>
        )}
      </Card>

      {names.length > 0 && (
        <Card className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className="font-semibold">Exercises</h3>
              <p className="text-sm text-muted-foreground">
                Match each name to an OpenTrainer exercise, or make it a custom exercise.
              </p>
            </div>
            {unresolved.length > 0 && (
              <Button variant="outline" size="sm" onClick={createRemaining}>
                Make {unresolved.length} custom
              </Button>
            )}
          </div>
          <ul className="divide-y">
            {names.map(({ key, name, setCount, match }) => {
              const choice = choices[key];
              return (
                <li key={key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{name}</p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">
                        {setCount} {setCount === 1 ? "set" : "sets"}
                      </span>
                      {!choice ? (
                        <Badge variant="destructive">Needs a choice</Badge>
                      ) : match?.kind === "suggested" && choice === match.exerciseId ? (
                        <Badge variant="outline">Suggested match</Badge>
                      ) : null}
                    </p>
                  </div>
                  <Select
                    value={choice ?? ""}
                    onValueChange={(value) => onChoicesChange({ ...choices, [key]: value })}
                  >
                    <SelectTrigger aria-label={`Exercise for ${name}`} className="w-full sm:w-64">
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CREATE_EXERCISE}>New custom exercise “{name}”</SelectItem>
                      <SelectSeparator />
                      {sortedExercises.map((exercise) => (
                        <SelectItem key={exercise._id} value={exercise._id}>
                          {exercise.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {shown.length > 0 && (
        <Card className="space-y-3 p-6">
          <h3 className="font-semibold">Workouts</h3>
          <ul className="divide-y">
            {shown.map((workout) => {
              const counts = new Map<string, number>();
              for (const set of workout.sets) {
                counts.set(set.exerciseName, (counts.get(set.exerciseName) ?? 0) + 1);
              }
              return (
                <li key={`${workout.startedAt}-${workout.title ?? ""}`} className="py-2">
                  <p className="flex justify-between gap-2 text-sm">
                    <span className="font-medium">{workout.title || "Workout"}</span>
                    <span className="text-muted-foreground">{formatDate(workout.startedAt)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[...counts.entries()].map(([name, n]) => `${name} × ${n}`).join(" · ")}
                  </p>
                </li>
              );
            })}
          </ul>
          {plan.workouts.length > shown.length && (
            <p className="text-xs text-muted-foreground">
              And {plan.workouts.length - shown.length} more workouts.
            </p>
          )}
        </Card>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back to columns
        </Button>
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={onImport}
            disabled={plan.workouts.length === 0 || unresolved.length > 0}
          >
            Import {plan.workouts.length} workouts
          </Button>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {unresolved.length > 0
              ? `Choose an exercise for ${unresolved.length} ${unresolved.length === 1 ? "name" : "names"} first.`
              : toCreate > 0
                ? `Makes ${toCreate} custom ${toCreate === 1 ? "exercise" : "exercises"}.`
                : "Workouts already in OpenTrainer are skipped."}
          </p>
        </div>
      </div>
    </div>
  );
}
