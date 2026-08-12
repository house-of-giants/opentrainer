export const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns 00:00 UTC on the Monday that contains the supplied timestamp.
 *
 * OpenTrainer does not currently persist a user time zone, so server-side
 * calendar periods use UTC consistently rather than depending on the runtime's
 * local time zone.
 */
export function getMondayWeekStartUtc(timestamp: number): number {
  const date = new Date(timestamp);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;

  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysSinceMonday
  );
}

export function getMondayWeekKey(timestamp: number): string {
  return new Date(getMondayWeekStartUtc(timestamp)).toISOString().split("T")[0];
}
