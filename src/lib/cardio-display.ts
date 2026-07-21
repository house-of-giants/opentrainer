export type CardioDistanceUnit = "m" | "km" | "mi";
export type DisplayCardioDistanceUnit = Exclude<CardioDistanceUnit, "m">;

export type PersistedCardioSummary = {
  durationSeconds: number;
  distance?: number;
  distanceUnit?: CardioDistanceUnit;
  rpe?: number;
};

export type DraftCardioSummary = {
  durationSeconds: number;
  distance: number;
  distanceUnit: DisplayCardioDistanceUnit;
  rpe: number;
};

export function getCardioDisplaySummary(
  persisted: PersistedCardioSummary | undefined,
  draft: DraftCardioSummary
) {
  const summary = persisted ?? draft;
  const distanceUnit = summary.distanceUnit;

  if (distanceUnit === "m") {
    return {
      ...summary,
      distance:
        summary.distance === undefined ? undefined : summary.distance / 1_000,
      distanceUnit: "km" as const,
    };
  }

  return {
    ...summary,
    distanceUnit,
  };
}
