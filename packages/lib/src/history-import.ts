import { normalizeExerciseName } from "./exercise-names";
import type { WeightUnit } from "./units";

// ============================================================================
// Columns and mapping
// ============================================================================

export type ImportField =
  | "date"
  | "exercise"
  | "setNumber"
  | "weight"
  | "unit"
  | "reps"
  | "rpe"
  | "notes"
  | "setType"
  | "durationSeconds"
  | "rir"
  | "distance"
  | "workoutTitle"
  | "workoutNotes"
  | "workoutEnd"
  | "workoutDuration";

export const IMPORT_FIELDS: ReadonlyArray<{
  field: ImportField;
  label: string;
  required?: boolean;
  primary?: boolean;
}> = [
  { field: "date", label: "Date", required: true, primary: true },
  { field: "exercise", label: "Exercise", required: true, primary: true },
  { field: "setNumber", label: "Set", primary: true },
  { field: "weight", label: "Weight", primary: true },
  { field: "unit", label: "Unit", primary: true },
  { field: "reps", label: "Reps", primary: true },
  { field: "rpe", label: "RPE", primary: true },
  { field: "notes", label: "Notes", primary: true },
  { field: "setType", label: "Set type" },
  { field: "durationSeconds", label: "Time (seconds)" },
  { field: "rir", label: "RIR" },
  { field: "distance", label: "Distance" },
  { field: "workoutTitle", label: "Workout name" },
  { field: "workoutNotes", label: "Workout notes" },
  { field: "workoutEnd", label: "Workout end time" },
  { field: "workoutDuration", label: "Workout length" },
];

/** Column index for each mapped field. */
export type ColumnMapping = Partial<Record<ImportField, number>>;

export type ImportSource = "strong" | "hevy" | "opentrainer" | "custom";

export type ImportSettings = {
  mapping: ColumnMapping;
  /** Unit for weights when the file has no unit column or the cell is empty. */
  defaultUnit: WeightUnit;
};

function headerKey(header: string) {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

const FIELD_HEADER_GUESSES: Record<ImportField, string[]> = {
  date: ["date", "start time", "started at", "workout date", "start"],
  exercise: ["exercise", "exercise name", "exercise title", "movement", "lift"],
  setNumber: ["set", "set number", "set order", "set index"],
  weight: [
    "weight", "load", "weight kg", "weight kgs", "weight lb", "weight lbs",
    "weight (kg)", "weight (kgs)", "weight (lb)", "weight (lbs)",
  ],
  unit: ["unit", "units", "weight unit"],
  reps: ["reps", "repetitions", "rep"],
  rpe: ["rpe"],
  notes: ["notes", "note", "set notes", "comment", "comments"],
  setType: ["set type", "type"],
  durationSeconds: ["seconds", "duration seconds", "time seconds"],
  rir: ["rir", "reps in reserve"],
  distance: ["distance", "distance km", "distance miles", "distance mi", "distance m"],
  workoutTitle: ["workout name", "workout title", "workout", "title", "session"],
  workoutNotes: ["workout notes", "description", "session notes"],
  workoutEnd: ["end time", "ended at", "end"],
  workoutDuration: ["duration", "workout duration"],
};

/** Maps each field to the first column whose header names it. */
export function guessColumnMapping(headers: string[]): ColumnMapping {
  const keys = headers.map(headerKey);
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  for (const { field } of IMPORT_FIELDS) {
    const index = keys.findIndex(
      (key, i) => !used.has(i) && FIELD_HEADER_GUESSES[field].includes(key)
    );
    if (index !== -1) {
      mapping[field] = index;
      used.add(index);
    }
  }
  return mapping;
}

/** "weight_kg" and "Weight (lbs)" name their unit. */
export function unitFromHeader(header: string | undefined): WeightUnit | undefined {
  if (!header) return undefined;
  const key = header.toLowerCase();
  if (/(^|[^a-z])kgs?([^a-z]|$)/.test(key)) return "kg";
  if (/(^|[^a-z])(lbs?|pounds?)([^a-z]|$)/.test(key)) return "lb";
  return undefined;
}

// ============================================================================
// Presets
// ============================================================================
// Column names come from real exports (see the PR for sources). Strong has
// several layouts: iOS (comma, no unit column), Android (semicolon, "Weight
// Unit" column), and newer files with the unit in the header, "Weight (kg)".
// Hevy names the unit in the header: weight_kg or weight_lbs.

type ImportPreset = {
  source: Exclude<ImportSource, "custom">;
  /** Normalized headers that identify the format. */
  signature: string[];
  columns: Partial<Record<ImportField, string[]>>;
};

const IMPORT_PRESETS: ImportPreset[] = [
  {
    source: "opentrainer",
    signature: ["date", "workout title", "exercise", "set number", "set type"],
    columns: {
      date: ["date"],
      workoutTitle: ["workout title"],
      exercise: ["exercise"],
      setNumber: ["set number"],
      setType: ["set type"],
      weight: ["weight"],
      unit: ["unit"],
      reps: ["reps"],
      durationSeconds: ["duration seconds"],
      rpe: ["rpe"],
      rir: ["rir"],
      notes: ["notes"],
    },
  },
  {
    source: "hevy",
    signature: ["start time", "exercise title", "set type"],
    columns: {
      date: ["start time"],
      workoutEnd: ["end time"],
      workoutTitle: ["title"],
      workoutNotes: ["description"],
      exercise: ["exercise title"],
      notes: ["exercise notes"],
      setType: ["set type"],
      weight: ["weight kg", "weight lbs"],
      reps: ["reps"],
      distance: ["distance km", "distance miles"],
      durationSeconds: ["duration seconds"],
      rpe: ["rpe"],
    },
  },
  {
    source: "strong",
    signature: ["date", "exercise name", "set order"],
    columns: {
      date: ["date"],
      workoutTitle: ["workout name"],
      workoutDuration: ["duration", "workout duration", "duration (sec)"],
      exercise: ["exercise name"],
      setNumber: ["set order"],
      weight: ["weight", "weight (kg)", "weight (lbs)", "weight (lb)", "lbs", "kg"],
      unit: ["weight unit"],
      reps: ["reps"],
      rpe: ["rpe"],
      distance: ["distance", "distance (meters)", "distance (km)", "distance (miles)", "mi.", "km"],
      durationSeconds: ["seconds"],
      notes: ["notes"],
      workoutNotes: ["workout notes"],
    },
  },
];

export const IMPORT_SOURCE_LABELS: Record<ImportSource, string> = {
  strong: "Strong",
  hevy: "Hevy",
  opentrainer: "OpenTrainer",
  custom: "Other spreadsheet",
};

/** Names the app that wrote a CSV file, from its header row. */
export function detectImportSource(headers: string[]): ImportSource {
  const keys = new Set(headers.map(headerKey));
  const preset = IMPORT_PRESETS.find((p) => p.signature.every((key) => keys.has(key)));
  return preset?.source ?? "custom";
}

/**
 * The column mapping and default unit for a source. "custom" guesses columns
 * by name. When the file has no unit column, the weight header's unit (for
 * example weight_kg) wins, then the user's own unit.
 */
export function settingsForSource(
  source: ImportSource,
  headers: string[],
  fallbackUnit: WeightUnit
): ImportSettings {
  const preset = IMPORT_PRESETS.find((p) => p.source === source);
  let mapping: ColumnMapping;
  if (preset) {
    const keys = headers.map(headerKey);
    mapping = {};
    for (const [field, names] of Object.entries(preset.columns) as Array<[ImportField, string[]]>) {
      const index = keys.findIndex((key) => names.includes(key));
      if (index !== -1) mapping[field] = index;
    }
  } else {
    mapping = guessColumnMapping(headers);
  }
  const headerUnit =
    mapping.weight === undefined ? undefined : unitFromHeader(headers[mapping.weight]);
  return { mapping, defaultUnit: headerUnit ?? fallbackUnit };
}

// ============================================================================
// Cell parsing
// ============================================================================

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function localTime(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0
): number | undefined {
  const date = new Date(year, month, day, hours, minutes, seconds, ms);
  // Reject roll-overs such as February 30.
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return undefined;
  }
  return date.getTime();
}

const ISO_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?(?:\s*([ap]m))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;
// Hevy's app writes "15 Jan 2023, 08:03".
const DAY_MONTH_YEAR =
  /^(\d{1,2}) ([a-z]{3,})\.? (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap]m))?$/i;
// hevy.com in English writes "Oct 1, 2026, 8:28 PM".
const MONTH_DAY_YEAR =
  /^([a-z]{3,})\.? (\d{1,2}),? (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap]m))?$/i;
// hevy.com in German writes "01.09.2026, 07:30" (day first).
const DOTTED_DAY_MONTH_YEAR = /^(\d{1,2})\.(\d{1,2})\.(\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function to24Hour(hours: number, meridiem: string | undefined): number {
  if (!meridiem) return hours;
  const pm = meridiem.toLowerCase() === "pm";
  return (hours % 12) + (pm ? 12 : 0);
}

function monthIndex(name: string): number | undefined {
  return MONTHS[name.slice(0, 3).toLowerCase()];
}

/**
 * Parses a workout date. Accepts ISO 8601 ("2024-03-18", "2024-03-18 07:30:00",
 * "2024-03-18 1:46:37 PM", "2024-03-18T07:30:00.000Z"), "18 Mar 2024, 07:30",
 * "Mar 18, 2024, 7:30 AM", and "18.03.2024, 07:30". A time with no zone is
 * read as local time, which is how Strong and Hevy write it. Slash dates such
 * as 03/04/2024 are rejected because the day and month order is unknown.
 */
export function parseImportDate(value: string): number | undefined {
  const text = value.trim();
  const iso = ISO_DATE.exec(text);
  if (iso) {
    const [, y, mo, d, h = "0", mi = "0", s = "0", frac = "0", meridiem, zone] = iso;
    const ms = Number(frac.padEnd(3, "0"));
    const hours = to24Hour(Number(h), meridiem);
    const local = localTime(Number(y), Number(mo) - 1, Number(d), hours, Number(mi), Number(s), ms);
    if (local === undefined || !zone) return local;
    let offsetMinutes = 0;
    if (zone.toUpperCase() !== "Z") {
      const sign = zone[0] === "-" ? -1 : 1;
      const digits = zone.slice(1).replace(":", "");
      offsetMinutes = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2)));
    }
    return (
      Date.UTC(Number(y), Number(mo) - 1, Number(d), hours, Number(mi), Number(s), ms) -
      offsetMinutes * 60_000
    );
  }

  const dmy = DAY_MONTH_YEAR.exec(text);
  if (dmy) {
    const [, d, monthName, y, h, mi, s = "0", meridiem] = dmy;
    const month = monthIndex(monthName);
    if (month === undefined) return undefined;
    return localTime(Number(y), month, Number(d), to24Hour(Number(h), meridiem), Number(mi), Number(s));
  }

  const mdy = MONTH_DAY_YEAR.exec(text);
  if (mdy) {
    const [, monthName, d, y, h, mi, s = "0", meridiem] = mdy;
    const month = monthIndex(monthName);
    if (month === undefined) return undefined;
    return localTime(Number(y), month, Number(d), to24Hour(Number(h), meridiem), Number(mi), Number(s));
  }

  const dotted = DOTTED_DAY_MONTH_YEAR.exec(text);
  if (dotted) {
    const [, d, mo, y, h, mi, s = "0"] = dotted;
    return localTime(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  }

  return undefined;
}

const DURATION_TEXT =
  /^(?:(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?))?\s*(?:(\d+(?:\.\d+)?)\s*(?:m|mins?|minutes?))?\s*(?:(\d+(?:\.\d+)?)\s*(?:s|secs?|seconds?))?$/;

/**
 * Parses a length of time into seconds: "1h 5m", "38min", "1h 20min", "30s",
 * "01:05:00", or plain seconds ("3900").
 */
export function parseDurationText(value: string): number | undefined {
  const text = value.trim().toLowerCase();
  if (!text) return undefined;
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const clock = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(text);
  if (clock) {
    const [, h = "0", m, s] = clock;
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  }
  const match = DURATION_TEXT.exec(text);
  if (!match || (!match[1] && !match[2] && !match[3])) return undefined;
  const [, h = "0", m = "0", s = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/**
 * Parses a number cell. A comma with one or two digits after it is a decimal
 * comma ("102,5"); a comma before three digits is a thousands separator
 * ("1,000").
 */
export function parseImportNumber(value: string): number | undefined {
  let text = value.trim().replace(/\s+/g, "");
  if (!text) return undefined;
  if (/^-?\d+,\d{1,2}$/.test(text)) {
    text = text.replace(",", ".");
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) {
    text = text.replace(/,/g, "");
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return undefined;
  return Number(text);
}

function parseUnit(value: string): WeightUnit | undefined {
  const key = value.trim().toLowerCase();
  if (["kg", "kgs", "kilogram", "kilograms"].includes(key)) return "kg";
  if (["lb", "lbs", "pound", "pounds"].includes(key)) return "lb";
  return undefined;
}

function isWarmupMarker(value: string): boolean {
  const key = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return key === "w" || key === "warmup" || key === "warming";
}

// ============================================================================
// Import plan
// ============================================================================

export type PlannedSet = {
  exerciseName: string;
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  unit: WeightUnit;
  rpe?: number;
  rir?: number;
  isWarmup?: boolean;
  notes?: string;
};

export type PlannedWorkout = {
  startedAt: number;
  completedAt?: number;
  title?: string;
  notes?: string;
  sets: PlannedSet[];
};

export type SkipReason =
  | "no_date"
  | "future_date"
  | "no_exercise"
  | "cardio"
  | "rest_timer"
  | "note_row"
  | "no_reps_or_time";

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  no_date: "Date missing or not readable",
  future_date: "Date in the future",
  no_exercise: "Exercise name missing",
  cardio: "Cardio, mobility, or distance set (not imported yet)",
  rest_timer: "Rest timer row",
  note_row: "Exercise note row (notes on their own row are not imported)",
  no_reps_or_time: "No reps or time",
};

export type ImportedExerciseName = {
  /** The name as written in the file (first spelling seen). */
  name: string;
  setCount: number;
  /** True when every set of this exercise is timed, not counted in reps. */
  timed: boolean;
};

export type ImportPlan = {
  workouts: PlannedWorkout[];
  setCount: number;
  exerciseNames: ImportedExerciseName[];
  skipped: Array<{ row: number; reason: SkipReason }>;
};

function cell(row: string[], index: number | undefined): string {
  return index === undefined ? "" : (row[index] ?? "").trim();
}

/**
 * Turns CSV rows into workouts. Rows that share a date and workout name form
 * one workout. Rows that can't become a lifting set are listed in `skipped`
 * with a reason; none are dropped silently.
 */
export function buildImportPlan(
  rows: string[][],
  settings: ImportSettings,
  options: {
    now?: number;
    /** True for names of cardio exercises, which are skipped for now. */
    isCardio?: (exerciseName: string) => boolean;
  } = {}
): ImportPlan {
  const { mapping, defaultUnit } = settings;
  const { now = Date.now(), isCardio } = options;
  const workouts = new Map<string, PlannedWorkout>();
  const names = new Map<string, ImportedExerciseName>();
  const skipped: ImportPlan["skipped"] = [];
  const lastNotes = new Map<string, string>();
  let setCount = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // 1-based, after the header row
    // Strong writes rest timers and exercise notes as rows of their own.
    const setMarker = cell(row, mapping.setNumber);
    const markerKey = setMarker.toLowerCase().replace(/\s+/g, "");
    if (markerKey === "resttimer") {
      skipped.push({ row: rowNumber, reason: "rest_timer" });
      return;
    }
    if (markerKey === "note") {
      skipped.push({ row: rowNumber, reason: "note_row" });
      return;
    }

    const startedAt = parseImportDate(cell(row, mapping.date));
    if (startedAt === undefined) {
      skipped.push({ row: rowNumber, reason: "no_date" });
      return;
    }
    if (startedAt > now) {
      skipped.push({ row: rowNumber, reason: "future_date" });
      return;
    }

    const exerciseName = cell(row, mapping.exercise).replace(/\s+/g, " ");
    if (!exerciseName) {
      skipped.push({ row: rowNumber, reason: "no_exercise" });
      return;
    }

    const distance = parseImportNumber(cell(row, mapping.distance));
    if ((distance !== undefined && distance > 0) || isCardio?.(exerciseName)) {
      skipped.push({ row: rowNumber, reason: "cardio" });
      return;
    }

    const reps = parseImportNumber(cell(row, mapping.reps));
    const seconds = parseDurationText(cell(row, mapping.durationSeconds));
    const set: PlannedSet = {
      exerciseName,
      unit: parseUnit(cell(row, mapping.unit)) ?? defaultUnit,
    };
    if (reps !== undefined && reps > 0) {
      set.reps = reps;
    } else if (seconds !== undefined && seconds > 0) {
      set.durationSeconds = seconds;
    } else {
      skipped.push({ row: rowNumber, reason: "no_reps_or_time" });
      return;
    }

    const weight = parseImportNumber(cell(row, mapping.weight));
    if (weight !== undefined && weight > 0) set.weight = weight;
    const rpe = parseImportNumber(cell(row, mapping.rpe));
    if (rpe !== undefined && rpe >= 1 && rpe <= 10) set.rpe = rpe;
    const rir = parseImportNumber(cell(row, mapping.rir));
    if (rir !== undefined && rir >= 0 && rir <= 10) set.rir = rir;
    if (isWarmupMarker(setMarker) || isWarmupMarker(cell(row, mapping.setType))) {
      set.isWarmup = true;
    }
    const notes = cell(row, mapping.notes);

    const title = cell(row, mapping.workoutTitle) || undefined;
    const key = `${startedAt}|${normalizeExerciseName(title ?? "")}`;
    let workout = workouts.get(key);
    if (!workout) {
      workout = { startedAt, title, sets: [] };
      const end = parseImportDate(cell(row, mapping.workoutEnd));
      const length = parseDurationText(cell(row, mapping.workoutDuration));
      const completedAt =
        end !== undefined && end >= startedAt
          ? end
          : length !== undefined && length > 0
            ? startedAt + Math.round(length * 1000)
            : undefined;
      if (completedAt !== undefined && completedAt <= now) {
        workout.completedAt = completedAt;
      }
      const workoutNotes = cell(row, mapping.workoutNotes);
      if (workoutNotes) workout.notes = workoutNotes;
      workouts.set(key, workout);
    }
    // Hevy repeats an exercise's note on each of its sets; keep it once.
    const noteKey = `${normalizeExerciseName(exerciseName)}\u0000${notes}`;
    if (notes && lastNotes.get(key) !== noteKey) set.notes = notes;
    lastNotes.set(key, noteKey);
    workout.sets.push(set);
    setCount += 1;

    const nameKey = normalizeExerciseName(exerciseName);
    const known = names.get(nameKey);
    if (known) {
      known.setCount += 1;
      known.timed = known.timed && set.durationSeconds !== undefined;
    } else {
      names.set(nameKey, {
        name: exerciseName,
        setCount: 1,
        timed: set.durationSeconds !== undefined,
      });
    }
  });

  return {
    workouts: [...workouts.values()].sort((a, b) => a.startedAt - b.startedAt),
    setCount,
    exerciseNames: [...names.values()].sort((a, b) => a.name.localeCompare(b.name)),
    skipped,
  };
}

// ============================================================================
// Exercise name matching
// ============================================================================

export type MatchableExercise = {
  _id: string;
  name: string;
  aliases?: string[];
  equipment?: string[];
};

export type ExerciseMatch = {
  exerciseId: string;
  /** "exact" matches a name or alias; "suggested" drops an equipment suffix. */
  kind: "exact" | "suggested";
};

function findByName<T extends MatchableExercise>(exercises: readonly T[], normalized: string) {
  return (
    exercises.find((e) => normalizeExerciseName(e.name) === normalized) ??
    exercises.find((e) => e.aliases?.some((a) => normalizeExerciseName(a) === normalized))
  );
}

/**
 * Matches an imported name to a known exercise. Strong and Hevy write the
 * equipment in parentheses ("Bench Press (Dumbbell)"), so a name with no
 * exact match is tried as "Dumbbell Bench Press", then as "Bench Press" when
 * that exercise uses the named equipment.
 */
export function matchExerciseName<T extends MatchableExercise>(
  name: string,
  exercises: readonly T[]
): ExerciseMatch | null {
  const exact = findByName(exercises, normalizeExerciseName(name));
  if (exact) return { exerciseId: exact._id, kind: "exact" };

  const suffix = /^(.+?)\s*\(([^()]+)\)$/.exec(name.trim());
  if (!suffix) return null;
  const [, base, equipment] = suffix;
  const prefixed = findByName(exercises, normalizeExerciseName(`${equipment} ${base}`));
  if (prefixed) return { exerciseId: prefixed._id, kind: "suggested" };

  const baseMatch = findByName(exercises, normalizeExerciseName(base));
  const equipmentKey = normalizeExerciseName(equipment);
  if (baseMatch?.equipment?.some((item) => normalizeExerciseName(item) === equipmentKey)) {
    return { exerciseId: baseMatch._id, kind: "suggested" };
  }
  return null;
}

// ============================================================================
// Batches
// ============================================================================

/** Per-mutation limits for importWorkouts. Convex caps writes per mutation. */
export const IMPORT_BATCH_LIMITS = { workouts: 25, sets: 500 } as const;

/** Idempotency key for an imported workout: its start time and name. */
export function buildImportKey(startedAt: number, title: string | undefined): string {
  return `v1|${startedAt}|${normalizeExerciseName(title ?? "")}`;
}

/** Splits workouts into batches within IMPORT_BATCH_LIMITS. */
export function chunkWorkouts<T extends { sets: unknown[] }>(
  workouts: readonly T[],
  limits: { workouts: number; sets: number } = IMPORT_BATCH_LIMITS
): T[][] {
  const batches: T[][] = [];
  let batch: T[] = [];
  let sets = 0;
  for (const workout of workouts) {
    if (workout.sets.length > limits.sets) {
      throw new Error(
        `One workout has ${workout.sets.length} sets. The limit is ${limits.sets} sets per workout.`
      );
    }
    if (batch.length === limits.workouts || sets + workout.sets.length > limits.sets) {
      batches.push(batch);
      batch = [];
      sets = 0;
    }
    batch.push(workout);
    sets += workout.sets.length;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}
