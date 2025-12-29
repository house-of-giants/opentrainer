# OpenTrainer Technical Specification

## 1. Overview

OpenTrainer is a minimalist, AI-first workout tracking application designed for a mobile-first PWA experience. It focuses on rapid logging in a gym environment, leveraging a real-time data layer (Convex) and advanced AI orchestration (OpenRouter) to provide routines and performance assessments.

### Vision

- **Gym-Floor Ready**: Large tap targets (48px+), one-handed operation, works offline
- **AI-Powered**: Routine generation and weekly performance assessments
- **Import Anywhere**: Paste ChatGPT-generated routines as JSON

---

## 2. Core Tech Stack

| Component  | Technology               | Purpose                                       |
| ---------- | ------------------------ | --------------------------------------------- |
| Runtime    | Bun                      | Fast package management, native TypeScript    |
| Framework  | Next.js 16 (App Router)  | Server components, PWA support                |
| Database   | Convex                   | Real-time sync, document model, serverless    |
| Auth       | Clerk                    | OAuth, session management, user profiles      |
| Styling    | Tailwind CSS + shadcn/ui | Mobile-first components                       |
| AI         | OpenRouter               | Claude 3.5 Sonnet / GPT-4o-mini orchestration |
| Deployment | Vercel + Convex Cloud    | Global edge, auto-scaling                     |

---

## 3. Project Structure

```
opentrainer/
├── convex/
│   ├── schema.ts           # Convex data model (7 tables)
│   ├── auth.config.ts      # Clerk JWT authentication config
│   ├── users.ts            # User mutations/queries
│   ├── workouts.ts         # Workout CRUD operations
│   └── entries.ts          # Exercise entry logging
├── docs/
│   └── spec.md             # This document
├── public/
│   └── manifest.json       # PWA configuration
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with providers
│   │   ├── page.tsx        # Landing page
│   │   ├── globals.css     # Tailwind + shadcn theme
│   │   ├── dashboard/
│   │   │   └── page.tsx    # Main authenticated dashboard
│   │   └── workout/
│   │       └── active/
│   │           └── page.tsx # Active workout logging screen
│   ├── components/
│   │   ├── providers/
│   │   │   └── convex-client-provider.tsx
│   │   ├── ui/             # shadcn components
│   │   └── workout/
│   │       ├── set-stepper.tsx      # Weight/rep increment controls
│   │       ├── rest-timer.tsx       # Circular countdown with haptics
│   │       ├── exercise-card.tsx    # Exercise with set history
│   │       └── add-exercise-sheet.tsx # Bottom sheet for adding exercises
│   ├── hooks/
│   │   ├── use-client-id.ts  # Generates unique IDs for optimistic updates
│   │   └── use-haptic.ts     # Haptic feedback patterns
│   └── lib/
│       └── utils.ts          # Utility functions
├── src/proxy.ts              # Clerk auth proxy (Next.js 16)
├── .env.example              # Environment template
└── package.json
```

---

## 4. Data Architecture (Convex Schema)

### 4.1 Tables Overview

| Table               | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `users`             | Extended profile data synced from Clerk + onboarding info      |
| `exercises`         | Canonical exercise definitions (system + user-created)         |
| `workouts`          | Individual workout sessions                                    |
| `entries`           | Exercise logs within workouts (lifting sets, cardio intervals) |
| `routines`          | Workout templates for repeatable programs                      |
| `assessments`       | AI-generated performance feedback                              |
| `assessmentDetails` | Long-form AI content (separate for performance)                |

### 4.2 Entry Discriminated Union

The `entries` table uses a discriminated union pattern via the `kind` field:

```typescript
// Lifting entry
{
  kind: "lifting",
  exerciseName: "Bench Press",
  lifting: {
    setNumber: 1,
    reps: 8,
    weight: 135,
    unit: "lb",
    rpe: 7
  }
}

// Cardio entry
{
  kind: "cardio",
  exerciseName: "Stairstepper",
  cardio: {
    mode: "steady",
    durationSeconds: 1200,
    intensity: 8
  }
}
```

### 4.3 Key Indexes

- `users.by_clerk_id` - Fast lookup for auth
- `workouts.by_user_started` - User's workout history
- `entries.by_workout_created` - Ordered entries within workout
- `entries.by_client_id` - Deduplication for optimistic updates

---

## 5. Key Features & UX Design

### 5.1 Mobile-First Logging

| Feature           | Implementation                                                |
| ----------------- | ------------------------------------------------------------- |
| Large Tap Targets | Minimum 48px interactive area, shadcn Button with `size="lg"` |
| Optimistic UI     | Convex mutations with `clientId` for instant feedback         |
| Rest Timer        | Haptic feedback via `navigator.vibrate()`                     |
| Offline Support   | PWA shell caching, IndexedDB queue for offline sets           |

### 5.2 The "Add Set" Flow

1. User taps "+ Add Exercise" to select an exercise
2. Exercise card appears with weight/rep steppers
3. **Quick adjust**: Tap +/- buttons for increments (+5lb / +1 rep)
4. **Direct input**: Tap the number to type any value (e.g., 400lb)
5. Tap "Log Set" button to record
6. Optimistic update shows set immediately
7. Convex mutation fires in background with clientId deduplication
8. Rest timer auto-starts with haptic countdown

### 5.3 AI Integration (OpenRouter)

| Feature              | Model             | Trigger                     |
| -------------------- | ----------------- | --------------------------- |
| Routine Generation   | Claude 3.5 Sonnet | Onboarding / manual request |
| Weekly Assessment    | GPT-4o-mini       | Every Sunday (cron)         |
| Exercise Suggestions | GPT-4o-mini       | After 3+ weeks of data      |

### 5.4 Onboarding Flow

1. **Clerk Auth** - Google/Apple OAuth
2. **Goal Setting** - Strength / Hypertrophy / Endurance / Weight Loss
3. **Experience Level** - Beginner / Intermediate / Advanced
4. **Equipment Audit** - Checkboxes for available gear
5. **Schedule** - Days per week, session duration
6. **AI Routine Generation** - First routine created automatically

---

## 6. Monetization Strategy

### 6.1 Pricing Tiers

| Tier | Price | Features                                             |
| ---- | ----- | ---------------------------------------------------- |
| Free | $0    | Core logging, manual routines, 1 AI generation       |
| Pro  | $5/mo | Unlimited AI, weekly assessments, JSON import/export |

### 6.2 AI Cost Management

- **Allowance Model**: Pro users get 30 AI actions/month
- **Overage**: $2 credit packs for 10 additional actions
- **Token Tracking**: `tokenUsage` field in assessments table

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2) ✅ COMPLETE

- [x] Setup Bun + Next.js 16 + Convex + Clerk
- [x] Define Convex schema (7 tables)
- [x] Create ConvexClientProvider with Clerk integration
- [x] Configure PWA manifest
- [x] Build landing page with auth

### Phase 2: Logging UX (Weeks 3-4) ✅ COMPLETE

- [x] Build "Active Workout" screen (`/workout/active`)
- [x] Implement set increment steppers (weight/reps) with tap-to-edit
- [x] Add rest timer with haptic feedback and adjustable duration
- [x] Create workout history view (on dashboard)
- [x] Implement optimistic updates with clientId
- [x] Build dashboard page (`/dashboard`) with active workout detection
- [x] Add exercise sheet for selecting/adding exercises
- [x] Convex mutations: createWorkout, completeWorkout, cancelWorkout
- [x] Convex mutations: addLiftingEntry, addCardioEntry, deleteEntry
- [x] Auto-create user on first dashboard visit

### Phase 3: AI & Imports (Weeks 5-6)

- [ ] Integrate OpenRouter for routine generation
- [ ] Build JSON import parser
- [ ] Create "Assessment" Convex Action
- [ ] Design assessment UI cards

### Phase 4: Polish & Launch (Weeks 7-8)

- [ ] Stripe integration for Pro tier
- [ ] Performance profiling
- [ ] Public beta launch
- [ ] App Store / Play Store PWA listing

---

## 8. JSON Import Schema

### 8.1 OpenTrainer Import Format (v1)

```json
{
	"version": 1,
	"name": "Push Pull Legs",
	"days": [
		{
			"name": "Push Day",
			"exercises": [
				{
					"name": "Bench Press",
					"kind": "lifting",
					"targetSets": 4,
					"targetReps": "6-8",
					"targetRpe": 8
				},
				{
					"name": "Stairstepper",
					"kind": "cardio",
					"targetDuration": 15,
					"targetIntensity": 7
				}
			]
		}
	]
}
```

### 8.2 ChatGPT System Prompt

Users can use this prompt to generate compatible JSON:

```
Act as a fitness data architect for the OpenTrainer app.

Convert my workout routine into JSON with this exact format:
{
  "version": 1,
  "name": "Routine Name",
  "days": [
    {
      "name": "Day Name",
      "exercises": [
        {
          "name": "Exercise Name",
          "kind": "lifting" | "cardio",
          "targetSets": number,
          "targetReps": "range like 8-12",
          "targetRpe": 1-10
        }
      ]
    }
  ]
}

Rules:
- Use standard exercise names (e.g., "Bench Press" not "Chest Pushy Thing")
- For cardio, use "targetDuration" (minutes) instead of sets/reps
- Include "targetIntensity" (1-10) for cardio exercises
```

---

## 9. Environment Variables

### Local (.env.local)

```bash
# Convex (from dashboard.convex.dev)
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# Clerk (from dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# OpenRouter (from openrouter.ai/keys)
OPENROUTER_API_KEY=
```

### Convex Dashboard Environment Variables

```bash
# Required for Clerk JWT validation
# Get from Clerk Dashboard → API Keys → JWT Issuer
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

### Clerk Setup Requirements

1. Create a "convex" JWT Template in Clerk Dashboard → JWT Templates → New → Convex

---

## 10. Development Commands

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run Convex development server (separate terminal)
bunx convex dev

# Build for production
bun run build

# Type check
bun run lint
```

---

## 11. Design Principles

1. **Gym-Floor First**: Every interaction must work with sweaty hands and bad signal
2. **Instant Feedback**: Optimistic UI everywhere, no loading spinners for logging
3. **AI as Coach, Not Crutch**: AI suggests, user decides
4. **Data Portability**: JSON import/export, no lock-in
5. **Sustainable Pricing**: $5/mo covers AI costs with margin

---

## 12. Future Considerations

- **Wearable Integration**: Apple Watch, Garmin (Phase 5+)
- **Social Features**: Share PRs, compete with friends
- **Trainer Mode**: Create and sell routines
- **Native Apps**: React Native wrapper if PWA limits reached
