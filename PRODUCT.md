# OpenTrainer — PRODUCT.md

## Register

Mixed surface, product-first. The default register is **product** (the app —
dashboard, active workout, training lab — is where users live). The marketing
landing page at `apps/web/src/app/page.tsx` is a **brand** surface; treat
tasks scoped to it in the brand register.

## Users & Purpose

Lifters who log resistance training and want it to take seconds, not minutes.
They're mid-workout with loaded barbells and short rest windows; every tap
costs them. The job: log a set in ~2 taps, know what's next, see progress
without ceremony. Web app + native iPhone app (App Store id 6800907584),
backed by the same Convex data.

## Brand personality

Fast, plain-spoken, anti-BS. The hero copy is the brand: "Log workouts in
seconds, not minutes." Respect for the user's time and data is the whole
pitch — fast logging, plain progression, equipment-aware routines,
exportable JSON.

## Anti-references (stated in the product's own copy)

- No social feed.
- No black-box readiness scores.
- No lock-in (full data export is a feature, not a settings burial).
- No theatrical fitness-app marketing (transformation promises, hype
  metrics, stock gym photography).

## Design principles

- Existing system wins: OKLCH tokens in `apps/web/src/app/globals.css`
  (purple primary ~oklch(0.55 0.18 295), warm-tinted neutrals, dark mode via
  `.dark`), shadcn/ui components, Tailwind. Mobile mirrors these tokens in
  `apps/mobile/src/theme/tokens.ts`.
- Utility over decoration: the product's screenshots ARE the imagery; no
  stock photos, no illustration systems.
- Dense-but-calm data display in product surfaces; monospace tabular numbers
  for weights/reps.
- Accessibility: real contrast in both themes; the app honors reduced motion.
