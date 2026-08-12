// Port of the non-DOM helpers from apps/web/src/lib/utils.ts.
// `cn` lives in @/lib/cn on mobile (it needs no twMerge divergence), so this
// file only carries the shared formatters.

export function formatDuration(minutes?: number, fallback = "0m") {
  if (minutes == null || Number.isNaN(minutes)) return fallback;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
