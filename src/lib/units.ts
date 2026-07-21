export type WeightUnit = "lb" | "kg";

export type WeightedReps = {
  weight?: number;
  reps?: number;
  unit?: WeightUnit;
};

const LB_TO_KG = 0.453592;
const KG_TO_LB = 2.20462;

export function convertWeight(
  weight: number,
  fromUnit: WeightUnit,
  toUnit: WeightUnit
): number {
  if (fromUnit === toUnit) return weight;
  if (fromUnit === "lb" && toUnit === "kg") {
    return weight * LB_TO_KG;
  }
  return weight * KG_TO_LB;
}

export function roundWeight(weight: number, unit: WeightUnit): number {
  const precision = unit === "kg" ? 10 : 2;
  return Math.round(weight * precision) / precision;
}

export function displayWeight(
  weight: number,
  fromUnit: WeightUnit,
  toUnit: WeightUnit
): number {
  const converted = convertWeight(weight, fromUnit, toUnit);
  return roundWeight(converted, toUnit);
}

export function calculateVolumeInUnit(
  sets: WeightedReps[],
  toUnit: WeightUnit
): number {
  return sets.reduce((total, set) => {
    const weight = set.weight ?? 0;
    const reps = set.reps ?? 0;
    const sourceUnit = set.unit ?? toUnit;
    return total + convertWeight(weight, sourceUnit, toUnit) * reps;
  }, 0);
}

export function editedWeightForStorage({
  displayedWeight,
  displayUnit,
  storedUnit,
  originalDisplayedWeight,
  originalStoredWeight,
}: {
  displayedWeight: number;
  displayUnit: WeightUnit;
  storedUnit: WeightUnit;
  originalDisplayedWeight: number;
  originalStoredWeight?: number;
}): number | undefined {
  if (displayedWeight === originalDisplayedWeight) {
    return originalStoredWeight;
  }
  return displayWeight(displayedWeight, displayUnit, storedUnit);
}
