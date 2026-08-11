"use client";

import { Info } from "lucide-react";
import Body, { type ExtendedBodyPart, type Slug } from "react-muscle-highlighter";
import type {
  MuscleAnalyticsResult,
  MuscleRecoveryDatum,
  MuscleSplitDatum,
  MuscleWorkloadDatum,
} from "../../../convex/lib/muscleAnalytics";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MuscleAnalyticsSectionProps = {
  analytics: MuscleAnalyticsResult | null | undefined;
};

type KnownMuscle =
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

const MUSCLE_MAP_SLUGS_BY_GROUP = {
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

const BODY_MAP_SLUGS: readonly Slug[] = [
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

export function MuscleAnalyticsSection({ analytics }: MuscleAnalyticsSectionProps) {
  if (analytics === undefined) {
    return <MuscleAnalyticsSkeleton />;
  }

  if (analytics === null) {
    return null;
  }

  const rows = getWorkloadRows(analytics);
  const mappedMusclesTrained = rows.filter((row) => !row.isUnmapped && row.setsThisWeek > 0).length;
  const activeMuscles = new Set<KnownMuscle>();
  for (const row of rows) {
    if (row.setsThisWeek > 0 && isKnownMuscle(row.muscle)) {
      activeMuscles.add(row.muscle);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="muscle-workload-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="muscle-workload-heading" className="font-semibold">
            Muscle Workload
          </h2>
          <p className="text-xs text-muted-foreground">
            {formatDateRange(analytics.weekStart, analytics.weekEnd)}
          </p>
        </div>
        <ul className="flex flex-wrap gap-2" role="list" aria-label="Muscle workload summary">
          <li>
            <Badge variant="outline">
              {formatPlural(analytics.totalWorkingSets, "completed working set")}
            </Badge>
          </li>
          <li>
            <Badge variant="outline">
              {formatPlural(mappedMusclesTrained, "mapped muscle group")}
            </Badge>
          </li>
        </ul>
      </div>

      <Card className="p-4">
        {rows.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-[5fr_7fr] lg:items-start">
            <MuscleBodyMap activeMuscles={activeMuscles} />
            <MuscleWorkloadTable rows={rows} now={analytics.generatedAt} />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[5fr_7fr] lg:items-center">
            <MuscleBodyMap activeMuscles={activeMuscles} />
            <EmptyWorkloadState />
          </div>
        )}

        <div className="mt-4 flex gap-2 rounded-md border bg-muted/35 p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p>
              Working sets only. A set is counted for each mapped muscle, so compound exercises
              may appear in multiple rows.
            </p>
            <p>Last trained comes only from logged workouts and is not a readiness score.</p>
            {analytics.unmappedWorkingSets > 0 && (
              <p>
                {formatPlural(analytics.unmappedWorkingSets, "working set")}{" "}
                {analytics.unmappedWorkingSets === 1 ? "is" : "are"} Unmapped because the
                exercise has no muscle groups yet.
              </p>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}

function MuscleWorkloadTable({ rows, now }: { rows: MuscleWorkloadDatum[]; now: number }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">
          Current week working sets and last logged training date by muscle
        </caption>
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="border-b pb-2 pr-3 text-left font-medium">
              Muscle
            </th>
            <th scope="col" className="border-b px-3 pb-2 text-right font-medium">
              Sets this week
            </th>
            <th scope="col" className="border-b pb-2 pl-3 text-right font-medium">
              Last trained
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.muscle} className="align-middle">
              <th scope="row" className="border-b py-2.5 pr-3 text-left font-medium">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      row.setsThisWeek > 0 ? "bg-primary" : "bg-muted-foreground/35"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{row.label}</span>
                  {row.isUnmapped && (
                    <Badge variant="outline" className="text-[10px]">
                      Unmapped
                    </Badge>
                  )}
                </span>
              </th>
              <td className="border-b px-3 py-2.5 text-right font-mono">
                {row.setsThisWeek.toLocaleString()}
              </td>
              <td className="border-b py-2.5 pl-3 text-right text-muted-foreground">
                {formatLastTrained(row, now)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MuscleBodyMap({ activeMuscles }: { activeMuscles: Set<string> }) {
  const bodyMapParts = getBodyMapParts(activeMuscles);

  return (
    <figure className="rounded-md border bg-background p-3">
      <div aria-hidden="true" className="pointer-events-none grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BodyView label="Front" side="front" bodyMapParts={bodyMapParts} />
        <BodyView label="Back" side="back" bodyMapParts={bodyMapParts} />
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        Highlighted regions have at least one mapped working-set exposure this week.
      </figcaption>
    </figure>
  );
}

function BodyView({
  label,
  side,
  bodyMapParts,
}: {
  label: string;
  side: "front" | "back";
  bodyMapParts: readonly ExtendedBodyPart[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mx-auto w-full max-w-[12rem] [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-full">
        <Body
          data={bodyMapParts}
          side={side}
          gender="male"
          border="var(--border)"
          defaultFill="var(--muted)"
          defaultStroke="var(--background)"
          defaultStrokeWidth={2}
        />
      </div>
    </div>
  );
}

function EmptyWorkloadState() {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center rounded-md border border-dashed p-4 text-center">
      <p className="text-sm font-medium">No muscle workload yet</p>
      <p className="mt-1 max-w-[34ch] text-xs leading-relaxed text-muted-foreground">
        No completed strength working sets are logged for this Monday-starting week.
      </p>
    </div>
  );
}

function MuscleAnalyticsSkeleton() {
  return (
    <section className="space-y-3" aria-label="Loading muscle workload">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>
      <Card className="p-4">
        <div className="grid gap-5 lg:grid-cols-[5fr_7fr]">
          <Skeleton className="h-[240px] w-full" />
          <Skeleton className="h-[240px] w-full" />
        </div>
      </Card>
    </section>
  );
}

function getWorkloadRows(analytics: MuscleAnalyticsResult): MuscleWorkloadDatum[] {
  if (Array.isArray(analytics.workload) && analytics.workload.length > 0) {
    return [...analytics.workload].sort(sortWorkloadRowsForDisplay);
  }

  return deriveWorkloadRows(analytics.split, analytics.recovery).sort(sortWorkloadRowsForDisplay);
}

function deriveWorkloadRows(
  split: MuscleSplitDatum[],
  recovery: MuscleRecoveryDatum[]
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

function sortWorkloadRowsForDisplay(a: MuscleWorkloadDatum, b: MuscleWorkloadDatum): number {
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

function formatDateRange(start: number, end: number): string {
  return `Week of ${dateFormatter.format(start)} - ${dateFormatter.format(end)} UTC`;
}

function formatLastTrained(row: MuscleWorkloadDatum, now: number): string {
  if (row.isUnmapped) return "Not mapped";
  if (row.lastTrainedAt === null) return "Not logged";

  const elapsedDays = Math.max(
    0,
    Math.floor((startOfUtcDay(now) - startOfUtcDay(row.lastTrainedAt)) / DAY_MS)
  );

  if (elapsedDays === 0) return "Today";
  if (elapsedDays === 1) return "Yesterday";
  return `${elapsedDays} days ago`;
}

function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatPlural(count: number, singular: string): string {
  return `${count.toLocaleString()} ${singular}${count === 1 ? "" : "s"}`;
}

function isKnownMuscle(value: string): value is KnownMuscle {
  return KNOWN_MUSCLES.has(value as KnownMuscle);
}

function getBodyMapParts(activeMuscles: Set<string>): ExtendedBodyPart[] {
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
      fill: activeSlugs.has(slug) ? "var(--primary)" : "var(--muted)",
      stroke: "var(--background)",
      strokeWidth: 2,
    },
  }));
}
