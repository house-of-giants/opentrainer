import PostHog from "posthog-react-native";

// Mirrors the web's `posthog-js` call sites (capture / captureException are
// ported 1:1). Without EXPO_PUBLIC_POSTHOG_API_KEY the client is null and every
// call no-ops, so instrumentation can be enabled via env alone.
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

const client = apiKey
  ? new PostHog(apiKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    })
  : null;

type EventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export const analytics = {
  capture(event: string, properties?: EventProperties) {
    if (!client) return;
    const defined = Object.fromEntries(
      Object.entries(properties ?? {}).filter(([, v]) => v !== undefined),
    ) as Record<string, string | number | boolean | null>;
    client.capture(event, defined);
  },
  captureException(error: unknown) {
    client?.captureException(error);
  },
};
