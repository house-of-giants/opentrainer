import type { ExtendedBodyPart, Slug } from "react-native-body-highlighter";
import type {
  MuscleAnalyticsResult,
  MuscleRecoveryDatum,
  MuscleSplitDatum,
  MuscleWorkloadDatum,
} from "@opentrainer/backend/convex/lib/muscleAnalytics";

// Pure logic for the muscle analytics section, ported 1:1 from
// apps/web/src/components/training-lab/muscle-analytics-section.tsx. Web uses
// react-muscle-highlighter and mobile uses react-native-body-highlighter v3;
// both share the same slug vocabulary, so the group→slug map is unchanged.
// Kept free of react-native imports so it can be unit-tested directly
// (type-only package imports are erased at compile time).

export type KnownMuscle =
  | "chest"
  | "back"
  | "shoulders"
  | "traps"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves";

const KNOWN_MUSCLES = new Set<KnownMuscle>([
  "chest",
  "back",
  "shoulders",
  "traps",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
]);

export const MUSCLE_MAP_SLUGS_BY_GROUP = {
  chest: ["chest"],
  back: ["upper-back", "lower-back"],
  shoulders: ["deltoids"],
  traps: ["trapezius"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearm"],
  core: ["abs", "obliques"],
  quads: ["quadriceps"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  calves: ["calves"],
} satisfies Record<KnownMuscle, readonly Slug[]>;

export const BODY_MAP_SLUGS: readonly Slug[] = [
  "abs",
  "adductors",
  "ankles",
  "biceps",
  "calves",
  "chest",
  "deltoids",
  "feet",
  "forearm",
  "gluteal",
  "hamstring",
  "hands",
  "hair",
  "head",
  "knees",
  "lower-back",
  "neck",
  "obliques",
  "quadriceps",
  "tibialis",
  "trapezius",
  "triceps",
  "upper-back",
];

const DAY_MS = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function isKnownMuscle(value: string): value is KnownMuscle {
  return KNOWN_MUSCLES.has(value as KnownMuscle);
}

export function getWorkloadRows(analytics: MuscleAnalyticsResult): MuscleWorkloadDatum[] {
  if (Array.isArray(analytics.workload) && analytics.workload.length > 0) {
    return [...analytics.workload].sort(sortWorkloadRowsForDisplay);
  }

  return deriveWorkloadRows(analytics.split, analytics.recovery).sort(
    sortWorkloadRowsForDisplay,
  );
}

function deriveWorkloadRows(
  split: MuscleSplitDatum[],
  recovery: MuscleRecoveryDatum[],
): MuscleWorkloadDatum[] {
  const rowsByMuscle = new Map<string, MuscleWorkloadDatum>();

  for (const item of split) {
    rowsByMuscle.set(item.muscle, {
      muscle: item.muscle,
      label: item.label,
      setsThisWeek: item.sets,
      lastTrainedAt: null,
      lastTrainedDate: null,
      isUnmapped: item.isUnmapped,
    });
  }

  for (const item of recovery) {
    const existing = rowsByMuscle.get(item.muscle);
    rowsByMuscle.set(item.muscle, {
      muscle: item.muscle,
      label: existing?.label ?? item.label,
      setsThisWeek: existing?.setsThisWeek ?? 0,
      lastTrainedAt: item.lastTrainedAt,
      lastTrainedDate: item.lastTrainedDate,
      isUnmapped: existing?.isUnmapped ?? false,
    });
  }

  return Array.from(rowsByMuscle.values());
}

function sortWorkloadRowsForDisplay(
  a: MuscleWorkloadDatum,
  b: MuscleWorkloadDatum,
): number {
  if (a.setsThisWeek !== b.setsThisWeek) {
    return b.setsThisWeek - a.setsThisWeek;
  }

  const aLastTrainedAt = a.lastTrainedAt ?? Number.NEGATIVE_INFINITY;
  const bLastTrainedAt = b.lastTrainedAt ?? Number.NEGATIVE_INFINITY;
  if (aLastTrainedAt !== bLastTrainedAt) {
    return bLastTrainedAt - aLastTrainedAt;
  }

  if (a.isUnmapped !== b.isUnmapped) {
    return a.isUnmapped ? 1 : -1;
  }

  return a.label.localeCompare(b.label);
}

/** Known muscle groups with at least one working set this week. */
export function getActiveMuscles(rows: MuscleWorkloadDatum[]): Set<KnownMuscle> {
  const activeMuscles = new Set<KnownMuscle>();
  for (const row of rows) {
    if (row.setsThisWeek > 0 && isKnownMuscle(row.muscle)) {
      activeMuscles.add(row.muscle);
    }
  }
  return activeMuscles;
}

/**
 * Builds the body-highlighter data array. Matches web's binary intensity:
 * active slugs are filled with the primary color, everything else with muted.
 */
export function getBodyMapParts(
  activeMuscles: ReadonlySet<string>,
  palette: { active: string; inactive: string; stroke: string },
): ExtendedBodyPart[] {
  const activeSlugs = new Set<Slug>();

  for (const muscle of activeMuscles) {
    if (!isKnownMuscle(muscle)) continue;

    for (const slug of MUSCLE_MAP_SLUGS_BY_GROUP[muscle]) {
      activeSlugs.add(slug);
    }
  }

  return BODY_MAP_SLUGS.map((slug) => ({
    slug,
    styles: {
      fill: activeSlugs.has(slug) ? palette.active : palette.inactive,
      stroke: palette.stroke,
      strokeWidth: 2,
    },
  }));
}

export function formatDateRange(start: number, end: number): string {
  return `Week of ${dateFormatter.format(start)} - ${dateFormatter.format(end)} UTC`;
}

export function formatLastTrained(row: MuscleWorkloadDatum, now: number): string {
  if (row.isUnmapped) return "Not mapped";
  if (row.lastTrainedAt === null) return "Not logged";

  const elapsedDays = Math.max(
    0,
    Math.floor((startOfUtcDay(now) - startOfUtcDay(row.lastTrainedAt)) / DAY_MS),
  );

  if (elapsedDays === 0) return "Today";
  if (elapsedDays === 1) return "Yesterday";
  return `${elapsedDays} days ago`;
}

function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function formatPlural(count: number, singular: string): string {
  return `${count.toLocaleString()} ${singular}${count === 1 ? "" : "s"}`;
}
