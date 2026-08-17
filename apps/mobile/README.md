# OpenTrainer for iOS

The Expo SDK 57 client for OpenTrainer, built with Expo Router, NativeWind, Clerk authentication, and the shared Convex backend.

## Setup

Install dependencies once from the repository root:

```bash
bun install
```

Then create the mobile environment file:

```bash
cd apps/mobile
cp .env.example .env
```

Set these variables in `.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `EXPO_PUBLIC_POSTHOG_KEY` | No | PostHog analytics key |

## Running

From `apps/mobile`, start the Expo development server:

```bash
bunx expo start
```

The app needs a development build or an iOS simulator. On macOS with Xcode, build and launch it locally with:

```bash
bunx expo run:ios
```

After the native development build is installed, use `bunx expo start` for normal development sessions.

## Testing and checks

Run these commands from `apps/mobile`:

```bash
bunx jest
bunx tsc --noEmit
bunx expo lint
```

Jest uses the `jest-expo` preset configured in `package.json`.

## EAS builds

The configured iOS profiles are `production`, `preview`, and `development`:

```bash
bunx eas-cli build --platform ios --profile production
bunx eas-cli build --platform ios --profile preview
bunx eas-cli build --platform ios --profile development
```

Production build values come from the EAS project's production environment variables, not the local `.env` file.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/app` | Expo Router routes and layouts |
| `src/app/(auth)` | Sign-in and sign-up routes |
| `src/app/(app)` | Authenticated app routes and layouts |
| `src/app/(app)/(tabs)` | Dashboard, routines, workout start, history, and profile tabs |
| `src/components/ui` | Reusable mobile design-system components |
| `src/theme` | Design tokens and the theme provider |
| `src/lib/analytics.ts` | Analytics integration |
| `src/lib/rest-timer-notifications.ts` | Rest-timer notification scheduling |
| `src/__tests__` | Jest component and screen tests |

Expo Router group names do not appear in URLs. The development gallery route is available at `/gallery`.
