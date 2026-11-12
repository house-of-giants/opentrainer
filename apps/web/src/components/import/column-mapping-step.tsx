"use client";

import { useId } from "react";
import {
  IMPORT_FIELDS,
  IMPORT_SOURCE_LABELS,
  type ImportField,
  type ImportSettings,
  type ImportSource,
} from "@opentrainer/lib/history-import";
import type { WeightUnit } from "@opentrainer/lib/units";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NOT_IN_FILE = "none";
const SOURCES: ImportSource[] = ["strong", "hevy", "opentrainer", "custom"];

type ColumnMappingStepProps = {
  fileName: string;
  headers: string[];
  sampleRow: string[];
  detectedSource: ImportSource;
  source: ImportSource;
  settings: ImportSettings;
  loadingExercises: boolean;
  onSourceChange: (source: ImportSource) => void;
  onSettingsChange: (settings: ImportSettings) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function ColumnMappingStep({
  fileName,
  headers,
  sampleRow,
  detectedSource,
  source,
  settings,
  loadingExercises,
  onSourceChange,
  onSettingsChange,
  onBack,
  onContinue,
}: ColumnMappingStepProps) {
  const sourceLabelId = useId();
  const { mapping } = settings;
  const hasSetSize = mapping.reps !== undefined || mapping.durationSeconds !== undefined;
  const canContinue =
    mapping.date !== undefined && mapping.exercise !== undefined && hasSetSize;

  const setColumn = (field: ImportField, value: string) => {
    const next = { ...mapping };
    if (value === NOT_IN_FILE) {
      delete next[field];
    } else {
      next[field] = Number(value);
    }
    onSettingsChange({ ...settings, mapping: next });
  };

  const renderField = ({ field, label, required }: (typeof IMPORT_FIELDS)[number]) => {
    const index = mapping[field];
    const sample = index === undefined ? "" : sampleRow[index] ?? "";
    return (
      <div key={field} className="space-y-1">
        <Label htmlFor={`column-${field}`}>
          {label}
          {required && <span className="text-muted-foreground font-normal">(needed)</span>}
        </Label>
        <Select
          value={index === undefined ? NOT_IN_FILE : String(index)}
          onValueChange={(value) => setColumn(field, value)}
        >
          <SelectTrigger id={`column-${field}`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NOT_IN_FILE}>Not in file</SelectItem>
            {headers.map((header, i) => (
              <SelectItem key={i} value={String(i)}>
                {header || `Column ${i + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="min-h-4 truncate text-xs text-muted-foreground font-mono">
          {sample && `e.g. ${sample}`}
        </p>
      </div>
    );
  };

  return (
    <Card className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Match the columns</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{fileName}</span>. Pick the app that made the file, then
          check each column.
        </p>
      </div>

      <section className="space-y-2">
        <p id={sourceLabelId} className="text-sm font-medium">
          File from
        </p>
        <RadioGroup
          aria-labelledby={sourceLabelId}
          value={source}
          onValueChange={(value) => onSourceChange(value as ImportSource)}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {SOURCES.map((option) => (
            <Label
              key={option}
              htmlFor={`source-${option}`}
              className="flex cursor-pointer items-center gap-2 rounded-md border p-3 has-[button[data-state=checked]]:border-primary"
            >
              <RadioGroupItem id={`source-${option}`} value={option} />
              <span>{IMPORT_SOURCE_LABELS[option]}</span>
              {option === detectedSource && option !== "custom" && (
                <Badge variant="secondary">Detected</Badge>
              )}
            </Label>
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Columns</h3>
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {IMPORT_FIELDS.filter((f) => f.primary).map(renderField)}
        </div>
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            More columns
          </summary>
          <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {IMPORT_FIELDS.filter((f) => !f.primary).map(renderField)}
          </div>
        </details>
      </section>

      <section className="space-y-1">
        <Label htmlFor="default-unit">
          Weights with no unit are in
        </Label>
        <Select
          value={settings.defaultUnit}
          onValueChange={(value) =>
            onSettingsChange({ ...settings, defaultUnit: value as WeightUnit })
          }
        >
          <SelectTrigger id="default-unit" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lb">Pounds (lb)</SelectItem>
            <SelectItem value="kg">Kilograms (kg)</SelectItem>
          </SelectContent>
        </Select>
        {source === "strong" && mapping.unit === undefined && (
          <p className="text-xs text-muted-foreground">
            Strong&apos;s iPhone export has no unit column. Pick the unit you used in Strong.
          </p>
        )}
      </section>

      {!canContinue && (
        <p className="text-sm text-muted-foreground">
          Choose the date, exercise, and reps (or time) columns to continue.
        </p>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          Choose another file
        </Button>
        <Button onClick={onContinue} disabled={!canContinue || loadingExercises}>
          {loadingExercises ? "Loading exercises…" : "Preview import"}
        </Button>
      </div>
    </Card>
  );
}
