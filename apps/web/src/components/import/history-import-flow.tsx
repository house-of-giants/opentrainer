"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend/convex/_generated/dataModel";
import { FileUp, Loader2 } from "lucide-react";
import { parseCsv } from "@opentrainer/lib/csv-parse";
import {
  buildImportPlan,
  chunkWorkouts,
  detectImportSource,
  matchExerciseName,
  settingsForSource,
  type ImportSettings,
  type ImportSource,
} from "@opentrainer/lib/history-import";
import { normalizeExerciseName } from "@opentrainer/lib/exercise-names";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ColumnMappingStep } from "./column-mapping-step";
import { CREATE_EXERCISE, ImportReviewStep } from "./import-review-step";

type Step = "file" | "map" | "review" | "importing" | "done";

type LoadedFile = { name: string; headers: string[]; rows: string[][] };

type ImportResult = {
  created: number;
  duplicates: number;
  sets: number;
  exercisesCreated: number;
};

export function HistoryImportFlow() {
  const user = useQuery(api.users.getCurrentUser);
  // getExercises returns only system exercises until auth is ready. Wait for
  // Convex auth so the user's custom exercises are matched too.
  const { isAuthenticated } = useConvexAuth();
  const allExercises = useQuery(api.exercises.getExercises, isAuthenticated ? {} : "skip");
  const createExercise = useMutation(api.exercises.createExercise);
  const importWorkouts = useMutation(api.historyImport.importWorkouts);

  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [detectedSource, setDetectedSource] = useState<ImportSource>("custom");
  const [source, setSource] = useState<ImportSource>("custom");
  const [settings, setSettings] = useState<ImportSettings | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const fallbackUnit = user?.preferredUnits === "kg" ? "kg" : "lb";
  const exercises = useMemo(
    () => allExercises?.filter((exercise) => exercise.category === "lifting"),
    [allExercises]
  );
  const plan = useMemo(() => {
    if (!file || !settings) return null;
    // Names that match a cardio or mobility exercise, and no lifting one,
    // are cardio rows. They are listed as skipped until cardio import exists.
    const otherExercises = allExercises?.filter((e) => e.category !== "lifting") ?? [];
    const isCardio = (name: string) =>
      !matchExerciseName(name, exercises ?? []) && !!matchExerciseName(name, otherExercises);
    return buildImportPlan(file.rows, settings, { isCardio });
  }, [file, settings, allExercises, exercises]);

  const handleFile = async (selected: File | undefined) => {
    if (!selected) return;
    setFileError(null);
    try {
      const { headers, rows } = parseCsv(await selected.text());
      if (headers.length === 0 || rows.length === 0) {
        setFileError("This file has no rows to import.");
        return;
      }
      const detected = detectImportSource(headers);
      setFile({ name: selected.name, headers, rows });
      setDetectedSource(detected);
      setSource(detected);
      setSettings(settingsForSource(detected, headers, fallbackUnit));
      setChoices({});
      setStep("map");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "This file can't be read.");
    }
  };

  const handleSourceChange = (next: ImportSource) => {
    if (!file) return;
    setSource(next);
    setSettings(settingsForSource(next, file.headers, fallbackUnit));
  };

  const goToReview = () => {
    if (!plan || !exercises) return;
    // Keep choices the user already made; prefill matches for new names.
    const next: Record<string, string> = {};
    for (const { name } of plan.exerciseNames) {
      const key = normalizeExerciseName(name);
      const match = matchExerciseName(name, exercises);
      const chosen = choices[key] ?? match?.exerciseId;
      if (chosen) next[key] = chosen;
    }
    setChoices(next);
    setStep("review");
  };

  const runImport = async () => {
    if (!plan) return;
    setStep("importing");
    setImportError(null);

    const toCreate = plan.exerciseNames.filter(
      ({ name }) => choices[normalizeExerciseName(name)] === CREATE_EXERCISE
    );
    const resolved = new Map<string, Id<"exercises">>();
    for (const { name } of plan.exerciseNames) {
      const choice = choices[normalizeExerciseName(name)];
      if (choice && choice !== CREATE_EXERCISE) {
        resolved.set(normalizeExerciseName(name), choice as Id<"exercises">);
      }
    }

    try {
      const batches = chunkWorkouts(plan.workouts);
      const total = toCreate.length + batches.length;
      let done = 0;
      setProgress({ done, total });

      for (const { name, timed } of toCreate) {
        const id = await createExercise({
          name,
          category: "lifting",
          measurementType: timed ? "duration" : undefined,
        });
        resolved.set(normalizeExerciseName(name), id);
        setProgress({ done: ++done, total });
      }

      const totals: ImportResult = {
        created: 0,
        duplicates: 0,
        sets: 0,
        exercisesCreated: toCreate.length,
      };
      for (const batch of batches) {
        const saved = await importWorkouts({
          workouts: batch.map((workout) => ({
            ...workout,
            sets: workout.sets.map((set) => ({
              ...set,
              exerciseId: resolved.get(normalizeExerciseName(set.exerciseName)),
            })),
          })),
        });
        totals.created += saved.created;
        totals.duplicates += saved.duplicates;
        totals.sets += saved.sets;
        setProgress({ done: ++done, total });
      }

      setResult(totals);
      setStep("done");
    } catch (error) {
      console.error("History import failed:", error);
      setImportError("A batch of workouts couldn't be saved. Check your connection and try again.");
    }
  };

  const reset = () => {
    setStep("file");
    setFile(null);
    setSettings(null);
    setChoices({});
    setResult(null);
    setImportError(null);
  };

  if (step === "file" || !file || !settings || !plan) {
    return <FileStep error={fileError} onFile={handleFile} />;
  }

  if (step === "map") {
    return (
      <ColumnMappingStep
        fileName={file.name}
        headers={file.headers}
        sampleRow={file.rows[0] ?? []}
        detectedSource={detectedSource}
        source={source}
        settings={settings}
        loadingExercises={exercises === undefined}
        onSourceChange={handleSourceChange}
        onSettingsChange={setSettings}
        onBack={reset}
        onContinue={goToReview}
      />
    );
  }

  if (step === "review") {
    return (
      <ImportReviewStep
        plan={plan}
        exercises={exercises ?? []}
        choices={choices}
        onChoicesChange={setChoices}
        onBack={() => setStep("map")}
        onImport={runImport}
      />
    );
  }

  if (step === "importing") {
    const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <Card className="space-y-4 p-6" aria-live="polite">
        {importError ? (
          <>
            <h2 className="text-lg font-semibold">The import stopped</h2>
            <p className="text-sm text-muted-foreground">{importError}</p>
            <p className="text-sm text-muted-foreground">
              Workouts that were saved stay saved. Try again to import the rest; saved
              workouts are skipped, not copied.
            </p>
            <div className="flex gap-2">
              <Button onClick={runImport}>Try again</Button>
              <Button variant="ghost" onClick={() => setStep("review")}>
                Back
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <h2 className="text-lg font-semibold">Importing…</h2>
            </div>
            <Progress value={percent} aria-label="Import progress" />
            <p className="text-sm text-muted-foreground font-mono tabular-nums">
              {progress.done} of {progress.total} steps
            </p>
          </>
        )}
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-lg font-semibold">Import done</h2>
      <ul className="space-y-1 text-sm">
        <li>
          Added <span className="font-mono tabular-nums">{result?.created ?? 0}</span> workouts
          with <span className="font-mono tabular-nums">{result?.sets ?? 0}</span> sets.
        </li>
        {(result?.duplicates ?? 0) > 0 && (
          <li className="text-muted-foreground">
            Skipped <span className="font-mono tabular-nums">{result?.duplicates}</span>{" "}
            workouts that were already in OpenTrainer.
          </li>
        )}
        {(result?.exercisesCreated ?? 0) > 0 && (
          <li className="text-muted-foreground">
            Made <span className="font-mono tabular-nums">{result?.exercisesCreated}</span>{" "}
            custom {result?.exercisesCreated === 1 ? "exercise" : "exercises"}.
          </li>
        )}
      </ul>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/history">View history</Link>
        </Button>
        <Button variant="ghost" onClick={reset}>
          Import another file
        </Button>
      </div>
    </Card>
  );
}

function FileStep({
  error,
  onFile,
}: {
  error: string | null;
  onFile: (file: File | undefined) => void;
}) {
  const inputId = useId();
  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Bring your history</h2>
        <p className="text-sm text-muted-foreground">
          Choose a CSV export from Strong, Hevy, OpenTrainer, or your own spreadsheet. You
          check everything before anything is saved.
        </p>
      </div>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring"
      >
        <FileUp className="h-6 w-6 text-muted-foreground" />
        <span className="font-medium">Choose CSV file</span>
        <span className="text-xs text-muted-foreground">One row per set, with a header row</span>
        <input
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </Card>
  );
}
