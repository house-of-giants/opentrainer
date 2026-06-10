# OpenTrainer Roadmap

**Last updated:** 2026-06-10  
**Status:** Alpha. First 1,000 users get Pro free for life.

This is the working plan for taking OpenTrainer from "alpha with a giveaway" to a credible default choice for people who lift. It is written for contributors and for the product team. It is honest about what we have, what we do not have, and what we will not build.

---

## 1. The position

The workout-app market has several durable complaints:

1. **Users do not want their own training history held hostage.** Several incumbents put deeper history, charts, or analytics behind paid tiers. OpenTrainer should never recreate that trust problem.
2. **The browser is underserved.** Strong, Hevy, and Fitbod are phone-first or phone-only for most serious logging. Boostcamp's web presence is closer to a program/content surface than a primary logger. A real web-first workout tracker is still a gap.
3. **Fitness apps decay by accretion.** Social feeds, nutrition modules, gamified streaks, opaque readiness scores, native-device sprawl. The product gets slower while the set still needs logging.

OpenTrainer's position: **modern + web-first + open data + free history, forever.** The open-source alternatives own parts of "open" but not enough polish; the big apps own parts of "modern" but not enough ownership or restraint.

The position only converts if two things are provable:

- **Reliability.** A tracker that can lose a workout mid-session is worthless. Offline protection and autosave are not polish; they are table stakes.
- **A permanent, explicit free promise.** Right now the product leans on the first-1,000 Pro giveaway. That is an acquisition hook, not a long-term product contract. The free/Pro charter below turns it into one.

## 2. Principles

These are constraints, not slogans. PRs that violate them should be rejected regardless of how useful the feature sounds. Internally, the product cuts out the bullshit. That phrase should stay internal, not become UI copy.

1. **Speed is the product.** Two taps per set. Every PR touching `/workout/active` gets a tap-budget review: if it adds a tap, gesture, wait, or decision to the logging path, it needs to remove one somewhere else.
2. **Your data is yours.** Full export, real import, no history caps, ever. Leaving must always be easy; that is why people will trust staying.
3. **Progressive overload is the spine.** The app exists to help users add weight, reps, sets, or useful training consistency over time. Suggestions come from logged sessions, not vibes.
4. **AI is bounded.** AI generates starting points and deeper analysis. It never gates a core flow, never blocks logging, and every AI feature has a manual or rule-based fallback. "Skip the spreadsheet," not "trust the robot."
5. **No social feed.** Not a deferred feature — a rejected one. Anti-bloat is the brand.
6. **No fake readiness scores.** No invented recovery percentages, no proprietary strain numbers. Show real numbers from real sets, cardio, notes, and trends.

## 3. The free/Pro line after the first 1,000

The giveaway creates users who expect everything free. We should get ahead of that by declaring the line now, publishing it before any billing code ships, and grandfathering visibly.

### Free forever — never paywalled, no history caps

- Unlimited workout logging: workouts, sets, exercises, notes, cardio, mobility.
- Complete history and per-exercise trends/charts.
- Manual routine creation and editing.
- Data export: JSON and CSV.
- Data import for supported formats.
- Rule-based progression suggestions in the active workout.
- The web app itself.

### Pro = AI depth and convenience, never data access

- Higher or unlimited AI routine generation and SmartSwap usage.
- AI-enhanced progression reasoning when available; rule-based suggestions remain free.
- Advanced Training Lab reports: deeper analysis, training-pattern warnings, and richer summaries.
- Future: coach/share features if they fit the product without bloating solo logging.

### Commitments to publish

- **Alpha users are grandfathered into Pro permanently.** Define the cohort in code and copy: the first 1,000 successful signups by user creation order get Pro for life, including future Pro features unless a future feature has a separately disclosed external hard cost.
- **Free AI allowance is never zero.** Exact allowance should be set from cost data, but the public charter needs a floor before billing ships. Proposed floor: at least 3 AI routine generations or SmartSwap actions per month on Free.
- **Pricing posture:** simple monthly price, no annual-only trap, no teaser price that doubles later. Undercut Hevy's paid value tier and stay far under Fitbod.
- **Hard rule:** no billing enforcement ships before this charter is live on `/pricing`, linked from the app, and consistent with the pricing cards.

## 4. Competition snapshot

Competitive claims here should be refreshed before they are used in marketing. The table is product strategy, not ad copy.

| Competitor | Their strongest promise | Gap OpenTrainer can exploit |
|---|---|---|
| **Strong** | Fast, reliable in-gym logging; strong habit among serious lifters | Deeper charts/analytics sit behind paid tiers; no true web-first logging surface; recurring public complaints around sync/data loss make reliability a wedge if we actually earn it |
| **Hevy** | Friendly free tier, social layer, broad exercise/routine support, AI trainer positioning | Social/feed gravity creates bloat risk; free tier has routine/analytics constraints; web is not the primary product; users who want quiet logging are underserved |
| **Fitbod** | AI builds workouts from equipment, recovery, and history | Expensive relative to simple loggers; less ideal for users following fixed programs; no permanent free logging path; AI can feel generic until trained |
| **Boostcamp** | Large library of coach-written programs and progression templates | Strong program content, weaker as the fastest everyday logger; can feel browse-heavy when the user only needs today's session |
| **TrainHeroic / Trainerize** | Coach-to-athlete delivery, compliance, client management | Powerful but heavy for solo lifters. Useful Phase 5 adjacency, not the current fight |
| **wger / FitNotes / LiftLog** | Data ownership, low/no subscription, open or simple workflows | The open/simple side of the market lacks a modern, polished, web-first product with fast logging and bounded AI |

**Summary:** Strong owns speed but not openness. Hevy owns community and free-ish breadth but adds noise. Fitbod owns AI planning but not low-friction ownership. Boostcamp owns programs but not the primary logger. OSS owns openness but not enough polish. The intersection is still open.

## 5. Current OpenTrainer state

Verified against the repo and current product surfaces, not only marketing copy.

### Have today

- **Fast set logging** with rest timer — `/workout/active`, `src/components/workout/exercise-accordion.tsx`.
- **Rule-based progression in the active workout** — `src/lib/progression.ts` and `convex/ai/progression.ts` provide ghost values and target suggestions. AI-enhanced progression is already Pro-gated in code and falls back to rule-based logic.
- **AI routine generation with equipment awareness** — `/routines/new/ai`, `convex/ai/routineGenerator.ts`, `equipmentParser.ts`.
- **SmartSwap and post-generation swaps** — `convex/ai/smartSwap.ts`, `swapMutations.ts`.
- **Training Lab analytics and AI reports** — `/training-lab`, `convex/ai/trainingLab.ts`, with per-exercise history available as a sheet (`exercise-history-sheet.tsx`).
- **Account-less demo surfaces** — `/demo/*` mirrors dashboard, workout, history, routines, and Training Lab.
- **JSON export** — available from the product; needs CSV to make the ownership promise stronger.
- **Dashboard session brief** — next action and weekly progress without invented readiness scoring.
- **Analytics plumbing** — PostHog client/server plus Plausible provider are already present.
- **Tier gating primitives** — `tier` exists in schema, AI rate limits exist, and some Pro-gated behavior already exists.

### Expand

- **Per-exercise history** — exists as a Training Lab sheet; promote it into a first-class route (for example `/history/exercise/[id]`) with 1RM and volume trends.
- **Export** — JSON exists; add CSV in a shape people and importers can actually use.
- **Training Lab** — report generation needs perceived-speed work and stronger cross-links into concrete exercise history.
- **Onboarding** — `/onboarding` is a required multi-step path (`goals`, `experience`, `availability`, `equipment`, `equipment-confirm`) with no fast skip to first value.
- **Demo** — strong asset, weak placement; should be a primary landing CTA and an instrumented acquisition funnel.
- **Pricing** — alpha copy exists, but the permanent free/Pro charter is not yet published.

### Missing

- **Offline/autosave/service worker** — `public/manifest.json` exists, but there is no service worker or local persistence for active workout data. Tab death or a gym dead zone mid-session is not protected.
- **Data import** — no Strong/Hevy CSV importer. This is the main switching unlock.
- **Program template library** — no built-in evidence-based templates such as 5/3/1-style, GZCLP-style, PPL, full-body 3-day, upper/lower.
- **Payment path** — tier gates exist, but no Stripe/Clerk billing path or plan management exists. That is fine until the charter is public.
- **Open-source credibility surface** — `CONTRIBUTING.md` exists, but there is no self-host guide, public changelog, contributor issue map, or public roadmap link.
- **Watch/wearables** — missing and deliberately deferred until Phase 5 at the earliest.

## 6. UI assessment

Priority order:

1. **`/workout/active` — the product.** Needs a real-phone, real-gym audit: tap counts per set, rest timer behavior when backgrounded, recovery after reload, and what survives connection loss. Progression ghosts and suggestion chips are useful; protect them from clutter.
2. **`/history` + `/workout/[id]` — functional, not yet sticky.** Missing the drill-down that retains serious users: "show me every bench session and my estimated 1RM/volume trend." Promote exercise history out of a sheet into a route.
3. **`/profile` — data ownership showcase.** Export lives here, so this page should prove the ownership promise. Add CSV export, make export/import easy to find, and keep account management boring.
4. **`/routines` and routine creation/editing — free core.** Manual routines are part of the forever-free promise. Keep routine creation fast, make templates startable, and do not bury manual controls under AI.
5. **`/onboarding` — too much before first value.** Add a skip path that lands in a starter template workout in under 60 seconds. Backfill profile later from the dashboard.
6. **`/training-lab` — good bones, slow moment.** Fix perceived speed of report generation; cross-link per-exercise pages; show raw numbers while AI is pending or unavailable.
7. **Landing + `/demo/*` — underused.** Demo should be above-the-fold: "try it, no account." Instrument demo-to-signup conversion.
8. **`/pricing` — needs the charter.** Replace temporary alpha-only copy with the permanent Free/Pro line and visible grandfathering.
9. **Dashboard — right direction after the brief work.** It should remain a launchpad, not a report. Resist card creep.

## 7. Phases and exit gates

Phases gate on outcomes, not dates.

### Phase 1 — Promise and reliability hardening

Make the long-term promise public and make the reliability claim true.

- Publish free/Pro charter on `/pricing` and link it from README/app surfaces.
- Service worker + offline queue + autosave for active workouts.
- Production detection for recovery/data-loss paths: autosave recovery events, orphaned active sessions, queue reconciliation failures, duplicate-prevention checks.
- Per-exercise history route.
- CSV export.
- Instrument taps-per-set and time-to-first-set.

**Exit gate:** pricing charter live; offline logging verified on real devices; airplane-mode/reload/tab-kill matrix passes; telemetry shows successful recoveries and no unresolved queue failures across the alpha cohort for 4 consecutive weeks.

### Phase 2 — First 1,000: switching and retention

- Strong/Hevy CSV import.
- 8–12 free evidence-based program templates.
- Onboarding fast path into a starter workout.
- Demo-first landing page, instrumented.

**Exit gate:** first 1,000 users reached; week-4 retention >= 25% for users who signed up after the fast-path/demo changes; >= 30% of users who signed up after import/templates shipped either import history or start from a template.

### Phase 3 — Public credibility

Make "open source" a verifiable claim instead of a badge.

- Self-host documentation: Convex + Clerk + env setup end-to-end.
- License clarity, refreshed `CONTRIBUTING.md`, curated good-first-issues, responsive PR review loop.
- Public changelog and roadmap maintenance habit.
- Plain-language data page: what goes to Gemini, what PostHog collects, what Plausible collects, and how to opt out of analytics where possible.

**Exit gate:** at least 5 merged external contributors; self-host path verified by someone outside the team; data/privacy page live.

### Phase 4 — Paid conversion

- Stripe + Clerk billing, enforcing exactly the Section 3 line: AI depth and convenience, never history/data access.
- Free tier keeps a real AI allowance.
- Alpha users visibly grandfathered.
- Pricing set from actual usage and conversion data, not guesses.

**Exit gate:** 3–5% free-to-Pro conversion at the chosen price. If conversion misses, revisit price, Pro feature packaging, onboarding, and AI value communication — not the free-forever data commitments.

### Phase 5 — Later expansion, deliberately deferred

Candidates, in rough order of strategic fit. None start before Phase 4's gate:

- Coach features: program sharing, client view, limited coach dashboard.
- Public API on top of export/import.
- Wearable integration, read-only first: heart rate and session enrichment, not primary logging.
- Native wrapper only if PWA limits prove real in the field.

**Explicit non-goals at every phase:** social feed, nutrition tracking, readiness/strain scores, gamification streaks.

## 8. First 10 implementation slices, in order

Each slice should be one PR-sized unit. Order matters: public promise -> reliability -> retention -> switching -> credibility.

### 1. Free-tier charter + pricing page rewrite

- **Why:** The promise needs to be public before the first 1,000 arrive expecting everything free, and before billing code exists. This is the cheapest high-leverage slice.
- **Acceptance:** `/pricing` states the Section 3 line in user language: free-forever list, what Pro is, alpha grandfathering, and the minimum free AI allowance; pricing cards match the charter; linked from README and app surfaces.
- **Non-goals:** Billing code, final price, plan-management UI.

### 2. Offline autosave for active workouts

- **Why:** Reliability is the wedge. If a workout can disappear in a gym dead zone, the product loses its right to exist.
- **Acceptance:** Sets logged offline persist through tab-kill and reload; queue reconciles with Convex on reconnect without duplicates; airplane-mode/reload test passes on a real phone; production events capture autosave recovery, queue reconciliation, duplicate prevention, and unrecovered failures.
- **Non-goals:** Full offline app shell, offline routine editing, background sync of anything except the active session.

### 3. Per-exercise history and trend pages

- **Why:** Free history and trends are the retention feature and the answer to paid charting in incumbents.
- **Acceptance:** Route per exercise showing every session, estimated 1RM trend where relevant, volume over time, and notes; linked from `/history`, workout detail, and Training Lab; loads fast with years of data.
- **Non-goals:** AI commentary, comparisons between exercises, new chart-library work beyond what the page needs.

### 4. CSV export

- **Why:** Data ownership needs a format spreadsheets and other tools understand. It also defines the round-trip contract for import.
- **Acceptance:** One-click CSV export alongside JSON; columns map cleanly to common workout-export conventions: date, exercise, set, weight, reps, RPE, notes, units; export round-trips through the importer once slice 5 lands.
- **Non-goals:** Scheduled exports, API access, PDF reports.

### 5. Strong/Hevy CSV import

- **Why:** The switching unlock. Users with years of history will not start from zero.
- **Acceptance:** Upload a Strong or Hevy export; preview before commit; exercise names map to our catalog with manual-match handling for misses; import is idempotent; import-start and import-complete rates are instrumented.
- **Non-goals:** Importers for every app, automatic competitor API sync, media import.

### 6. Onboarding fast path

- **Why:** Required setup before first value loses users. Time-to-first-set is a core metric.
- **Acceptance:** "Skip for now" available from the first onboarding step; skip cohort lands in a starter template workout; profile backfill is prompted from the dashboard and never blocks logging; median signup-to-first-set is under 5 minutes for skip users.
- **Non-goals:** Removing onboarding for users who want it, A/B platform work, redesigning every step.

### 7. Program template library

- **Why:** Closes enough of Boostcamp's program moat for the OpenTrainer audience and gives fast-path users somewhere useful to land.
- **Acceptance:** 8–12 evidence-based templates browsable and startable in <= 2 taps from routines; each has a plain-language "who this is for" description; template starts are instrumented.
- **Non-goals:** Paid/licensed coach content, marketplace, AI-generated variants.

### 8. Demo-first landing + funnel instrumentation

- **Why:** `/demo/*` is the strongest proof surface. Let users try the app before asking them to sign up.
- **Acceptance:** Demo is the primary above-the-fold CTA; demo-to-signup funnel is instrumented; demo data includes enough history to show trend pages; no signup wall inside the demo.
- **Non-goals:** Full landing redesign, paid acquisition, demo-to-account migration.

### 9. Training Lab perceived speed + progression cross-surfacing

- **Why:** Report latency is the weakest moment in an otherwise useful surface. Progression data should answer both "what now?" in the workout and "what next week?" in history/Lab.
- **Acceptance:** Reports render progressively or with useful partial states; no long blank spinner; progression suggestions appear on per-exercise pages and in Training Lab; every AI surface shows useful raw numbers when generation is pending or unavailable.
- **Non-goals:** New model/provider work, new report types, real-time coaching.

### 10. Open-source credibility pack

- **Why:** Open source with no self-host story and no contributor path reads as marketing. Commit to it or stop claiming it prominently.
- **Acceptance:** Self-host doc verified in a fresh environment; at least 10 curated good-first-issues; CONTRIBUTING covers setup, tap-budget rule, and review expectations; public changelog started; data/privacy page live.
- **Non-goals:** Governance bureaucracy, plugin system, monorepo restructuring.

## 9. North Star and instrumentation

**North Star: weekly logging users** — users who complete at least one workout in a rolling 7-day window. Not signups, not MAU. A tracker that is not used weekly is churned, whatever the dashboard says.

Supporting metrics:

| Metric | Target | Notes |
|---|---|---|
| Time-to-first-logged-set | < 5 min median for new signups | Funnel `user_signed_up -> set_logged` |
| Taps per set logged | <= 2 on the primary path | Brand promise as a regression test |
| Week-4 cohort retention | >= 25% by Phase 2 exit | Cohorted by signup week and post-feature availability |
| Active-session recovery success | 100% for supported test cases | Autosave recovery, queue replay, duplicate prevention |
| Unrecovered active-session failures | 0 unresolved | Every report/event is P0 until explained |
| Import completion rate | Track from slice 5 | Started imports vs committed imports |
| Demo-to-signup conversion | Track from slice 8 | Top-of-funnel proof |
| Free-to-Pro conversion | 3–5% in Phase 4 | Only meaningful after charter and billing |

Standing release gates:

- Nothing ships to `/workout/active` without offline-loss testing.
- No billing ships before the free-tier charter is published.
- No AI feature ships without a non-AI fallback path.
- PRs touching the logging path get a tap-budget review.
- Public competitor claims get source/date review before they become marketing copy.

## 10. Risks we're actively managing

- **Over-AI.** Generic AI routines are a common complaint in AI-first fitness apps. AI is a starting point and analysis layer, not the identity. Never block a core flow on an LLM call.
- **Privacy optics.** AI features send training data to Gemini; analytics use PostHog and Plausible. Publish the data page before someone else publishes their network-tab findings.
- **Complexity creep.** Every competitor decayed by adding. The tap budget and non-goals list are the immune system.
- **Giveaway hangover.** The first 1,000 get Pro forever; later users need a clear Free/Pro contract before they join. The free data/history commitments cannot be clawed back to fix conversion.
- **Open-source theater.** Claiming open while being hosted-only-in-practice burns the exact audience we are recruiting. Phase 3 is the commitment; if we will not fund it, we should soften the claim.
