// OpenTrainer CSV history format. The CSV import reads this exact format, so
// change the columns only together with the parser.
//
// - One row per lifting set, header row first, comma separated, UTF-8.
// - RFC 4180: CRLF after every record; a cell with a comma, a double quote,
//   or a line break is wrapped in double quotes, with inner quotes doubled.
// - An absent value is an empty cell.
// - Only completed workouts are written. Cardio and mobility entries are
//   skipped: this format has no columns for them. The JSON export keeps them.
// - Order: workouts by start time, then exercises in the order of their first
//   logged set, then sets by set number.

export const WORKOUT_CSV_COLUMNS = [
  "date",
  "workout_title",
  "exercise",
  "set_number",
  "set_type",
  "weight",
  "unit",
  "reps",
  "duration_seconds",
  "rpe",
  "rir",
  "notes",
] as const;

export interface CsvLiftingSet {
  setNumber: number;
  reps?: number | null;
  weight?: number | null;
  durationSeconds?: number | null;
  unit: "kg" | "lb";
  rpe?: number | null;
  rir?: number | null;
  isWarmup?: boolean | null;
}

export interface CsvWorkoutEntry {
  exerciseName: string;
  kind: "lifting" | "cardio" | "mobility";
  lifting?: CsvLiftingSet | null;
  notes?: string | null;
  /** ISO 8601 date-time. */
  createdAt: string;
}

/** Structural subset of a workout in `users.exportAllData`. */
export interface CsvWorkout {
  title?: string | null;
  status: string;
  /** ISO 8601 date-time of the workout start. */
  startedAt: string;
  entries: readonly CsvWorkoutEntry[];
}

type Cell = string | number | null | undefined;

function formatCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function formatRow(cells: readonly Cell[]): string {
  return `${cells.map(formatCell).join(",")}\r\n`;
}

function time(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

export function workoutsToCsv(workouts: readonly CsvWorkout[]): string {
  let csv = formatRow(WORKOUT_CSV_COLUMNS);

  const completed = workouts
    .filter((workout) => workout.status === "completed")
    .sort((a, b) => time(a.startedAt) - time(b.startedAt));

  for (const workout of completed) {
    const sets = workout.entries
      .filter(
        (entry): entry is CsvWorkoutEntry & { lifting: CsvLiftingSet } =>
          entry.kind === "lifting" && !!entry.lifting,
      )
      .sort((a, b) => time(a.createdAt) - time(b.createdAt));

    // Map keeps insertion order, so exercises follow their first logged set.
    const byExercise = new Map<string, typeof sets>();
    for (const entry of sets) {
      const group = byExercise.get(entry.exerciseName) ?? [];
      group.push(entry);
      byExercise.set(entry.exerciseName, group);
    }

    for (const [exerciseName, group] of byExercise) {
      group.sort((a, b) => a.lifting.setNumber - b.lifting.setNumber);
      for (const { lifting, notes } of group) {
        csv += formatRow([
          workout.startedAt,
          workout.title,
          exerciseName,
          lifting.setNumber,
          lifting.isWarmup ? "warmup" : "work",
          lifting.weight,
          lifting.unit,
          lifting.reps,
          lifting.durationSeconds,
          lifting.rpe,
          lifting.rir,
          notes,
        ]);
      }
    }
  }

  return csv;
}
