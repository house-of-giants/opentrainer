# Spanish localization spike

**Status:** Research only; no dependency or runtime change is included in this spike.

**Evaluated:** 2026-07-21

**Target stack:** Next.js 16.1.1 App Router, React 19.2.3, Convex, Clerk

## Recommendation

Adopt **`next-intl` v4**, start with `en` and neutral `es`, and select the locale from a validated first-party cookie. Do **not** add a top-level `[locale]` route segment or locale-prefixed URLs for the first release.

This is the lowest modern lift because it:

- works directly in App Router Server and Client Components;
- can use the existing route tree unchanged;
- provides ICU messages plus date, time, relative-time, list, and number formatting;
- can make locale, message keys, and named formats type-safe from the English catalog; and
- lets the team begin with one active-locale message catalog at the root client provider, then split catalogs only if measurement shows a material cost.

The official `next-intl` App Router setup explicitly supports deriving locale from a cookie without locale-based routing. Its server/client integration also uses environment-specific exports so the same translation API works in shared components, with awaitable APIs for async Server Components ([App Router setup](https://next-intl.dev/docs/getting-started/app-router), [Server and Client Components](https://next-intl.dev/docs/environments/server-client-components)).

### What the first release should claim

Call the first milestone **Spanish UI (beta)**, not full Spanish parity, until all of these are true:

1. the core authenticated UI and user-facing errors are translated;
2. dates, times, numbers, plurals, and durations format from the selected locale;
3. Clerk's embedded authentication UI is localized;
4. AI coaching requested in Spanish is generated and cached by locale; and
5. Spanish legal copy has been reviewed by an appropriate human reviewer.

Exercise names and user-entered data should remain language-neutral stored data in the initial release. They need a separate identity/display-name design before translation.

## Why URLs should stay unchanged initially

Moving the application under `app/[locale]` would touch every route and navigation assumption. Next.js documents that pattern for internationalized routing, and recommends it when separately addressable language URLs are needed ([Next.js internationalization guide](https://nextjs.org/docs/app/guides/internationalization)). OpenTrainer is primarily an authenticated product, and the feedback asks for usable Spanish UI rather than Spanish SEO pages.

For the initial release:

- keep `/dashboard`, `/workout/active`, and every existing deep link stable;
- store `opentrainer_locale=en|es` in a first-party cookie;
- default to `en` when the cookie is absent;
- let an explicit language selector change the cookie; and
- set `<html lang>` from the resolved locale.

`next-intl` documents cookie-derived locale as the simple no-routing case. Next.js 16's `cookies()` API is asynchronous, can be written in a Server Function, and causes a route that reads it to be dynamically rendered ([next-intl App Router setup](https://next-intl.dev/docs/getting-started/app-router), [Next.js `cookies`](https://nextjs.org/docs/app/api-reference/functions/cookies)). That dynamic-rendering consequence is the main tradeoff. If preserving static rendering for the public landing, pricing, and legal pages becomes important, isolate the cookie-aware provider in an authenticated route group or introduce locale-prefixed public URLs later.

Locale-prefixed URLs are worth a later phase only when OpenTrainer needs indexable Spanish marketing/legal pages, shareable URLs that encode language, or locale-specific canonical and `hreflang` metadata.

## Current repository surface

### Route and rendering shape

The current route tree has no locale segment or locale route group:

- public: `/`, `/pricing`, `/privacy`, `/terms`, and `/demo/**`;
- account setup: `/onboarding`;
- authenticated product: `/dashboard`, `/profile`, `/history`, `/training-lab`, `/routines/**`, and `/workout/**`;
- dynamic records: `/routines/[id]/edit` and `/workout/[id]`; and
- error boundaries under dashboard, profile, routines, training lab, and workout.

The inventory found 34 `src/app/**/*.tsx` files and 73 shared component TSX files. Of those, 31 app files and 68 shared components declare `use client`. This matters: passing every translated label from Server Components into existing client components would be a large structural rewrite. Supplying the active locale's full catalog through one `NextIntlClientProvider` is the appropriate lowest-lift starting point. `next-intl` notes that sending all messages to Client Components is its easiest default and recommends measuring before selectively splitting them ([client message delivery](https://next-intl.dev/docs/environments/server-client-components#using-internationalization-in-client-components)).

### Copy and formatting inventory

The following counts are implementation-sizing signals, not a promised final message count:

- about 414 likely human-facing capitalized string literals in `src/app` and `src/components` from a simple search heuristic;
- 93 toast calls with inline success or error copy;
- 126 backend `Error`/`ConvexError` sites, some of which are surfaced directly by client code;
- 23 locale-sensitive `Intl`/`toLocale*` calls, including explicit `en-US` and `en-GB` values; and
- 33 explicit `aria-label`, `placeholder`, or `title` attributes requiring the same localization audit as visible copy.

The heaviest copy areas are the landing page, routine builders, active workout, profile, Training Lab, dialogs/sheets, onboarding, demo routes, and the privacy/terms pages. `src/lib/demo-data.ts` also contains display fixtures that need to match the selected language.

### Root document, metadata, fonts, and PWA

`src/app/layout.tsx` currently:

- hardcodes `<html lang="en">`;
- exports English-only static metadata;
- loads Geist and Geist Mono with the `latin` subset; and
- mounts the client-side Convex/Clerk provider above almost the entire product.

Spanish uses Latin-script glyphs, so no additional font family should be necessary; accented vowels, `ü`, `ñ`, inverted punctuation, and uppercase variants still need a visual glyph test.

`public/manifest.json` has `lang: "en"` plus English name, description, shortcuts, and screenshot labels. A cookie cannot vary that static file. Full parity should replace it with locale-aware manifest handling or consciously leave PWA install copy English during the beta.

The root, privacy, and terms metadata are English. Convert request-dependent metadata to `generateMetadata`; do not translate brand identifiers such as `OpenTrainer`.

### Server-produced labels and errors

Convex code currently formats weekday/week/workout labels with `en-US`. Convex functions do not receive the Next.js request cookie, so UI queries should return raw timestamps and numeric values, with formatting performed at the request/UI boundary. Avoid passing locale through every analytics query just to render a date label.

Backend errors should become stable machine codes (for example `WORKOUT_ALREADY_ACTIVE`) and be mapped to localized client messages. Translating arbitrary English exception strings in the client is brittle, while translating all Convex exceptions on the server would require threading locale through unrelated data operations.

### Persistence

The `users` table stores weight-unit and onboarding preferences but has no locale. Cookie-only persistence is sufficient for the first release and does not require a production schema migration.

If cross-device persistence is later required, add an optional `locale: "en" | "es"` user preference and use the precedence:

1. explicit cookie for the current browser;
2. authenticated user preference when available; and
3. English fallback.

Keep locale separate from `preferredUnits`: a Spanish-speaking user can choose pounds, and an English-speaking user can choose kilograms.

### Clerk and other vendor copy

Clerk renders sign-in, sign-up, and user-menu strings through `ClerkProvider`. Clerk provides `es-ES`, `es-MX`, `es-CR`, and `es-UY` resources through a separate `@clerk/localizations` package, but marks the localization feature experimental and notes that hosted Account Portal pages remain English ([Clerk localization](https://clerk.com/docs/guides/customizing-clerk/localization)).

Clerk has no generic `es` resource. Keep the app locale neutral, isolate the Clerk mapping in `src/i18n/config.ts`, and choose `esES` or `esMX` from the beta audience before implementation. That small copy decision does not change the architecture; it should not be inferred from weight units. Test every Clerk modal used by `SignInButton`, `SignUpButton`, and `UserButton`.

Sonner toasts are app-owned and belong in the message catalog. Plausible and PostHog do not render normal product UI. Browser/native validation text should not be relied on as a substitute for app-localized accessible validation messages.

## Ecosystem evaluation

Package versions and activity were checked against npm on 2026-07-21. All shortlisted ecosystems had a release in July 2026; adoption counts are directional because packages can be downloaded transitively. The npm download API reported approximately 17.5M downloads for [`next-intl`](https://api.npmjs.org/downloads/point/2026-06-21:2026-07-20/next-intl), 14.2M for [`react-intl`](https://api.npmjs.org/downloads/point/2026-06-21:2026-07-20/react-intl), 3.6M for [`@lingui/react`](https://api.npmjs.org/downloads/point/2026-06-21:2026-07-20/%40lingui%2Freact), 2.3M for [`next-i18next`](https://api.npmjs.org/downloads/point/2026-06-21:2026-07-20/next-i18next), and 1.6M for [Paraglide](https://api.npmjs.org/downloads/point/2026-06-21:2026-07-20/%40inlang%2Fparaglide-js) during 2026-06-21 through 2026-07-20. The i18next core and React binding were much larger again. These signals remove maintenance concern from the four mature candidates; framework fit and migration cost should decide.

| Option | App Router / RSC fit | Routing | Types and message workflow | ICU, values, and runtime | Lift in this repository | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| [`next-intl` 4.13.3](https://www.npmjs.com/package/next-intl) | First-class shared, async-server, and client APIs; request-scoped config | Locale routes are optional; cookie mode is documented | English JSON can drive key/locale/format type augmentation; catalog linting and extraction tooling are available | Native ICU messages; dates, times, relative time, numbers, lists, display names; active catalog can stay server-only or be provided to clients | One runtime package, one Next plugin, one request config, one provider; existing routes stay put | **Recommend** |
| [`next-i18next` 16.0.8](https://www.npmjs.com/package/next-i18next) + `i18next` + `react-i18next` | v16 adds App Router server/client exports and middleware/proxy integration | Both locale-in-path and cookie-based no-path modes are supported | Strong resource-key typing; official `i18next-cli` handles extraction, linting, sync, and type generation | Correct plural rules and `Intl`-based formatting; ICU syntax requires an additional plugin/pattern | Three runtime packages, namespaces/config/resource hydration, and distinct `getT`/`useT` APIs add concepts without helping this greenfield migration | Good second choice if the team already standardizes on i18next |
| [`Lingui` 6.5.0](https://www.npmjs.com/package/@lingui/react) | RSC support exists; official Next tutorial creates request-cached server instances and a serialized client provider | Official tutorial assumes middleware plus `app/[lang]`; cookie-only is possible but more custom here | Best-in-class extraction/compile loop; PO is the recommended catalog and TypeScript output is supported | ICU MessageFormat, plurals, rich text; compiled catalogs reduce parsing/runtime work | Multiple packages plus compiler/SWC setup, request cache wiring, and a route strategy adaptation | Strong for translator-heavy workflows, not lowest lift |
| [`react-intl` 10.1.18](https://www.npmjs.com/package/react-intl) / FormatJS | Current release has a dedicated `react-intl/server` entry; client and server use different setup paths | No routing or persistence layer; build it with Next APIs | Mature extraction/compile CLI and typed IDs through global augmentation | Most direct standards-first ICU and `Intl` surface; AST precompilation is available | Provider, request locale, routing/persistence, server cache, SWC plugin, and catalog loading are all application-owned | Capable foundation, but more plumbing than `next-intl` |
| [`Paraglide JS` 2.22.0](https://www.npmjs.com/package/@inlang/paraglide-js) | Compiler-first, typed, tree-shakable SSR messages | Flexible URL/cookie/base-locale strategies | Generated typed functions and inlang workflow | Compiled message functions minimize client runtime and support localized formatting | Attractive performance model, but its own Next.js guide warns that advanced setup is fragile and explicitly recommends `next-intl` for stability | Revisit after Next integration matures |

### Source notes by candidate

- `next-intl` documents ICU syntax, formatting, and type-safe keys on its [overview](https://next-intl.dev/) and [TypeScript augmentation guide](https://next-intl.dev/docs/workflows/typescript). Its message linter can catch missing translations and inconsistent ICU arguments ([message linting](https://next-intl.dev/docs/workflows/messages)).
- `next-i18next` v16 documents Server Components, Client Components, Next.js 16 proxy support, and no-locale-path mode in its [official repository](https://github.com/i18next/next-i18next). i18next documents [resource typing](https://www.i18next.com/overview/typescript), [plural handling](https://www.i18next.com/translation-function/plurals), and [`Intl`-based formatting](https://www.i18next.com/translation-function/formatting).
- Lingui documents its request-cache/client-provider setup in the [React Server Components tutorial](https://lingui.dev/tutorials/react-rsc), extraction/compilation in the [CLI reference](https://lingui.dev/ref/cli), and PO as its recommended catalog in [catalog formats](https://lingui.dev/ref/catalog-formats).
- FormatJS documents the separate client/server architecture in its [Next.js App Router guide](https://formatjs.github.io/docs/guides/nextjs-app-router/), ICU and TypeScript APIs in [React Intl](https://formatjs.github.io/docs/react-intl/), and extraction/verification in the [FormatJS CLI](https://formatjs.github.io/docs/tooling/cli/).
- Paraglide documents its generated, tree-shakable message functions and carries the Next.js stability warning in its [Next.js integration guide](https://paraglidejs.com/next-js).

## Proposed implementation shape

### Files

```text
messages/
  en.json                 # source of truth for message keys and types
  es.json                 # neutral Spanish catalog
src/
  i18n/
    config.ts             # locales, default locale, cookie name, guards
    request.ts            # request-scoped locale and active catalog
    formats.ts            # named number/date/time formats
  app/
    actions/
      locale.ts           # validated cookie write
    layout.tsx            # dynamic lang, provider, localized metadata path
  components/
    profile/
      locale-selector.tsx
  global.d.ts             # next-intl AppConfig augmentation
```

The catalog should use semantic namespaces by product surface rather than one flat file:

```json
{
  "Common": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "ActiveWorkout": {
    "finish": "Finish workout",
    "setsLogged": "{count, plural, =0 {No sets logged} one {# set logged} other {# sets logged}}"
  }
}
```

### Representative configuration

The following is directional implementation code, not code shipped by this PR:

```ts
// src/i18n/config.ts
export const locales = ["en", "es"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";
export const localeCookie = "opentrainer_locale";

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && locales.includes(value as AppLocale);
}
```

```ts
// src/i18n/request.ts
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isAppLocale, localeCookie } from "./config";

export default getRequestConfig(async () => {
  const stored = (await cookies()).get(localeCookie)?.value;
  const locale = isAppLocale(stored) ? stored : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

```ts
// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve the existing rewrites and other options.
};

export default createNextIntlPlugin()(nextConfig);
```

```ts
// src/global.d.ts
import en from "../messages/en.json";
import type { AppLocale } from "./i18n/config";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof en;
  }
}
```

```tsx
// relevant shape inside src/app/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Wrap the existing providers inside that client provider. Initially sending one active-locale catalog is acceptable because nearly all presentational code is already client-rendered. Record a production bundle baseline and split messages by route/provider only if the added serialized catalog or client execution is material.

The locale write should be a Server Action that accepts only `en` or `es`, sets a long-lived `httpOnly`, `sameSite: "lax"`, `path: "/"` cookie, and lets Next return the updated UI in the action response. If the selector invokes the action imperatively, refresh the current App Router route after it resolves ([Next.js `useRouter`](https://nextjs.org/docs/app/api-reference/functions/use-router)).

### Formatting rules

- Replace explicit `en-US`/`en-GB` formatters with `useFormatter` or `getFormatter` at the display boundary.
- Keep timestamps and numeric values raw in Convex responses.
- Use ICU plurals for sets, reps, exercises, workouts, minutes, and seconds.
- Keep weights governed by `preferredUnits`, then format the number using locale. Locale is not a unit system.
- Keep machine enums (`strength`, `hypertrophy`, `lifting`, `cardio`, etc.) stable and translate only their UI labels.
- For durations, prefer an ICU message built from the existing seconds/minutes representation in the first pass. `Intl.DurationFormat` can be evaluated separately; it does not justify a new polyfill for this release.

## Data boundaries that must remain separate

### App-owned UI copy

Translate navigation, headings, buttons, forms, dialogs, loading/error/empty states, toasts, ARIA labels, metadata, PWA labels, onboarding choices, analytics labels, and app-authored workout instructions through message keys.

Do not construct sentences by concatenating translated fragments. Use complete ICU messages so Spanish word order, agreement, and plurals can be translated correctly.

### AI-generated coaching

Current prompts require JSON with several user-facing free-text fields, including summaries, recommendations, routine names/descriptions/notes, swap reasoning, and progression reasoning. They do not carry output locale.

For Spanish AI output:

- add a validated `outputLocale` to each AI payload;
- tell the model to render only user-facing prose in that locale;
- keep JSON property names and enum values stable in English;
- keep safety and medical guardrails semantically identical across languages;
- include locale in assessment/report cache identity so an English cached report is not shown after switching to Spanish;
- retain user notes and freeform routine requests in the language entered; and
- add Spanish prompt fixtures that validate schema, locale, and safety—not just JSON parsing.

AI output is nondeterministic and needs bilingual human QA. Translating the UI catalog does not translate already persisted assessment prose. Until locale-aware generation and cache behavior ship, label the beta accurately or keep AI surfaces out of the Spanish beta.

### Exercise catalog and user-entered data

System exercise `name` is currently used as a canonical lookup key and is denormalized into workout entries, routines, history grouping, notes, trends, and AI payloads. Renaming `Bench Press` to `Press de banca` in stored data would fragment history and break exact-name lookups.

Initial policy:

- never translate user-created exercise names, notes, routine names, or imported data automatically;
- retain current stored system exercise names and machine identifiers;
- translate muscle-group, equipment, modality, goal, and status labels through UI messages; and
- optionally show English exercise names in the Spanish beta.

Future catalog localization should introduce a stable exercise identifier and locale-keyed display names/aliases. Search may accept Spanish aliases while storage and aggregation continue using the stable identifier. AI routines should return that identifier (or resolve a controlled English catalog name to it) and display the localized label.

### Legal content

Privacy and terms pages are long-form legal copy, not ordinary interface strings. Their Spanish versions require a qualified human review and separate version/effective-date tracking. Do not ship machine-translated legal text as final policy.

## Phased plan and effort

Estimates are engineering time for the current repository, excluding waiting time for a translator/legal reviewer.

### Phase 0: foundation and vertical slice — 1 to 2 developer-days

- Add `next-intl`, request config, Next plugin, types, active-locale catalogs, and root provider.
- Add a Profile language selector with cookie persistence.
- Set document `lang` dynamically and integrate Clerk Spanish localization.
- Translate shared navigation, Profile, Dashboard, and one complete workout flow.
- Establish missing-key and ICU-argument checks in CI.
- Capture English/Spanish bundle and Core Web Vitals baselines.

This is enough to validate architecture and translation quality with the feedback reporter, but it is not complete product localization.

### Phase 1: core Spanish UI beta — 3 to 5 additional developer-days

- Translate onboarding, routines, active/completed workout, history, Training Lab shell, feedback, shared sheets/dialogs, error boundaries, toasts, placeholders, and accessible names.
- Replace locale-sensitive formatting at UI boundaries and remove server-produced English date labels.
- Map user-visible backend failures from stable error codes.
- Add English/Spanish smoke coverage for main routes and language switching.
- Human-review neutral Spanish fitness terminology.

Translation and linguistic QA: approximately 1 to 2 reviewer-days for the core UI, depending on the final catalog and desired regional tone.

### Phase 2: AI and full public parity — 2 to 4 additional developer-days

- Thread locale into AI generation, cache by locale, and add bilingual safety/schema fixtures.
- Translate landing, pricing, demos, metadata, PWA manifest/shortcuts, and remaining edge states.
- Commission and review Spanish privacy/terms content.
- Decide whether public Spanish pages need locale URLs and `hreflang`.

AI prompt/regression QA and legal review are separate reviewer work. Full parity is therefore roughly **6 to 11 engineering days total**, plus Spanish translation, AI review, and legal review. A meaningful core UI beta is roughly **4 to 7 engineering days total**.

### Phase 3: optional hardening

- Persist locale in Convex for cross-device preference.
- Split client catalogs only if measured output warrants it.
- Add pseudolocalization and screenshot/regression tests.
- Add stable exercise IDs and translated system exercise labels/aliases.
- Introduce locale-prefixed public routes only if SEO/shareability requirements justify the route migration.

## Acceptance criteria

### Foundation

- `en` and `es` are the only accepted locale values; invalid cookie values safely fall back to English.
- Existing URLs and deep links do not change.
- Changing language updates the current page without losing client state unexpectedly.
- The choice survives reload and a new browser session.
- `<html lang>` matches rendered copy.
- English remains the complete fallback catalog and TypeScript rejects unknown message keys.

### Core Spanish UI beta

- A user can sign up/sign in, onboard, start and finish a workout, edit a routine, inspect history, open Training Lab, change preferences, submit feedback, and sign out without app-owned English UI appearing.
- Toasts, validation, empty/error/loading states, placeholders, alt text, `aria-label`s, and dialog titles are included in the audit.
- Spanish plurals are correct for zero, one, and many sets/reps/workouts.
- Dates and times follow the chosen Spanish locale; weight values continue honoring the independent kg/lb preference.
- Accented characters and inverted punctuation render correctly in Geist/Geist Mono at mobile and desktop sizes.
- Clerk modals and menus use the mapped Spanish resource, with its experimental limitation documented.
- Production bundle metrics are recorded; any significant regression is explained or catalog splitting is implemented.

### AI/full parity

- Locale-aware AI calls preserve JSON schemas and stable enums while producing Spanish user-facing prose.
- Cached/persisted English assessments do not appear as newly generated Spanish assessments.
- Spanish safety guidance is reviewed against the English guardrails.
- Public metadata and installable PWA labels match page language.
- Spanish legal content has recorded human approval.
- User-entered names/notes remain unchanged, and exercise history never splits because of translated display labels.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Root cookie access opts otherwise static public routes into dynamic rendering | Accept for beta, measure, then isolate authenticated routes or add locale public routes if needed |
| Almost all UI is client code, so the full active catalog is serialized | Start simple, measure actual bundle/RSC payload, split providers by route only when justified |
| Partial translation creates a confusing mixed-language product | Ship by complete user journeys and label the release beta until acceptance criteria pass |
| Backend English strings leak through error handling | Return stable codes and localize at the client boundary |
| AI cache returns prose generated in another language | Include locale in generation input and cache/report identity |
| Exercise translation corrupts historical identity/grouping | Keep stored names stable; introduce IDs and display labels before catalog localization |
| Spanish varies by region | Start with reviewed neutral `es`; map Clerk deliberately; collect region data before adding `es-MX`, `es-ES`, or `es-419` |
| Clerk localization is experimental and hosted Account Portal stays English | Test owned Clerk components, document limitation, and avoid claiming vendor-wide parity |
| Legal or safety meaning drifts in translation | Require human legal/fitness review and bilingual regression fixtures |
| Locale gets conflated with metric/imperial units | Keep locale and `preferredUnits` independent in types, persistence, and tests |

## Decision record

Proceed with a small implementation PR using `next-intl`, cookie persistence, unchanged URLs, neutral Spanish, and one end-to-end authenticated vertical slice. Do not add locale routing, a translation management service, catalog splitting, user-schema locale persistence, or exercise-name translation until the vertical slice establishes product demand and bundle/quality baselines.
