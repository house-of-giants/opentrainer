import type { DataExportFile } from "@opentrainer/lib/data-export";

/** Saves a text file through the browser's download flow. */
export function downloadFile({ fileName, mimeType, content }: DataExportFile): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
