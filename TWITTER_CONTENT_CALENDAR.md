# OpenTrainer Twitter Content Calendar

Build-in-public posts for developer audience. Mix of tech learnings and product insights.

**Posting Schedule**: Monday & Thursday, 9am PT (optimal for dev Twitter)

---

## Week 1

### Monday, Jan 20
**Theme: Tech - Convex First Impressions**

```
First time using Convex in production.

The thing that surprised me most: no backend code.

I write a query, it's instantly available on the frontend with full type safety. Real-time updates just... work.

Building a workout tracker. The DX feels like cheating.
```

---

### Thursday, Jan 23
**Theme: Product - The Problem**

```
I built OpenTrainer because I got tired of:

- Tapping through 5 screens to log one set
- Watching ads to see my own workout history  
- Paying $15/mo for features that should be free
- Not being able to export my own data

The bar for fitness apps is underground.

We're just building something that doesn't suck.
```

---

## Week 2

### Monday, Jan 27
**Theme: Tech - Convex Actions for AI**

```
Using Convex actions to call Gemini for AI features.

The pattern is clean:

1. Action runs in Node.js runtime ("use node")
2. Fetches AI response
3. Calls internal mutation to store result
4. Returns to client

No separate API routes. No serverless config. Just... works.
```

---

### Thursday, Jan 30
**Theme: Product - Data Philosophy**

```
Every workout tracker holds your data hostage.

OpenTrainer: Full JSON export. Always.

Not CSV (lossy). Not PDF (useless).
Real, structured data you can import anywhere.

If you leave, your training history leaves with you.

This should be table stakes. It isn't.
```

---

## Week 3

### Monday, Feb 3
**Theme: Tech - Convex Real-time**

```
The part of Convex I didn't expect to love: real-time by default.

useQuery() auto-updates when data changes.

For a workout tracker, this means:
- Log a set on your phone
- Dashboard updates instantly
- No manual refresh, no polling, no websocket setup

I wrote zero real-time code. It's just... there.
```

---

### Thursday, Feb 6
**Theme: Product - Smart Swap Feature**

```
Just shipped "Smart Swap" — AI that suggests exercise alternatives mid-workout.

But we don't just give random suggestions.

We ask WHY you want to swap:
- Equipment busy?
- Don't have it at your gym?
- Causing discomfort?
- Just want variety?

Context changes everything.
```

---

## Week 4

### Monday, Feb 10
**Theme: Tech - Convex + Clerk Auth**

```
Convex + Clerk auth integration is surprisingly clean.

1. Clerk handles auth UI and session
2. Convex verifies JWT automatically
3. ctx.auth.getUserIdentity() gives you the user

No auth middleware. No token management. No refresh logic.

Spent 30 minutes on auth. For the whole app.
```

---

### Thursday, Feb 13
**Theme: Product - AI Onboarding**

```
Most fitness apps ask you to manually check 47 equipment boxes.

We ask one question: "Describe your gym setup."

"Home gym with rack, barbell, dumbbells up to 50lb, pull-up bar"

AI parses it. You confirm. Done.

Natural language > checkbox hell.
```

---

## Week 5

### Monday, Feb 17
**Theme: Tech - OpenRouter for AI**

```
Using OpenRouter instead of direct API calls for AI features.

Why:
- Single API for multiple models
- Easy model switching (testing Gemini 2.5 now)
- Built-in fallbacks
- Usage tracking across providers

Abstraction layer I didn't know I needed.
```

---

### Thursday, Feb 20
**Theme: Product - Pricing Transparency**

```
Controversial take: Everything is free during alpha.

Not freemium with annoying upsells.
Not "free tier with crippled features."

All Pro features. Free. For everyone.

Why? I need real feedback more than I need revenue right now.

Once it's good enough to charge for, I will.
```

---

## Week 6

### Monday, Feb 24
**Theme: Tech - Convex Schema**

```
Convex schema validation is interesting.

Define schema once:
v.object({ weight: v.number(), reps: v.number() })

Get:
- Runtime validation on writes
- TypeScript types generated
- No ORM, no migrations (yet)

Tradeoff: schema changes require thought. But types are always right.
```

---

### Thursday, Feb 27
**Theme: Product - UX Detail**

```
Small UX decision that took way too long:

Rest timer shows -15s and +15s buttons.

Not -30/+30 (too coarse).
Not -5/+5 (too tedious).

15 seconds is the minimum meaningful rest adjustment.

Sometimes the smallest decisions take the longest.
```

---

## Week 7

### Monday, Mar 3
**Theme: Tech - PWA Choice**

```
"Why not a native iOS/Android app?"

Because a PWA works on any device with no install.

You can add it to your home screen.
Works offline (soon).
No App Store gatekeeping.
Ships faster.

Maybe native someday. But "works everywhere now" beats "works better eventually."
```

---

### Thursday, Mar 6
**Theme: Product - Training Lab Gating**

```
Building "Training Lab" — AI-powered training insights.

Tempting to let users generate reports anytime.

Instead: Requires 3 workouts first.

Why? AI insights on 1 workout are useless. You need data to say something meaningful.

Gating features that require context > letting users get bad results.
```

---

## Week 8

### Monday, Mar 10
**Theme: Tech - Convex Aggregators Pattern**

```
Pattern I landed on for AI features in Convex:

1. Internal query aggregates raw data
2. Action calls aggregator, builds minimal payload
3. AI processes compressed context
4. Mutation stores result

Keeps AI prompts small. Keeps costs down. Keeps responses fast.
```

---

### Thursday, Mar 13
**Theme: Product - Haptic Polish**

```
Spent an afternoon on haptic feedback for the rest timer.

- Light buzz at 3, 2, 1 seconds remaining
- Success vibration when timer completes

On paper: trivial feature.
In practice: the difference between checking your phone and trusting it.

Polish matters.
```

---

## Week 9

### Monday, Mar 17
**Theme: Tech - Convex Internal Functions**

```
Convex has "internal" functions — only callable from other Convex functions, not from client.

Use case: AI aggregators that expose raw user data.

The client calls an action.
Action calls internal query for data.
Data never leaves the server.

Security by architecture, not just validation.
```

---

### Thursday, Mar 20
**Theme: Product - Core Philosophy**

```
Building a workout tracker app.

Most apps: 5 taps to log a set.
OpenTrainer: 2 taps.

When you're between sets with sweaty hands and 45 seconds of rest, every tap matters.

Shipping fast > shipping features.
```

---

## Week 10

### Monday, Mar 24
**Theme: Tech - Next.js 15 + Convex**

```
Running Next.js 15 + Convex.

The combo works well:
- Next.js handles routing, SSR, static pages
- Convex handles data, real-time, backend logic

Clear separation. No fighting over who does what.

Client components use Convex hooks. Server components fetch at build time. Simple.
```

---

### Thursday, Mar 27
**Theme: Product - Why We Built This**

```
We got tired of workout apps that felt like tax software.

Five taps to log a set. Subscriptions for basic features. Data locked behind paywalls.

OpenTrainer is the app we wanted to use.

Fast, focused, and respectful of your time and data.
```

---

## Engagement Tips

1. **Reply to every comment** — especially in the first hour
2. **Quote tweet interesting replies** — extends reach
3. **Don't post and ghost** — be present for 30 min after posting
4. **Cross-post to LinkedIn** — same content works, slightly more formal tone

## Content Ratios (Achieved)

- Tech learnings (Convex, AI, architecture): 50%
- Building in public (decisions, progress): 30%  
- Product-specific (features, philosophy): 20%

## Hashtags (Use Sparingly)

Only when relevant, max 1-2 per post:
- #buildinpublic
- #convex
- #indiehacker
- #nextjs

## Notes

- Adjust dates as needed for your actual posting schedule
- Feel free to reorder based on what you're actively working on
- Add screenshots/videos where possible (especially for UX posts)
- Each post can be a thread if you have more to say — but standalone works fine
