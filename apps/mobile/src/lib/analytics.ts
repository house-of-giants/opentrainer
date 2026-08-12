import PostHog from "posthog-react-native";

// Mirrors the web's `posthog-js` call sites (capture / identify /
// captureException are ported 1:1). Without EXPO_PUBLIC_POSTHOG_KEY the client
// is null and every call no-ops, so instrumentation is enabled via env alone.
// Mobile talks to PostHog directly (no /ingest reverse proxy as on web).
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

const client = apiKey
  ? new PostHog(apiKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    })
  : null;

type PropertyValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number)[];

type EventProperties = Record<string, PropertyValue>;

export const analytics = {
  capture(event: string, properties?: EventProperties) {
    if (!client) return;
    const defined = Object.fromEntries(
      Object.entries(properties ?? {}).filter(([, v]) => v !== undefined),
    ) as Record<string, string | number | boolean | null | (string | number)[]>;
    client.capture(event, defined);
  },
  identify(distinctId: string, properties?: EventProperties) {
    if (!client) return;
    const defined = Object.fromEntries(
      Object.entries(properties ?? {}).filter(([, v]) => v !== undefined),
    ) as Record<string, string | number | boolean | null>;
    client.identify(distinctId, defined);
  },
  captureException(error: unknown) {
    client?.captureException(error);
  },
};
