# AI Coach 2.0: Technical Specification

> **Status**: Draft  
> **Last Updated**: January 2, 2026  
> **Prerequisites**: [AI Coach 1.0 Spec](./ai-coach-spec.md)

---

## 1. Executive Summary

AI Coach 2.0 transforms OpenTrainer from a passive logging tool into an active, history-aware performance coach. By leveraging **Gemini 1.5 Flash's** multimodal capabilities and Convex's real-time data layer, the app will provide:

1. **Immediate post-workout recaps** with wearable data integration
2. **Smart progression suggestions** based on RPE trends and history
3. **Native AI routine generation** tailored to user-specific equipment

### Design Principles

- **Multimodal-first**: Accept screenshots, not just text
- **History-aware**: Every suggestion considers past performance
- **Equipment-constrained**: AI only suggests exercises the user can actually do
- **Token-efficient**: Compress data, enforce JSON output, minimize waste
- **Privacy-first**: Ephemeral image processing — extract metrics, delete originals immediately

---

## 2. Core Features

### 2.1 Post-Workout Vision Analysis (The "Garmin Scan")

Users upload screenshots from wearable apps (Garmin Connect, Apple Health, Whoop) to supplement lifting data with physiological metrics.

#### How It Works

1. User completes a workout
2. On the "Workout Complete" screen, user taps "Add Wearable Data"
3. User uploads 1-3 screenshots from their watch app
4. AI extracts structured data via Vision OCR
5. AI generates a "Workout Recap" combining lifting + wearable data

#### Vision Extraction Targets

| Metric | Source | Use Case |
|--------|--------|----------|
| Average HR | Garmin/Apple screenshot | Intensity validation |
| Max HR | Garmin/Apple screenshot | Peak effort detection |
| HR Zones (time in zone) | Garmin/Apple screenshot | Training load calculation |
| Calories | Garmin/Apple screenshot | Energy expenditure tracking |
| Distance/Pace | Garmin/Apple screenshot | Cardio session enrichment |
| Recovery Time | Garmin/Apple screenshot | Readiness scoring |

#### AI Insights Generated

- **Intensity Alignment**: Compare reported RPE vs actual HR zones
  - *Example*: "You logged RPE 7, but your HR hit Zone 5 (175bpm) during Squats. You're pushing harder than your subjective rating suggests."
- **Recovery Scoring**: Analyze HR "dips" during rest periods
  - *Example*: "Your HR took 90 seconds to drop below 120bpm between sets. Consider extending rest to 3 minutes for heavy compounds."
- **Fatigue Detection**: Compare today's HR response to historical baseline
  - *Example*: "Your average HR was 15bpm higher than usual for this volume. You may be under-recovered."

#### Output Schema

```typescript
interface VisionAnalysisResult {
  extractedMetrics: {
    avgHr?: number;
    maxHr?: number;
    calories?: number;
    activeMinutes?: number;
    zones?: {
      zone1?: number; // minutes
      zone2?: number;
      zone3?: number;
      zone4?: number;
      zone5?: number;
    };
    distance?: {
      value: number;
      unit: "km" | "mi";
    };
  };
  insights: Array<{
    type: "intensity" | "recovery" | "fatigue" | "achievement";
    message: string;
    priority: "high" | "medium" | "low";
  }>;
  summary: string; // 2-3 sentence recap
}
```

---

### 2.2 History-Driven Progression (The "Ghost" Session)

Surfacing performance history directly in the active workout UI to drive progressive overload.

#### The "Ghost" Set

Display the previous session's weight and reps in a low-opacity row on the exercise card.

```
┌────────────────────────────────────────┐
│ Bench Press                            │
│                                        │
│ Last session: 135 lb × 10 @ RPE 7      │  ← Ghost (low opacity)
│                                        │
│ Set 1:  [140 lb]  × [8]   @ RPE [__]   │  ← Current input
│         ↑ Target suggestion            │
│                                        │
│ [Log Set]                              │
└────────────────────────────────────────┘
```

#### AI Progression Logic

Query: `getProgressionSuggestion`

Analyzes the last 3 sessions for a specific exercise:

| Condition | Suggestion |
|-----------|------------|
| RPE ≤ 7 for 2+ consecutive sessions | Increase weight by 2.5%–5% |
| RPE = 8 consistently | Hold weight, try for +1 rep |
| RPE ≥ 9 or reps dropped | Hold weight, increase rest by 30s |
| RPE = 10 or form notes mention discomfort | Suggest deload or swap |

#### Progression Output Schema

```typescript
interface ProgressionSuggestion {
  exerciseName: string;
  lastSession: {
    weight: number;
    reps: number;
    rpe: number;
    date: string;
  };
  suggestion: {
    type: "increase_weight" | "increase_reps" | "hold" | "deload";
    targetWeight?: number;
    targetReps?: number;
    reasoning: string;
  };
}
```

---

### 2.3 AI Routine Architect (Native Builder)

A built-in generator that creates routines based on a user's specific equipment, goals, and availability.

#### Input Requirements

| Field | Source | Required |
|-------|--------|----------|
| `goals` | User profile | Yes |
| `experienceLevel` | User profile | Yes |
| `equipment` | Parsed array from onboarding | Yes |
| `weeklyAvailability` | User profile | Yes |
| `sessionDuration` | User profile | No (default: 60 min) |
| `userDirective` | Free-text input | No |

#### User Directive Examples

- "3-day full body split for a busy schedule"
- "4-day powerbuilding program focused on deadlift"
- "Upper/Lower split with extra shoulder work"
- "I only have dumbbells and a pull-up bar"

#### Equipment Constraint Logic

The AI must ONLY suggest exercises compatible with the user's equipment array.

```typescript
// Example user equipment
["dumbbells", "pull_up_bar", "bench", "resistance_bands"]

// AI must NOT suggest:
// - Barbell exercises (no barbell)
// - Cable exercises (no cable machine)
// - Machine exercises (no machines)

// AI SHOULD suggest:
// - Dumbbell Bench Press (has dumbbells + bench)
// - Pull-ups (has pull_up_bar)
// - Banded Face Pulls (has resistance_bands)
```

#### Output Schema

```typescript
interface GeneratedRoutine {
  name: string;
  description: string;
  days: Array<{
    name: string;
    focus: string; // e.g., "Upper Body Push"
    exercises: Array<{
      exerciseName: string;
      kind: "lifting" | "cardio" | "mobility";
      targetSets: number;
      targetReps: string; // e.g., "8-12"
      targetRpe?: number;
      notes?: string;
      alternatives?: string[]; // Equipment-compatible swaps
    }>;
  }>;
  weeklyStructure: string; // e.g., "Day 1, Day 2, Rest, Day 3, Day 4, Rest, Rest"
  aiRationale: string; // Why this routine fits their goals
}
```

---

## 3. Technical Architecture

### 3.1 Multimodal Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     VISION ANALYSIS FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [User uploads screenshot]                                     │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ Convex Storage  │  ← Image stored with workout reference   │
│   │   (_storage)    │                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ Vision Action   │  ← Fetches image URL from storage        │
│   │ (analyzeScreenshot)                                        │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐     ┌─────────────────┐                  │
│   │   OpenRouter    │────▶│ Gemini 1.5 Flash│                  │
│   │   (API Call)    │     │ (Vision Model)  │                  │
│   └────────┬────────┘     └─────────────────┘                  │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ Structured JSON │  ← Extracted metrics + insights          │
│   │    Response     │                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐     ┌─────────────────┐                  │
│   │ workouts table  │     │ assessments     │                  │
│   │ (wearableMetrics)     │ (workout_recap) │                  │
│   └─────────────────┘     └─────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Model Extensions

#### Workouts Table Updates

```typescript
// convex/schema.ts - workouts table additions

workouts: defineTable({
  // ... existing fields ...
  
  // NEW: Reference to uploaded wearable screenshot(s)
  wearableSnapshots: v.optional(v.array(v.id("_storage"))),
  
  // NEW: Extracted metrics from vision analysis
  wearableMetrics: v.optional(v.object({
    avgHr: v.optional(v.number()),
    maxHr: v.optional(v.number()),
    calories: v.optional(v.number()),
    activeMinutes: v.optional(v.number()),
    zones: v.optional(v.object({
      zone1: v.optional(v.number()),
      zone2: v.optional(v.number()),
      zone3: v.optional(v.number()),
      zone4: v.optional(v.number()),
      zone5: v.optional(v.number()),
    })),
    distance: v.optional(v.object({
      value: v.number(),
      unit: v.union(v.literal("km"), v.literal("mi")),
    })),
    source: v.optional(v.string()), // "garmin", "apple", "whoop", etc.
  })),
  
  // NEW: AI-generated recap for this specific workout
  recapAssessmentId: v.optional(v.id("assessments")),
})
```

#### Assessments Table Updates

```typescript
// convex/schema.ts - assessments table updates

assessments: defineTable({
  // ... existing fields ...
  
  subjectType: v.union(
    v.literal("weekly_review"),
    v.literal("routine"),
    v.literal("workout"),
    v.literal("workout_recap"),    // NEW: Post-workout vision analysis
    v.literal("routine_generation") // NEW: AI routine creation audit
  ),
  
  // NEW: For vision-based recaps
  visionAnalysis: v.optional(v.object({
    extractedMetrics: v.any(), // VisionAnalysisResult.extractedMetrics
    processingTimeMs: v.number(),
    imageCount: v.number(),
  })),
})
```

### 3.3 New Convex Actions

#### Vision Analysis Action

```typescript
// convex/ai/vision.ts

export const analyzeWorkoutScreenshots = action({
  args: {
    workoutId: v.id("workouts"),
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args): Promise<VisionAnalysisResult> => {
    // 1. Auth + Pro check
    const user = await getAuthenticatedProUser(ctx);
    
    // 2. Get image URLs from storage
    const imageUrls = await Promise.all(
      args.storageIds.map(id => ctx.storage.getUrl(id))
    );
    
    // 3. Get workout context (exercises, sets, RPE)
    const workout = await ctx.runQuery(internal.workouts.getWorkoutWithEntries, {
      workoutId: args.workoutId
    });
    
    // 4. Build multimodal payload
    const payload = {
      workout: compressWorkoutData(workout),
      imageCount: imageUrls.length,
    };
    
    // 5. Call Gemini with vision
    const response = await callGeminiVision({
      systemPrompt: WORKOUT_RECAP_VISION_PROMPT,
      userMessage: JSON.stringify(payload),
      imageUrls: imageUrls.filter(Boolean) as string[],
      responseFormat: "json",
    });
    
    // 6. Parse and store results
    const result = JSON.parse(response.text) as VisionAnalysisResult;
    
    // 7. Update workout with extracted metrics
    await ctx.runMutation(internal.workouts.updateWearableMetrics, {
      workoutId: args.workoutId,
      metrics: result.extractedMetrics,
    });
    
    // 8. Store assessment
    await ctx.runMutation(internal.ai.trainingLabMutations.storeAssessment, {
      userId: user._id,
      subjectType: "workout_recap",
      subjectId: args.workoutId,
      model: "google/gemini-1.5-flash",
      summary: result.summary,
      insights: result.insights,
      visionAnalysis: {
        extractedMetrics: result.extractedMetrics,
        processingTimeMs: response.latencyMs,
        imageCount: imageUrls.length,
      },
      tokenUsage: response.usage,
    });
    
    return result;
  },
});
```

#### Routine Generation Action

```typescript
// convex/ai/routineGen.ts

export const generateRoutine = action({
  args: {
    userDirective: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GeneratedRoutine> => {
    // 1. Auth + Pro check (or check free tier quota)
    const user = await getAuthenticatedUser(ctx);
    
    // 2. Check quota
    const quota = await ctx.runQuery(internal.ai.getRoutineGenQuota, {
      userId: user._id,
    });
    if (!quota.canGenerate) {
      throw new Error(quota.message);
    }
    
    // 3. Build payload with user context
    const payload = {
      goals: user.goals,
      xp: user.experienceLevel,
      equipment: user.equipment ?? [],
      days: user.weeklyAvailability ?? 3,
      duration: user.sessionDuration ?? 60,
      directive: args.userDirective,
    };
    
    // 4. Call Gemini
    const response = await callGemini({
      systemPrompt: ROUTINE_GENERATION_PROMPT,
      userMessage: JSON.stringify(payload),
      responseFormat: "json",
      maxTokens: 2048,
    });
    
    // 5. Parse and validate
    const routine = JSON.parse(response.text) as GeneratedRoutine;
    
    // 6. Validate all exercises use available equipment
    validateEquipmentConstraints(routine, user.equipment ?? []);
    
    // 7. Log generation for quota tracking
    await ctx.runMutation(internal.ai.logRoutineGeneration, {
      userId: user._id,
      tokenUsage: response.usage,
    });
    
    return routine;
  },
});
```

---

## 4. System Prompts

### 4.1 Vision Recap Prompt

```typescript
// convex/ai/prompts.ts

export const WORKOUT_RECAP_VISION_PROMPT = `You are a sports scientist analyzing a user's workout alongside their wearable data.

TASK: Extract metrics from the provided screenshot(s) and generate insights by comparing wearable data to the logged workout.

INPUT:
1. One or more screenshots from a fitness wearable app (Garmin, Apple Health, Whoop, etc.)
2. A JSON object containing the user's logged workout (exercises, sets, reps, RPE)

OUTPUT: Respond with valid JSON only. No markdown.

SCHEMA:
{
  "extractedMetrics": {
    "avgHr": number | null,
    "maxHr": number | null,
    "calories": number | null,
    "activeMinutes": number | null,
    "zones": {
      "zone1": number | null,
      "zone2": number | null,
      "zone3": number | null,
      "zone4": number | null,
      "zone5": number | null
    },
    "distance": {
      "value": number,
      "unit": "km" | "mi"
    } | null
  },
  "insights": [
    {
      "type": "intensity | recovery | fatigue | achievement",
      "message": "string",
      "priority": "high | medium | low"
    }
  ],
  "summary": "string (2-3 sentences)"
}

GUIDELINES:
1. Extract ALL visible metrics from the screenshot. Use null if not visible.
2. Compare HR data to logged RPE:
   - Zone 4-5 with RPE < 7 = User underestimating effort
   - Zone 2-3 with RPE > 8 = User overestimating effort or fatigued
3. Analyze rest period recovery if HR graph shows clear dips.
4. Note any achievements or personal records visible in the screenshot.
5. Be concise. Insights should be actionable, not just observations.
6. Summary should highlight the single most important finding.

TONE: Supportive coach, not clinical. Use "you" language.`;
```

### 4.2 Routine Generation Prompt

```typescript
// convex/ai/prompts.ts

export const ROUTINE_GENERATION_PROMPT = `You are an elite strength coach creating a personalized workout routine.

TASK: Generate a complete workout routine based on the user's goals, experience, equipment, and availability.

INPUT: JSON object with:
- goals: Array of fitness goals
- xp: Experience level (beginner/intermediate/advanced)
- equipment: Array of available equipment
- days: Number of training days per week
- duration: Session duration in minutes
- directive: Optional user request/focus

OUTPUT: Respond with valid JSON only. No markdown.

SCHEMA:
{
  "name": "string (creative, descriptive name)",
  "description": "string (1-2 sentences)",
  "days": [
    {
      "name": "string (e.g., 'Push Day A')",
      "focus": "string (e.g., 'Chest, Shoulders, Triceps')",
      "exercises": [
        {
          "exerciseName": "string (standard exercise name)",
          "kind": "lifting | cardio | mobility",
          "targetSets": number,
          "targetReps": "string (e.g., '8-12')",
          "targetRpe": number | null,
          "notes": "string | null",
          "alternatives": ["string"] // 1-2 equipment-compatible swaps
        }
      ]
    }
  ],
  "weeklyStructure": "string (e.g., 'Day 1, Rest, Day 2, Rest, Day 3, Rest, Rest')",
  "aiRationale": "string (2-3 sentences explaining why this routine fits their goals)"
}

CRITICAL CONSTRAINTS:
1. ONLY use exercises possible with the provided equipment array.
2. If equipment is limited, suggest bodyweight alternatives.
3. Match volume to experience level:
   - Beginner: 10-14 sets per muscle group per week
   - Intermediate: 14-18 sets per muscle group per week
   - Advanced: 18-22+ sets per muscle group per week
4. Include warm-up suggestions in notes for compound movements.
5. Balance push/pull/legs appropriately.
6. Respect session duration constraints.

EQUIPMENT MAPPING:
- "dumbbells" → Dumbbell exercises
- "barbell" → Barbell exercises
- "pull_up_bar" → Pull-ups, chin-ups, hanging exercises
- "cables" → Cable exercises
- "machines" → Machine exercises
- "resistance_bands" → Banded exercises
- "kettlebells" → Kettlebell exercises
- "bodyweight" → Bodyweight exercises (always available)

If user has no equipment, assume bodyweight-only routine.`;
```

### 4.3 Progression Suggestion Prompt

```typescript
// convex/ai/prompts.ts

export const PROGRESSION_PROMPT = `You are a strength coach analyzing an athlete's recent performance to suggest their next session targets.

INPUT: JSON with:
- exercise: Exercise name
- history: Last 3 sessions (weight, reps, rpe, date)
- goals: User's fitness goals

OUTPUT: JSON only.

SCHEMA:
{
  "suggestion": {
    "type": "increase_weight | increase_reps | hold | deload",
    "targetWeight": number | null,
    "targetReps": number | null,
    "reasoning": "string (1 sentence)"
  }
}

RULES:
1. If RPE ≤ 7 for last 2 sessions → increase_weight (2.5-5%)
2. If RPE = 8 consistently → increase_reps (+1-2 reps at same weight)
3. If RPE ≥ 9 or reps decreased → hold (same weight/reps)
4. If RPE = 10 for 2+ sessions → deload (reduce weight 10%)
5. Round weight to nearest 2.5 lb / 1 kg increment.`;
```

---

## 5. Token Economics & Security

### 5.1 Estimated Token Usage

| Feature | Input Tokens | Output Tokens | Est. Cost |
|---------|--------------|---------------|-----------|
| Vision Recap | 800-1200 | 300-500 | ~$0.003-0.005 |
| Routine Generation | 400-600 | 600-1000 | ~$0.002-0.004 |
| Progression Suggestion | 150-250 | 100-150 | ~$0.0005-0.001 |

### 5.2 Quota Management

| Feature | Free Tier | Pro Tier |
|---------|-----------|----------|
| AI Routine Generation | 1 per account (lifetime) | 5 per month |
| Vision Analysis (Garmin Scan) | 2 teaser scans (lifetime) | Unlimited |
| Workout Recaps | Text-only (no vision) | Full vision + insights |
| Progression Suggestions | Last session only | Full 3-session analysis |
| Training Lab | Snapshot only (3-4 workouts) | Full report (5+ workouts) |

### 5.3 Quota Tracking Schema

```typescript
// convex/schema.ts

aiUsage: defineTable({
  userId: v.id("users"),
  month: v.string(), // "2026-01"
  
  routineGenerations: v.number(),
  visionAnalyses: v.number(),
  trainingLabReports: v.number(),
  
  totalInputTokens: v.number(),
  totalOutputTokens: v.number(),
  estimatedCostUsd: v.number(),
})
  .index("by_user_month", ["userId", "month"]),
```

### 5.4 Security Considerations

1. **Persona Hardening**: All prompts enforce a "Sports Scientist/Coach" persona
2. **JSON Enforcement**: `response_format: { type: "json_object" }` prevents off-topic responses
3. **Input Sanitization**: User directives are length-limited and stripped of special characters
4. **Image Validation**: Only accept image/* MIME types, max 10MB per image
5. **Rate Limiting**: Max 10 AI calls per user per hour (prevents abuse)

---

## 6. UI/UX Specifications

### 6.1 Workout Complete Screen (with Vision)

```
┌────────────────────────────────────────┐
│ ← Workout Complete              Done → │
├────────────────────────────────────────┤
│                                        │
│  🎉 Great workout!                     │
│                                        │
│  Duration: 52 min                      │
│  Total Volume: 12,450 lb               │
│  Sets: 24                              │
│                                        │
├────────────────────────────────────────┤
│  📊 Add Wearable Data          [+]     │
│                                        │
│  Upload your Garmin/Apple Watch        │
│  screenshot for deeper insights        │
│                                        │
│  ┌────────────────────────────────┐    │
│  │  📷 Tap to upload screenshot   │    │
│  │                                │    │
│  │  Supports: Garmin, Apple,      │    │
│  │  Whoop, Fitbit                 │    │
│  └────────────────────────────────┘    │
│                                        │
├────────────────────────────────────────┤
│                                        │
│  [Skip]           [Analyze Workout →]  │
│                                        │
└────────────────────────────────────────┘
```

### 6.2 Vision Recap Result

```
┌────────────────────────────────────────┐
│ ← Workout Recap                        │
├────────────────────────────────────────┤
│                                        │
│  "Your HR peaked at 172bpm during      │
│   squats, matching your RPE 9. Great   │
│   effort calibration. Recovery between │
│   sets could be improved."             │
│                                        │
├────────────────────────────────────────┤
│  EXTRACTED METRICS                     │
│                                        │
│  Avg HR        142 bpm                 │
│  Max HR        172 bpm                 │
│  Calories      487 kcal                │
│  Active Time   48 min                  │
│                                        │
│  Zone Distribution                     │
│  ████████████░░░░░░░░ Z3: 25 min      │
│  ██████░░░░░░░░░░░░░░ Z4: 15 min      │
│  ██░░░░░░░░░░░░░░░░░░ Z5: 8 min       │
│                                        │
├────────────────────────────────────────┤
│  INSIGHTS                              │
│                                        │
│  🔴 Recovery: HR took 90s to drop      │
│     below 120bpm. Try 3 min rest       │
│     between heavy sets.                │
│                                        │
│  🟢 Intensity: Your Zone 4-5 time      │
│     (23 min) matches your logged       │
│     high-RPE sets perfectly.           │
│                                        │
│  [Save to Workout]                     │
│                                        │
└────────────────────────────────────────┘
```

### 6.3 AI Routine Builder

```
┌────────────────────────────────────────┐
│ ← Create Routine                       │
├────────────────────────────────────────┤
│                                        │
│  ┌────────────────────────────────┐    │
│  │ 🤖 AI Routine Builder      PRO │    │
│  └────────────────────────────────┘    │
│                                        │
│  Your Equipment:                       │
│  [Dumbbells] [Pull-up Bar] [Bench]     │
│                                        │
│  Your Goals:                           │
│  [Strength] [Hypertrophy]              │
│                                        │
│  Days per Week:                        │
│  [3] [4] [5] [6]                       │
│       ↑ selected                       │
│                                        │
│  ─────────────────────────────────     │
│                                        │
│  Tell me what you want (optional):     │
│  ┌────────────────────────────────┐    │
│  │ Focus on pull-up strength and  │    │
│  │ bigger legs                    │    │
│  └────────────────────────────────┘    │
│                                        │
│  [Generate My Routine →]               │
│                                        │
│  ─────────────────────────────────     │
│                                        │
│  Or build manually:                    │
│  [Create from Scratch]                 │
│                                        │
└────────────────────────────────────────┘
```

### 6.4 Ghost Session UI

```
┌────────────────────────────────────────┐
│ Bench Press                     [...]  │
├────────────────────────────────────────┤
│                                        │
│  ┌────────────────────────────────┐    │
│  │ 📊 Last: 135 lb × 10 @ RPE 7   │    │  ← Ghost row
│  │    Target: 140 lb × 8-10       │    │  ← AI suggestion
│  └────────────────────────────────┘    │
│                                        │
│  Set 1                                 │
│  ┌──────────┐ ┌──────────┐             │
│  │  140 lb  │ │  8 reps  │  @ RPE ___  │
│  └──────────┘ └──────────┘             │
│       ↑ Pre-filled from target         │
│                                        │
│  [Log Set]                 [🔄 Swap]   │
│                                        │
└────────────────────────────────────────┘
```

---

## 7. Implementation Roadmap

### Phase 1: Context & History (Week 1)
- [ ] Implement "Ghost Set" UI in `ActiveWorkout` exercise cards
- [ ] Create `getProgressionSuggestion` query
- [ ] Display "Last Session" data from `getLastSetForExercise`
- [ ] Add "Target" badge with AI progression suggestion

### Phase 2: Multimodal Recap (Week 2)
- [ ] Add Convex file storage for workout screenshots
- [ ] Create `pendingUploads` tracking table
- [ ] Build image upload component with client-side sanitization (resize, strip EXIF)
- [ ] Implement `callGeminiVision` utility function
- [ ] Create `analyzeWorkoutScreenshots` action with delete-on-success
- [ ] Implement TTL cleanup cron job for orphaned uploads
- [ ] Build `WorkoutRecap` display component
- [ ] Create `WORKOUT_RECAP_VISION_PROMPT`
- [ ] Add privacy notice UI on upload screen

### Phase 3: Routine Architect (Week 3)
- [ ] Build "AI Routine Builder" UI in `routines/new`
- [ ] Create `generateRoutine` action
- [ ] Implement equipment constraint validation
- [ ] Create `ROUTINE_GENERATION_PROMPT`
- [ ] Add routine preview and edit flow

### Phase 4: Integration & Quotas (Week 4)
- [ ] Create `aiUsage` table for quota tracking
- [ ] Implement quota checking middleware
- [ ] Connect vision-extracted metrics to Training Lab
- [ ] Add Pro gate UI for free tier users
- [ ] Error handling and fallback UI

---

## 8. Future Enhancements

| Feature | Description | Priority |
|---------|-------------|----------|
| Garmin API Integration | Direct sync without screenshots | Low (complex) |
| Apple HealthKit PWA | Web-based health data access | Medium |
| Voice Logging | "Log bench 135 for 10" with Smart Swap context | Low |
| Routine Auto-Adjustment | AI modifies routine based on Training Lab trends | Medium |
| Comparison Reports | Week-over-week or month-over-month Training Lab | Medium |
| Exercise Video Links | Smart Swap shows form videos for alternatives | Low |
| Social Sharing | Share AI-generated recaps to social media | Low |

---

## 9. Open Questions

1. ~~**Image Compression**: Should we compress images client-side before upload to reduce storage costs?~~ **RESOLVED**: Yes, client-side resize to 1200px + JPEG 85% (see Section 10.4)
2. **Multi-Image Analysis**: Should we send all screenshots in one API call or process them separately?
3. **Caching**: Should we cache progression suggestions to reduce API calls for repeat exercises?
4. **Offline Support**: How should vision analysis behave when the user is offline?
5. ~~**Image Retention**: How long should we keep uploaded screenshots?~~ **RESOLVED**: Delete immediately after processing (see Section 10)

---

## 10. Data Privacy & Image Retention

### 10.1 The Problem

Wearable screenshots may contain sensitive health information:
- Heart rate data (potential indicator of health conditions)
- GPS/location data (home address, gym location)
- Personal identifiers (name, profile photo visible in app)
- Health scores and recovery metrics

Storing these images long-term creates:
- **Privacy liability**: PHI-adjacent data requires careful handling
- **Storage costs**: Images are 10-100x larger than extracted metrics
- **User trust concerns**: Users may hesitate to upload if they know images persist

### 10.2 Ephemeral Processing Policy

OpenTrainer enforces a strict **"Zero-Persistence"** policy for wearable screenshots:

```
┌─────────────────────────────────────────────────────────────────┐
│                  EPHEMERAL IMAGE LIFECYCLE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [User uploads screenshot]                                     │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ Temp Storage    │  ← Image stored with 2-hour TTL          │
│   │ (ephemeral)     │                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ Vision Analysis │  ← AI extracts structured metrics        │
│   │   (Gemini)      │                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ├────────────────────┐                              │
│            │                    │                              │
│            ▼                    ▼                              │
│   ┌─────────────────┐  ┌─────────────────┐                     │
│   │ IMMEDIATELY     │  │ Structured JSON │                     │
│   │ DELETE IMAGE    │  │ (metrics only)  │                     │
│   │ from storage    │  │ saved to DB     │                     │
│   └─────────────────┘  └─────────────────┘                     │
│            │                    │                              │
│            ▼                    ▼                              │
│   ┌─────────────────┐  ┌─────────────────┐                     │
│   │   GONE FOREVER  │  │ Permanent Store │                     │
│   │   (no recovery) │  │ (anonymous ints)│                     │
│   └─────────────────┘  └─────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.3 Implementation Details

#### Delete-on-Success Pattern

```typescript
// convex/ai/vision.ts

export const analyzeWorkoutScreenshots = action({
  args: {
    workoutId: v.id("workouts"),
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args): Promise<VisionAnalysisResult> => {
    const user = await getAuthenticatedProUser(ctx);
    
    // 1. Get temporary URLs for AI processing
    const imageUrls = await Promise.all(
      args.storageIds.map(id => ctx.storage.getUrl(id))
    );
    
    // 2. Process with AI
    const response = await callGeminiVision({
      systemPrompt: WORKOUT_RECAP_VISION_PROMPT,
      userMessage: JSON.stringify({ workout: compressedWorkout }),
      imageUrls: imageUrls.filter(Boolean) as string[],
      responseFormat: "json",
    });
    
    const result = JSON.parse(response.text) as VisionAnalysisResult;
    
    // 3. Store ONLY the extracted metrics (anonymous integers)
    await ctx.runMutation(internal.workouts.updateWearableMetrics, {
      workoutId: args.workoutId,
      metrics: result.extractedMetrics, // { avgHr: 142, maxHr: 172, ... }
    });
    
    // 4. IMMEDIATELY delete the raw images
    await Promise.all(
      args.storageIds.map(id => ctx.storage.delete(id))
    );
    
    // 5. Return insights (image is already gone)
    return result;
  },
});
```

#### TTL Fail-Safe (Cron Job)

For cases where processing fails or the user abandons the flow mid-upload:

```typescript
// convex/crons.ts

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every hour to clean up orphaned uploads
crons.hourly(
  "cleanup-orphaned-wearable-uploads",
  { minuteUTC: 30 },
  internal.storage.cleanupOrphanedUploads
);

export default crons;
```

```typescript
// convex/storage.ts

export const cleanupOrphanedUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const cutoff = Date.now() - TWO_HOURS_MS;
    
    // Find all pending uploads older than 2 hours
    const orphanedUploads = await ctx.db
      .query("pendingUploads")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoff))
      .collect();
    
    // Delete from storage and tracking table
    for (const upload of orphanedUploads) {
      await ctx.storage.delete(upload.storageId);
      await ctx.db.delete(upload._id);
    }
    
    if (orphanedUploads.length > 0) {
      console.log(`Cleaned up ${orphanedUploads.length} orphaned uploads`);
    }
  },
});
```

#### Pending Uploads Tracking Table

```typescript
// convex/schema.ts

pendingUploads: defineTable({
  userId: v.id("users"),
  storageId: v.id("_storage"),
  workoutId: v.optional(v.id("workouts")),
  purpose: v.literal("wearable_analysis"),
  createdAt: v.number(),
})
  .index("by_created", ["createdAt"])
  .index("by_user", ["userId"]),
```

### 10.4 Client-Side Sanitization

Before the image even leaves the user's device:

```typescript
// src/lib/image-utils.ts

export async function sanitizeImageForUpload(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    
    img.onload = () => {
      // 1. Resize to max 1200px (preserves readability, reduces size)
      const MAX_SIZE = 1200;
      let { width, height } = img;
      
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // 2. Draw image (strips EXIF/GPS metadata automatically)
      ctx.drawImage(img, 0, 0, width, height);
      
      // 3. Convert to compressed JPEG
      canvas.toBlob(
        (blob) => resolve(blob!),
        "image/jpeg",
        0.85 // Quality: 85%
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
}
```

### 10.5 What IS Stored vs. What IS NOT

| Data Type | Stored? | Location | Retention |
|-----------|---------|----------|-----------|
| Raw screenshot (JPG/PNG) | **NO** | Deleted after processing | < 60 seconds |
| EXIF/GPS metadata | **NO** | Stripped client-side | Never stored |
| Extracted HR (integer) | Yes | `workouts.wearableMetrics` | Permanent |
| Extracted zones (integers) | Yes | `workouts.wearableMetrics` | Permanent |
| AI-generated summary (text) | Yes | `assessments.summary` | Permanent |
| Fact that an image was analyzed | Yes | `assessments.visionAnalysis.imageCount` | Permanent |

### 10.6 User Communication

On the upload screen, display a privacy notice:

```
┌────────────────────────────────────────┐
│  🔒 Your screenshot is processed       │
│     securely and deleted immediately.  │
│                                        │
│  We only save the extracted numbers    │
│  (heart rate, zones) — never the       │
│  original image.                       │
└────────────────────────────────────────┘
```

### 10.7 Comparison: How Others Handle Health Images

| App / Industry | Strategy | Retention |
|----------------|----------|-----------|
| **Banking (Check Deposit)** | Encrypted storage | 7 years (legal requirement) |
| **Telehealth (Doctor Visit)** | HIPAA-compliant vault | Permanent (medical record) |
| **MyFitnessPal (Food Photo)** | User-controlled storage | Until user deletes |
| **MacroFactor (Food Photo)** | Optional, user-controlled | Until user deletes |
| **OpenTrainer (Proposed)** | **Ephemeral processing** | **< 60 seconds** |

OpenTrainer's approach is the most privacy-preserving option for a non-medical fitness app.

### 10.8 Edge Cases

| Scenario | Handling |
|----------|----------|
| AI call fails mid-processing | TTL cron deletes image within 2 hours |
| User closes app during upload | TTL cron cleanup |
| User wants to re-analyze | Must re-upload (no cached images) |
| User requests data export | Includes metrics, NOT original images |
| User requests data deletion | Metrics deleted; images already gone |

### 10.9 Audit Logging

For transparency and debugging, log (but do not store images):

```typescript
// Log entry example (no PII, no image data)
{
  type: "vision_analysis",
  userId: "user_abc123", // Internal ID only
  workoutId: "workout_xyz789",
  imageCount: 2,
  processingTimeMs: 1847,
  extractedMetrics: ["avgHr", "maxHr", "zones"], // Field names only
  success: true,
  timestamp: "2026-01-02T19:30:00Z"
}
```

---

## Appendix A: Gemini Vision API Call

```typescript
// convex/ai/gemini.ts

interface GeminiVisionOptions {
  systemPrompt: string;
  userMessage: string;
  imageUrls: string[];
  responseFormat?: "json" | "text";
  maxTokens?: number;
}

export async function callGeminiVision(options: GeminiVisionOptions): Promise<GeminiResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  // Build content array with images
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: options.userMessage },
  ];

  for (const url of options.imageUrls) {
    content.push({
      type: "image_url",
      image_url: { url },
    });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://opentrainer.app",
      "X-Title": "OpenTrainer",
    },
    body: JSON.stringify({
      model: "google/gemini-1.5-flash",
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content },
      ],
      max_tokens: options.maxTokens ?? 1024,
      ...(options.responseFormat === "json" && {
        response_format: { type: "json_object" },
      }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  return {
    text: data.choices[0]?.message?.content ?? "",
    usage: {
      input: data.usage?.prompt_tokens ?? 0,
      output: data.usage?.completion_tokens ?? 0,
    },
    latencyMs: 0, // Set by caller
  };
}
```

---

*Last Updated: January 2, 2026*  
*Version: 2.1 — Added Ephemeral Image Processing (Section 10)*
