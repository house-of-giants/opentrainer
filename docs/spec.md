# OpenFit Technical Specification

## 1. Overview
OpenFit is a minimalist, AI-first workout tracking application designed for a mobile-first PWA experience. It focuses on rapid logging in a gym environment, leveraging a real-time data layer (Convex) and advanced AI orchestration (OpenRouter) to provide routines and performance assessments.

## 2. Core Tech Stack
- **Runtime:** Bun
- **Framework:** Next.js (App Router)
- **Database/Backend:** Convex (Real-time sync, Document model)
- **Authentication:** Clerk
- **Styling:** Tailwind CSS + shadcn/ui
- **AI Orchestration:** OpenRouter (Claude 3.5 Sonnet / GPT-4o-mini)
- **Deployment:** Vercel (Frontend) + Convex (Backend)

## 3. Data Architecture (Convex Schema)

### Tables
1. **`users`**: Extended profile data (goals, equipment, experience).
2. **`workouts`**: Sessions (timestamp, status, title).
3. **`entries`**: Individual exercise logs (lifting sets, cardio intervals).
4. **`routines`**: Templates for workouts.
5. **`assessments`**: AI-generated performance feedback.

```typescript
// Discriminated Union for Entries
type Entry = 
  | { kind: "lifting", exercise: string, sets: { weight: number, reps: number, rpe?: number }[] }
  | { kind: "cardio", exercise: string, duration: number, distance?: number, intensity: number };
```

## 4. Key Features & UX Design

### 4.1 Mobile-First Logging
- **PWA Capabilities:** "Add to Home Screen" support, offline caching for the shell.
- **Large Tap Targets:** Minimum 48px interactive area for all gym-floor actions.
- **Optimistic UI:** Instant feedback on set completion via Convex's local-first mutations.
- **Rest Timer:** Automated haptic-feedback timer triggered on set log.

### 4.2 AI Integration (OpenRouter)
- **Routine Generator:** Converts natural language or onboarding data into a JSON routine template.
- **Weekly Assessment:** Analyzes volume, frequency, and intensity to suggest adjustments.
- **JSON Import:** Specialized parser for routines exported from ChatGPT or other LLMs.

### 4.3 Onboarding Flow
- **Step 1:** Clerk Auth (Google/Apple).
- **Step 2:** Goal Setting (Strength, Hypertrophy, Cardio).
- **Step 3:** Equipment Audit (Dumbbells, Barbell, Machines, Cardio gear).
- **Step 4:** Initial AI Routine Generation.

## 5. Monetization Strategy
- **Free Tier:** Core logging, manual routines, 1 AI generation.
- **Pro Tier (/mo):** 
  - Unlimited AI Routines.
  - Weekly AI Performance Assessments.
  - JSON Import/Export.
  - Advanced Analytics (Volume tracking, 1RM projections).

## 6. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Setup Bun + Next.js + Convex + Clerk.
- Define initial schema.
- Implement basic Clerk onboarding.

### Phase 2: Logging UX (Weeks 3-4)
- Build the "Active Workout" logger with large tap targets.
- Implement optimistic updates and rest timer.
- PWA manifest configuration.

### Phase 3: AI & Imports (Weeks 5-6)
- Integrate OpenRouter for routine generation.
- Build the JSON import parser.
- Develop the "Assessment" Action in Convex.

### Phase 4: Polish & Launch (Weeks 7-8)
- Stripe integration for Pro tier.
- Performance profiling.
- Public beta.

## 7. JSON Import System Prompt
Users can use this prompt with ChatGPT to generate compatible data:
> "Act as a fitness data architect. Convert my workout routine into a single JSON object for OpenFit. Format: { 'name': 'Routine Name', 'blocks': [ { 'exercise': 'Name', 'sets': number, 'reps': number } ] }. Ensure exercise names are standard (e.g., 'Bench Press' not 'Chest Pushy Thing')."

