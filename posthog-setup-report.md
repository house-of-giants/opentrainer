<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the OpenTrainer Next.js App Router project. The integration includes client-side initialization via `instrumentation-client.ts` (the recommended approach for Next.js 15.3+), a server-side PostHog singleton in `src/lib/posthog-server.ts`, a reverse proxy configuration in `next.config.ts` to route events through `/ingest`, and 12 business-critical events spread across 6 files. User identification is wired to Clerk authentication — new and returning users are identified by their Clerk ID with name and email traits. Error tracking via `posthog.captureException` is added at critical failure boundaries (workout completion, AI routine generation). Environment variables are stored in `.env.local` and never hardcoded.

| Event | Description | File |
|---|---|---|
| `onboarding_completed` | User completes the full onboarding flow (goals, experience, equipment, availability) | `src/app/onboarding/page.tsx` |
| `workout_started` | User starts a new workout from empty or from a routine | `src/components/workout/start-workout-sheet.tsx` |
| `workout_completed` | User finishes and completes an active workout session | `src/app/workout/active/page.tsx` |
| `workout_cancelled` | User cancels an active workout session before completing it | `src/app/workout/active/page.tsx` |
| `set_logged` | User logs a lifting set during an active workout | `src/app/workout/active/page.tsx` |
| `cardio_logged` | User logs a cardio exercise entry during an active workout | `src/app/workout/active/page.tsx` |
| `exercise_swapped` | User swaps an exercise during an active workout via smart swap | `src/app/workout/active/page.tsx` |
| `ai_routine_generated` | User successfully generates an AI-powered workout routine | `src/app/routines/new/ai/page.tsx` |
| `ai_routine_saved` | User saves a generated AI workout routine to their account | `src/app/routines/new/ai/page.tsx` |
| `user_signed_up` | New user account is created in the system (via Clerk + Convex) | `src/app/dashboard/page.tsx` |
| `weekly_goal_updated` | User changes their weekly workout goal on the dashboard | `src/app/dashboard/page.tsx` |
| `pricing_page_viewed` | User views the pricing page — top of the upgrade conversion funnel | `src/app/pricing/page.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- 📊 **Dashboard — Analytics basics**: https://us.posthog.com/project/324621/dashboard/1311186
- 🔽 **User Activation Funnel** (Sign-up → Onboarding → First Workout): https://us.posthog.com/project/324621/insights/8BeMAciL
- 📈 **Workout Completion vs Cancellation** (weekly trend): https://us.posthog.com/project/324621/insights/Wri0G1W8
- 🤖 **AI Routine Generation & Save Rate** (funnel): https://us.posthog.com/project/324621/insights/Rv5WFKhr
- 👥 **Daily Active Users (Workout Activity)**: https://us.posthog.com/project/324621/insights/wmMJYtqU
- 🆕 **New User Signups (Weekly)**: https://us.posthog.com/project/324621/insights/5X7wmDAx

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
