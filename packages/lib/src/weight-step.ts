import type { WeightUnit } from "./units";

/** A user's saved weight step for one exercise. */
export type WeightStepSetting = { weightStep: number; unit: WeightUnit };

/** The step every exercise used before steps were configurable. */
export const DEFAULT_WEIGHT_STEP: Record<WeightUnit, number> = { lb: 5, kg: 2.5 };

export const MAX_WEIGHT_STEP = 50;

export function isValidWeightStep(step: number): boolean {
  return Number.isFinite(step) && step > 0 && step <= MAX_WEIGHT_STEP;
}

/**
 * The step to use for weights shown in `unit`. A saved step applies only in
 * the unit it was saved in; otherwise the default applies.
 */
export function resolveWeightStep(
  unit: WeightUnit,
  setting?: WeightStepSetting | null
): number {
  if (setting && setting.unit === unit && isValidWeightStep(setting.weightStep)) {
    return setting.weightStep;
  }
  return DEFAULT_WEIGHT_STEP[unit];
}

/** Adds or subtracts a step without floating-point noise (61.3 + 1.25 = 62.55). */
export function stepWeight(weight: number, step: number): number {
  return Math.round((weight + step) * 1000) / 1000;
}
