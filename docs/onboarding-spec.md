# Onboarding & Profile Collection Specification

## 1. Overview

OpenFit collects user profile data to personalize AI-powered features (Smart Swap, Training Lab, future Routine Builder). This spec defines how we gather this information through onboarding and in-context collection.

### Design Principles

- **Immediate onboarding**: Users complete profile setup before first dashboard visit
- **Free-form equipment input**: Users describe their gym naturally, AI parses to structured data
- **Editable via Profile**: All onboarding data can be modified later in settings
- **Progressive enhancement**: Data improves AI recommendations across all Pro features

---

## 2. Data Model

### Schema Additions

```typescript
// convex/schema.ts - users table
users: defineTable({
  // ... existing fields
  
  // Onboarding data
  goals: v.optional(v.array(v.union(
    v.literal("strength"),
    v.literal("hypertrophy"),
    v.literal("endurance"),
    v.literal("weight_loss"),
    v.literal("general_fitness")
  ))),
  
  experienceLevel: v.optional(v.union(
    v.literal("beginner"),
    v.literal("intermediate"),
    v.literal("advanced")
  )),
  
  // Equipment - dual storage
  equipmentDescription: v.optional(v.string()),  // Raw: "Planet Fitness"
  equipment: v.optional(v.array(v.string())),    // Parsed: ["smith_machine", "cables"]
  
  // Availability
  weeklyAvailability: v.optional(v.number()),    // Days per week (1-7)
  sessionDuration: v.optional(v.number()),       // Minutes (30-120)
  
  // Tracking
  onboardingCompletedAt: v.optional(v.number()), // Timestamp when completed
})
```

### Equipment IDs

Canonical equipment identifiers used across the system:

```typescript
// convex/lib/equipment.ts

export const EQUIPMENT_CATEGORIES = {
  freeWeights: [
    "barbell",
    "dumbbells", 
    "kettlebells",
    "ez_curl_bar",
  ],
  racksAndBenches: [
    "power_rack",
    "squat_rack", 
    "smith_machine",
    "flat_bench",
    "incline_bench",
    "adjustable_bench",
  ],
  cableMachines: [
    "cable_machine",
    "lat_pulldown",
    "cable_crossover",
  ],
  legMachines: [
    "leg_press",
    "hack_squat",
    "leg_curl",
    "leg_extension",
  ],
  otherMachines: [
    "chest_press_machine",
    "shoulder_press_machine",
    "row_machine",
    "pec_deck",
  ],
  bodyweight: [
    "pull_up_bar",
    "dip_station",
    "rings",
  ],
  accessories: [
    "resistance_bands",
    "trx",
    "landmine",
    "cable_attachments",
  ],
  cardio: [
    "treadmill",
    "rower",
    "bike",
    "stairmaster",
    "elliptical",
  ],
} as const;

export const ALL_EQUIPMENT_IDS = Object.values(EQUIPMENT_CATEGORIES).flat();
```

---

## 3. Onboarding Flow

### Route Protection

```
POST-SIGNUP
    ↓
user.onboardingCompletedAt === null?
    ├── YES → Redirect to /onboarding
    └── NO  → Allow /dashboard access
```

### Step Sequence

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: GOALS                                              │
│  "What are you training for?"                               │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Strength   │ │ Hypertrophy │ │  Endurance  │           │
│  │     💪      │ │     🏋️      │ │     🏃      │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐                           │
│  │ Weight Loss │ │   General   │      (multi-select)       │
│  │     ⚖️      │ │   Fitness   │                           │
│  └─────────────┘ └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: EXPERIENCE                                         │
│  "How long have you been lifting?"                          │
│                                                             │
│  ○ Beginner                                                 │
│    Less than 1 year of consistent training                  │
│                                                             │
│  ○ Intermediate                                             │
│    1-3 years, comfortable with main lifts                   │
│                                                             │
│  ○ Advanced                                                 │
│    3+ years, structured programming experience              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: EQUIPMENT (Input)                                  │
│  "Where do you work out?"                                   │
│                                                             │
│  Describe your gym or home setup:                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │  Planet Fitness                                         ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Examples:                                                  │
│  • "LA Fitness"                                             │
│  • "Home gym with power rack, barbell, and dumbbells"       │
│  • "Apartment - just resistance bands and pull-up bar"      │
│                                                             │
│                                        [Continue →]         │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    [AI PARSING]
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3b: EQUIPMENT (Confirmation)                          │
│  "We detected this equipment:"                              │
│                                                             │
│  ☑ Smith Machine        ☑ Cable Machine                     │
│  ☑ Dumbbells            ☑ Leg Press                         │
│  ☑ Leg Curl/Extension   ☐ Barbell                           │
│  ☐ Power Rack           ☑ Pull-up Bar                       │
│  ☑ Cardio Machines      ☐ Kettlebells                       │
│                                                             │
│  💡 Planet Fitness typically has smith machines instead     │
│     of free barbells. We'll suggest alternatives that       │
│     work with your setup.                                   │
│                                                             │
│                                        [Looks good →]       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: AVAILABILITY                                       │
│  "How often can you train?"                                 │
│                                                             │
│  Days per week:                                             │
│                    ┌───┐                                    │
│                    │ 4 │                                    │
│                    └───┘                                    │
│       1 ─────────────●─────────── 7                         │
│                                                             │
│  Session length:                                            │
│                   ┌────┐                                    │
│                   │ 60 │ min                                │
│                   └────┘                                    │
│      30 ─────────────●─────────── 120                       │
│                                                             │
│                                        [Get Started →]      │
└─────────────────────────────────────────────────────────────┘
                           ↓
                      /dashboard
```

---

## 4. Equipment Parser

### AI Action

```typescript
// convex/ai/equipmentParser.ts

export const parseEquipment = action({
  args: {
    description: v.string(),
  },
  handler: async (ctx, args): Promise<{
    equipment: string[];
    note?: string;
  }> => {
    // Calls Gemini with EQUIPMENT_PARSER_PROMPT
    // Returns structured equipment list
  },
});
```

### System Prompt

```
You are an equipment parser for a fitness app. Parse the user's gym description into a structured equipment list.

KNOWN GYM CHAINS (use these defaults):
- "Planet Fitness": smith_machine, cable_machine, dumbbells, leg_press, leg_curl, leg_extension, pull_up_bar, cardio machines (NO barbell, NO power_rack, NO heavy dumbbells)
- "LA Fitness" / "24 Hour Fitness" / "Gold's Gym": Full gym - all equipment available
- "Anytime Fitness": Usually full gym, may vary by location
- "Orange Theory": dumbbells (light), rower, treadmill, trx (limited strength equipment)
- "CrossFit box": barbell, power_rack, pull_up_bar, kettlebells, rower, rings
- "YMCA": Typically full gym with good variety

HOME GYM PATTERNS:
- "power rack" / "squat rack" / "cage": power_rack, usually implies barbell
- "dumbbells only": dumbbells, possibly adjustable_bench
- "bands" / "resistance bands": resistance_bands
- "pull-up bar" / "doorway bar": pull_up_bar

VALID EQUIPMENT IDS:
barbell, dumbbells, kettlebells, ez_curl_bar, power_rack, squat_rack, smith_machine,
flat_bench, incline_bench, adjustable_bench, cable_machine, lat_pulldown, cable_crossover,
leg_press, hack_squat, leg_curl, leg_extension, chest_press_machine, shoulder_press_machine,
row_machine, pec_deck, pull_up_bar, dip_station, rings, resistance_bands, trx, landmine,
treadmill, rower, bike, stairmaster, elliptical

OUTPUT FORMAT (JSON only):
{
  "equipment": ["equipment_id", "equipment_id", ...],
  "note": "Optional note about limitations or assumptions (e.g., 'Planet Fitness typically has dumbbells up to 75lbs')"
}

RULES:
1. Only use equipment IDs from the valid list above
2. When in doubt about a gym chain, assume full equipment
3. Include a note when making assumptions about limitations
4. For home gyms, only include what's explicitly mentioned
```

---

## 5. Profile Page Integration

Users can edit all onboarding data from their profile:

```
┌─────────────────────────────────────────────────────────────┐
│  Profile                                            [⚙️]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Avatar]  John Doe                                         │
│            john@example.com                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  TRAINING PROFILE                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Goals                                          [Edit]  ││
│  │ Strength, Hypertrophy                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Experience                                     [Edit]  ││
│  │ Intermediate                                           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Equipment                                      [Edit]  ││
│  │ "Planet Fitness"                                       ││
│  │ Smith machine, cables, dumbbells, +5 more              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Availability                                   [Edit]  ││
│  │ 4 days/week · 60 min sessions                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  STATS                                                      │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Equipment Editor

When editing equipment, users see:
1. Their original description (editable)
2. The parsed equipment checkboxes (editable)
3. "Re-analyze" button to re-run AI parser on updated description

---

## 6. How AI Features Use This Data

### Smart Swap

```typescript
// Payload sent to AI
{
  eq: user.equipment,  // ["smith_machine", "cable_machine", "dumbbells"]
  curr: { ... },
  reason: "equipment_unavailable",
}
// AI only suggests alternatives from user's available equipment
```

### Training Lab

```typescript
// Payload sent to AI
{
  user: {
    g: user.goals,                    // ["strength", "hypertrophy"]
    xp: user.experienceLevel,         // "intermediate"
    eq: user.equipment,               // ["smith_machine", ...]
    days: user.weeklyAvailability,    // 4
  },
  // ... workout data
}
// AI tailors recommendations to user's goals and experience
```

### Future: Routine Builder

Will use all profile data to generate personalized training programs that:
- Match user's goals (strength vs hypertrophy rep ranges)
- Fit their schedule (weeklyAvailability, sessionDuration)
- Only include exercises possible with their equipment
- Scale complexity to experience level

---

## 7. Implementation Phases

### Phase 1: Schema & Backend (2 hours) ✅
- [x] Add schema fields: `equipmentDescription`, `onboardingCompletedAt`
- [x] Create `convex/lib/equipment.ts` with equipment constants
- [x] Create `convex/ai/equipmentParser.ts` action
- [x] Add `completeOnboarding` mutation to `users.ts`

### Phase 2: Onboarding UI (4 hours) ✅
- [x] Create `/onboarding` page with wizard shell
- [x] Build step components: goals, experience, equipment, availability
- [x] Implement equipment confirmation with checkbox grid

### Phase 3: Routing (1 hour) ✅
- [x] Add redirect logic to dashboard
- [x] Protect onboarding route for completed users

### Phase 4: Profile Integration (2 hours) ✅
- [x] Add Training Profile section to profile page
- [x] Build edit dialogs for each field
- [x] Implement equipment re-parser

### Phase 5: Testing (1 hour)
- [ ] Test complete flow
- [ ] Verify AI features use new data correctly

**Total: ~10 hours**

---

## 8. File Structure

```
src/app/onboarding/
├── page.tsx                          # Wizard shell
└── steps/
    ├── goals-step.tsx                # Multi-select goal cards
    ├── experience-step.tsx           # Radio-style experience selector
    ├── equipment-step.tsx            # Free-form textarea
    ├── equipment-confirm-step.tsx    # Checkbox confirmation grid
    └── availability-step.tsx         # Dual sliders

convex/
├── lib/
│   └── equipment.ts                  # Equipment constants
├── ai/
│   └── equipmentParser.ts            # AI parsing action
└── users.ts                          # Updated with completeOnboarding mutation
```

---

*Last Updated: December 28, 2025*
*Version: 1.0*
