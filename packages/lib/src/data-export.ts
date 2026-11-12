import { workoutsToCsv, type CsvWorkout } from "./csv-write";

export type DataExportFormat = "csv" | "json";

export interface DataExportFile {
  fileName: string;
  mimeType: string;
  content: string;
}

/**
 * Turns a `users.exportAllData` payload into the file that web downloads and
 * mobile shares. CSV holds lifting history only; JSON holds everything.
 */
export function buildDataExportFile(
  data: { workouts: readonly CsvWorkout[] },
  format: DataExportFormat,
  now: Date = new Date(),
): DataExportFile {
  const stem = `opentrainer-export-${now.toISOString().split("T")[0]}`;
  return format === "csv"
    ? { fileName: `${stem}.csv`, mimeType: "text/csv", content: workoutsToCsv(data.workouts) }
    : {
        fileName: `${stem}.json`,
        mimeType: "application/json",
        content: JSON.stringify(data, null, 2),
      };
}
