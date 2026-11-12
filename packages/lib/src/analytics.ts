import type { ProgressionSuggestion } from "./progression";
import type { WeightUnit } from "./units";

const INTERNAL_EMAIL_DOMAIN = "houseofgiants.com";

/**
 * Person properties that mark staff and test accounts, so PostHog filters can
 * exclude them. Only an exact `@houseofgiants.com` address is internal.
 */
export function internalAccountProperties(email: string | null | undefined): {
  is_internal: boolean;
} {
  const normalized = email?.trim().toLowerCase() ?? "";
  const at = normalized.lastIndexOf("@");
  return {
    is_internal: at > 0 && normalized.slice(at + 1) === INTERNAL_EMAIL_DOMAIN,
  };
}

export type AnalyticsCapture = (
  event: string,
  properties: Record<string, string | number | boolean>
) => void;

type ShownSuggestion = {
  type: ProgressionSuggestion["type"];
  targetWeight: number;
  unit: WeightUnit;
};

/**
 * Tracks one exercise's progression suggestion during one workout.
 * Sends `progression_suggestion_shown` once, and `progression_suggestion_accepted`
 * once, for the first logged set whose weight equals the suggested weight.
 */
export function createProgressionSuggestionTracker(capture: AnalyticsCapture) {
  let shown: ShownSuggestion | null = null;
  let accepted = false;

  return {
    markShown(suggestion: ShownSuggestion) {
      if (shown) return;
      shown = suggestion;
      capture("progression_suggestion_shown", { suggestion_type: suggestion.type });
    },
    markSetLogged(set: { weight: number; unit: WeightUnit }) {
      if (!shown || accepted) return;
      if (set.unit !== shown.unit) return;
      if (Math.abs(set.weight - shown.targetWeight) > 1e-6) return;
      accepted = true;
      capture("progression_suggestion_accepted", { suggestion_type: shown.type });
    },
  };
}
