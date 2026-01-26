export type WeightUnit = "lb" | "kg";

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
