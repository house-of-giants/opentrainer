# Workout Detail Edit Rework — Implementation Spec

Target: `src/app/workout/[id]/page.tsx` (post-workout detail view).
Goal: expand editing from times+delete to everything reasonable on a logged workout, mobile-first, reusing the active-flow edit primitives.

All paths relative to `/srv/hog/workspace/internal/prod-opentrainer/app`.

---

## 1. Edit capability matrix

| Editable thing | Mutation | Status | UI affordance |
|---|---|---|---|
| Workout title | `api.workouts.updateWorkoutTitle` | exists | Pencil icon next to the `<h1>` in the header; swaps title for an inline input (Enter/Check commits, Escape cancels) — same idiom as routines edit page (`routines/[id]/edit/page.tsx:579-622`) |
| Workout notes | `api.workouts.updateWorkoutNotes` | **new** | Notes block in the summary card becomes tappable (or "Add notes" ghost button when empty) → opens `NoteSheet` |
| Start/end times | `api.workouts.updateWorkoutTimes` | exists, already wired | Unchanged: "Edit date/time" button → `WorkoutTimeEditorDialog` mode="edit" |
| Set weight / reps / duration(hold) / RPE | `api.entries.updateLiftingEntry` | exists; add summary recompute | Tap the set row → `EditSetSheet` (vaul Drawer with SetStepper + RpeSelector) |
| Set warmup flag | `api.entries.updateLiftingEntry` (full lifting object resent with `isWarmup` flipped) | exists | Checkbox row "Warmup set" added inside `EditSetSheet` |
| Delete a set | `api.entries.deleteEntry` | exists; add summary recompute | "Delete Set" button already inside `EditSetSheet` |
| Cardio duration / intensity / vest weight | `api.entries.updateCardioEntry` | **new** | Tap the cardio row → new `EditCardioSheet` (Drawer, modeled on EditSetSheet) |
| Delete a cardio entry | `api.entries.deleteEntry` | exists | "Delete Entry" button inside `EditCardioSheet` |
| Exercise note (per-exercise, workout-doc level) | `api.workouts.updateExerciseNote` | exists (no status guard) | MessageSquare icon button in each exercise card header → `NoteSheet`; the existing note callout is also tappable. Empty save clears (backend already deletes the array item) |
| Delete workout | `api.workouts.deleteWorkout` | exists, already wired | Unchanged: destructive button → confirm Dialog |

**Follow-up, NOT in this slice:** adding sets/exercises to a completed workout. `addLiftingEntry`/`addCardioEntry`/`addMobilityEntry` all hard-reject `status !== "in_progress"` (`convex/entries.ts:100-103, 179-182, 280-282`), so this needs new mutations or guard relaxation plus add-flow UI — not cheap. Ship editing first.

---

## 2. Backend work (Convex)

### 2a. Shared summary recompute helper — new file `convex/workoutSummary.ts`

Editing/deleting entries currently leaves `workout.summary` stale (it feeds history cards and dashboard stats). `buildWorkoutSummary` lives in `convex/workouts.ts:21-77` and is only called by `completeWorkout` and `updateWorkoutTimes`. `entries.ts` cannot import from `workouts.ts` without tangling query/mutation modules, so extract:

- Move `buildWorkoutSummary` (and the small `getWorkoutEntries` fetch, `workouts.ts:11-19`) verbatim into `convex/workoutSummary.ts` (plain helper module, no Convex functions). `workouts.ts` imports from it; behavior unchanged.
- Add and export:

```ts
export async function recomputeWorkoutSummary(
  ctx: MutationCtx,
  workoutId: Id<"workouts">
): Promise<void> {
  const workout = await ctx.db.get(workoutId);
  if (!workout || workout.status !== "completed" || workout.completedAt === undefined) {
    return; // in_progress/cancelled workouts have no computed summary to keep fresh
  }
  const entries = await ctx.db
    .query("entries")
    .withIndex("by_workout", (q) => q.eq("workoutId", workoutId))
    .collect();
  await ctx.db.patch(workoutId, {
    summary: buildWorkoutSummary(entries, workout.startedAt, workout.completedAt),
  });
}
```

The `status !== "completed"` early return keeps the active-workout flow (which also calls `updateLiftingEntry`/`deleteEntry`) exactly as it behaves today.

### 2b. Changed mutations — `convex/entries.ts`

Call `await recomputeWorkoutSummary(ctx, entry.workoutId)` as the last step (after the patch/delete) in:

- `updateLiftingEntry` (`entries.ts:221-260`) — no other changes; existing validation (duration>0, duration/reps mutually exclusive, reps>0) stays.
- `deleteEntry` (`entries.ts:339-368`).
- `updateMobilityEntry` (`entries.ts:311-337`) — one line, keeps `hasMobility` honest after edits; include for consistency.

No new status guards anywhere — matches the existing convention that entry update/delete mutations are ownership-gated only.

### 2c. New mutation — `entries.updateCardioEntry`

Mirror `updateLiftingEntry` exactly:

```ts
export const updateCardioEntry = mutation({
  args: {
    entryId: v.id("entries"),
    cardio: cardioDataValidator, // existing validator, entries.ts:34-64
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.userId !== user._id) throw new Error("Not authorized");
    if (entry.kind !== "cardio") throw new Error("Entry is not a cardio entry");
    if (args.cardio.durationSeconds <= 0) throw new Error("Duration must be greater than 0");
    await ctx.db.patch(args.entryId, {
      cardio: args.cardio,          // whole-object replace, same semantics as lifting
      notes: args.notes ?? entry.notes,
    });
    await recomputeWorkoutSummary(ctx, entry.workoutId);
  },
});
```

### 2d. New mutation — `workouts.updateWorkoutNotes`

```ts
export const updateWorkoutNotes = mutation({
  args: { workoutId: v.id("workouts"), notes: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== user._id) throw new Error("Not authorized");
    const trimmed = args.notes.trim();
    await ctx.db.patch(args.workoutId, { notes: trimmed || undefined });
  },
});
```

No status guard, matching `updateWorkoutTitle`/`updateExerciseNote`. Empty string clears notes (patch to `undefined`), same clearing semantics as `updateExerciseNote`.

That is the entire backend delta: 1 new file, 2 new mutations, 3 one-line recompute additions, 1 import move.

---

## 3. Frontend work

### 3a. `src/lib/workout-set-edit.ts` — small additions

- Add `isWarmup?: boolean` to `EditableLiftingSet` and thread `data.isWarmup` through `buildRepLiftingUpdate` (it already resends `setNumber/unit/isBodyweight`; add `isWarmup: data.isWarmup`).
- Add `buildTimedLiftingUpdate(editingSet, data)` returning `{ setNumber, durationSeconds: data.durationSeconds, unit: editingSet.unit, rpe: data.rpe ?? undefined, isWarmup: data.isWarmup }` — extracts the inline branch at `workout/active/page.tsx:808-814` so both pages share the full save contract.
- Refactor `workout/active/page.tsx` `handleUpdateSet` to use `buildTimedLiftingUpdate` (mechanical, keeps behavior).

### 3b. `src/components/workout/edit-set-sheet.tsx` — small prop additions

- `EditableSet`: add `isWarmup?: boolean`.
- `onSave` data type: add `isWarmup?: boolean`.
- In `EditSetContent`: local `const [isWarmup, setIsWarmup] = useState(set.isWarmup ?? false)`; render a `Checkbox` + `Label` row ("Warmup set") between the steppers and the RpeSelector (Checkbox exists in `src/components/ui/checkbox.tsx`; there is no Switch — do not add one). Include `isWarmup` in both save payload branches.
- Active page callers keep working: `isWarmup` flows through `buildRepLiftingUpdate`/`buildTimedLiftingUpdate` unchanged when untouched.

### 3c. `src/components/workout/note-sheet.tsx` — one optional prop

- Add `title?: string`; header renders `title ?? \`Note for ${exerciseName}\`` (match current copy). Lets the same sheet serve workout-level notes ("Workout notes") without a parallel component. No other changes.

### 3d. New: `src/components/workout/edit-cardio-sheet.tsx`

Modeled 1:1 on `edit-set-sheet.tsx` (vaul Drawer, keyed content, DrawerFooter Cancel/Save 50/50):

```ts
export interface EditableCardio {
  entryId: string;
  exerciseName: string;
  cardio: Doc<"entries">["cardio"] & {};   // the full stored cardio object
  displayVestUnit: "lb" | "kg";            // user's preferred unit
}
interface EditCardioSheetProps {
  entry: EditableCardio | null;
  onOpenChange: (open: boolean) => void;
  onSave: (entryId: string, data: { durationSeconds: number; intensity?: number; vestWeight?: number }) => void;
  onDelete: (entryId: string) => void;
}
```

Body (reusing `SetStepper` for everything):
- Duration: SetStepper in whole minutes (value `Math.round(durationSeconds / 60)`, step 1, min 1, max 600, unit "min"; save as `minutes * 60`). Matches the coarse-grained cardio UX; seconds precision is not worth a min:sec widget here.
- Intensity: SetStepper step 1, min 0, max 20, label "Intensity" — only rendered when the stored entry has `intensity !== undefined`.
- Vest weight: SetStepper step 2.5 kg / 5 lb in the user's display unit — only rendered when stored entry has `vestWeight !== undefined`. Use `displayWeight`/`editedWeightForStorage` from `src/lib/units.ts` exactly like lifting weights (preserve stored `vestWeightUnit`, avoid round-trip drift).
- Destructive "Delete Entry" ghost button in body, same styling as EditSetSheet's Delete Set.

The parent builds the save payload by spreading the ORIGINAL stored cardio object and overwriting only the edited fields (`{ ...entry.cardio, durationSeconds, intensity, vestWeight }`), so distance, HR, calories, intervals, sets, etc. survive the whole-object replace untouched.

### 3e. New: `src/components/workout/workout-exercise-card.tsx`

Extracts the grouped-exercise Card currently inlined at `workout/[id]/page.tsx:377-474`, with edit affordances added. One file containing three components (only the card is exported):

- `WorkoutExerciseCard` props: `{ exercise: { name; entries: Doc<"entries">[] }; note?: string; preferredUnit: WeightUnit; editable: boolean; onEditSet(entry): void; onEditCardio(entry): void; onEditNote(): void }`.
  - Header row: exercise name + ghost `size="icon"` MessageSquare button (right-aligned) calling `onEditNote` when `editable`.
  - Renders `LiftingSetRow` / `CardioEntryRow` per entry; mobility entries render as today (read-only rows).
  - Note callout at bottom (existing markup); wrapped in a button calling `onEditNote` when `editable`.
- `LiftingSetRow` (internal): the exact existing row markup (`flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm`, Warmup/RPE badges, mono values via `displayWeight`), but rendered as a full-width `<button>` with `transition-colors hover:bg-muted active:bg-muted` + a trailing `ChevronRight h-4 w-4 text-muted-foreground` when `editable`; plain `<div>` when not.
- `CardioEntryRow` (internal): same treatment for the cardio row markup (mode, duration, Level badge, vest weight).

`editable` is `workout.status !== "in_progress"` (don't offer detail-page editing while the active session owns the workout; cancelled workouts remain editable/deletable, matching the mutations' actual guards).

### 3f. `src/app/workout/[id]/page.tsx` — the page itself

(File uses spaces for indentation — keep it.)

**Types:** delete the hand-rolled `LiftingEntry`/`CardioEntry`/`Entry` types; use `Doc<"entries">` from `convex/_generated/dataModel`. Required anyway so the full cardio object can be resent on save. `groupEntriesByExercise` stays, retyped.

**New state:** `editingSet: EditableSet | null`, `editingCardio: EditableCardio | null`, `noteExercise: string | null`, `showNotesSheet: boolean` (workout notes), `isEditingTitle: boolean` + `titleDraft: string`.

**New mutations wired:** `api.workouts.updateWorkoutTitle`, `api.workouts.updateWorkoutNotes`, `api.workouts.updateExerciseNote`, `api.entries.updateLiftingEntry`, `api.entries.updateCardioEntry`, `api.entries.deleteEntry`.

**Header:** when `isEditingTitle`, swap the `<h1>` for the routines-edit inline input idiom (`h-8 px-2 rounded border bg-background font-medium outline-none focus:ring-2 focus:ring-primary`, autoFocus, Enter commits, Escape cancels, Check icon button commits); otherwise `<h1>` + ghost `size="icon"` Pencil button (`h-4 w-4`), hidden while `status === "in_progress"`. Commit calls `updateWorkoutTitle({ workoutId, title: titleDraft.trim() })` (skip mutation if unchanged; disallow committing an empty title — Escape to abandon instead, since the mutation can't clear to undefined).

**Summary card:** unchanged stats grid. Notes section becomes: when `workout.notes`, the notes block is a full-width button (hover:bg-muted/50) opening the workout NoteSheet; when empty and editable, a ghost `size="sm"` "Add notes" button with MessageSquare icon under the stats grid.

**Exercise list:** replace the inline Card markup with `<WorkoutExerciseCard>` per group, passing handlers:

- `onEditSet(entry)`: build `EditableSet` inline from the stored entry (the entry IS the stored record — no group-map lookup needed):
  ```ts
  {
    entryId: entry._id, exerciseName, setNumber: entry.lifting.setNumber,
    reps: entry.lifting.reps ?? 0,
    weight: displayWeight(entry.lifting.weight ?? 0, entry.lifting.unit, preferredUnit),
    unit: preferredUnit,
    storedWeight: entry.lifting.weight, storedUnit: entry.lifting.unit,
    isBodyweight: entry.lifting.isBodyweight, isWarmup: entry.lifting.isWarmup,
    rpe: entry.lifting.rpe ?? null,
    durationSeconds: entry.lifting.durationSeconds, // presence switches EditSetSheet to hold mode
  }
  ```
- `handleUpdateSet(entryId, data)`: `updateLiftingEntry({ entryId, lifting: data.durationSeconds !== undefined ? buildTimedLiftingUpdate(editingSet, data) : buildRepLiftingUpdate(editingSet, data) })`; posthog `set_edited`; `toast.success("Set updated")`; catch → `toast.error("Failed to update set")` + `console.error`.
- `handleDeleteSet(entryId)`: `deleteEntry({ entryId })`; posthog `set_deleted`; toast "Set deleted".
- `onEditCardio(entry)`: set `editingCardio` with the full stored `entry.cardio`.
- `handleUpdateCardio(entryId, data)`: spread-merge onto stored cardio (vest weight via `editedWeightForStorage`, preserving stored `vestWeightUnit`), call `updateCardioEntry({ entryId, cardio: merged })`; posthog `cardio_edited`; toast "Cardio updated".
- `handleDeleteCardio(entryId)`: `deleteEntry`; posthog `cardio_deleted`; toast "Cardio entry deleted".
- `onEditNote()` per exercise: set `noteExercise`; NoteSheet save calls `updateExerciseNote({ workoutId, exerciseName, note })`; posthog `exercise_note_edited`; toast "Note saved".

**Drawers/dialogs at page bottom** (all follow the existing `open={!!x}` + keyed-content mount pattern):
- `<EditSetSheet set={editingSet} ... />`
- `<EditCardioSheet entry={editingCardio} ... />`
- `<NoteSheet>` ×2 usages: one for `noteExercise` (per-exercise), one with `title="Workout notes"` bound to `workout.notes` → `updateWorkoutNotes`; posthog `workout_notes_edited`; toast "Notes saved".
- Existing `WorkoutTimeEditorDialog`, delete-confirm Dialog, ExportWorkoutDialog unchanged.

No optimistic-update plumbing needed: `getWorkoutWithEntries` is a reactive Convex query, so rows and the summary card update automatically after each mutation (including the recomputed volume/duration stats — a nice visible payoff of §2a).

**Reuse summary:**
- As-is: `SetStepper`, `RpeSelector`, `WorkoutTimeEditorDialog`, `units.ts` helpers, Drawer/Dialog/Checkbox/Badge/Card primitives.
- Small additions: `EditSetSheet` (+warmup checkbox, +isWarmup in types), `NoteSheet` (+`title` prop), `workout-set-edit.ts` (+isWarmup, +`buildTimedLiftingUpdate`).
- New: `EditCardioSheet`, `WorkoutExerciseCard`.
- Deliberately NOT used: `EditExerciseSheet` (routine-template editor with its own Convex side effects), `CardioExerciseCard` (one-shot logging card, no edit path).

---

## 4. Mobile-first layout

**Phone (default):** Same shell as today — sticky h-14 header, `main.flex-1.p-4`, full-width cards. Every set/cardio row is a full-row tap target (~40px, `px-3 py-2` + chevron) opening a bottom vaul Drawer (`rounded-t-2xl`, swipe-to-dismiss, Cancel/Save 50/50 in DrawerFooter) — identical interaction to editing a set mid-workout, so zero new muscle memory. Title editing is inline in the header. Notes open the same bottom-sheet textarea used in the active flow. Time editing and delete-confirm stay as centered Dialogs (small forms / destructive confirms per repo convention). Haptics: `vibrate("light")` on opening an edit sheet, `vibrate("success")` after a successful save, `vibrate("warning")` before delete — matching active-flow usage of `useHaptic`.

**Desktop adaptation:** wrap the `<main>` content in `mx-auto w-full max-w-lg` (the BottomNav/onboarding container idiom — the only max-w convention this app has) so cards don't stretch across a monitor; the header inner div gets the same `mx-auto w-full max-w-lg` so back button/title/actions align with content. The codebase does NOT differentiate drawer-on-mobile vs dialog-on-desktop anywhere, so we don't invent it: vaul Drawers render bottom-anchored on desktop too, which is consistent app-wide. Hover states (`hover:bg-muted`) on rows and the pencil/note icon buttons provide desktop affordance discovery.

---

## 5. Analytics (posthog)

All captured after the awaited mutation succeeds, inside the try block, snake_case object_verb-past-tense — matching `workout_times_edited`/`workout_deleted` in this file:

| Event | Properties |
|---|---|
| `workout_title_edited` | `workout_id` |
| `workout_notes_edited` | `workout_id`, `cleared` (boolean) |
| `set_edited` | `workout_id`, `exercise_name`, `set_number`, `reps`, `weight`, `unit`, `duration_seconds`, `rpe`, `is_warmup` |
| `set_deleted` | `workout_id`, `exercise_name`, `set_number` |
| `cardio_edited` | `workout_id`, `exercise_name`, `duration_seconds`, `intensity`, `vest_weight` |
| `cardio_deleted` | `workout_id`, `exercise_name` |
| `exercise_note_edited` | `workout_id`, `exercise_name`, `cleared` (boolean) |

Existing `workout_times_edited` and `workout_deleted` unchanged.

---

## 6. Non-goals

- Adding sets or exercises to a completed workout (backend hard-blocks; follow-up work).
- Renaming/swapping an exercise on logged entries (no mutation exists; would need exerciseNotes sync).
- Reordering exercises or renumbering sets (no order field; deletes may leave setNumber gaps — accepted, display still sorts by createdAt).
- Editing entry-level `notes` (the detail page uses workout-level `exerciseNotes`; the `?? entry.notes` clearing quirk in entry mutations is untouched).
- Editing cardio distance/HR/calories/intervals/interval sets (preserved verbatim on save; edit UI is duration/intensity/vest only per product direction).
- Mobility entry editing UI (rows stay read-only; `updateMobilityEntry` gets the recompute call only).
- Cleaning up orphaned `exerciseNotes` when an exercise's last entry is deleted (invisible in UI; skip).
- Changing the workout's calendar date (WorkoutTimeEditorDialog pins dates; unchanged).
- Drawer-vs-dialog responsive switching, unit switching per set, editing in_progress workouts from the detail page.

---

## 7. Verification plan

Commands (from repo root, bun per project convention):

```
bunx convex codegen        # regenerate api types for the 2 new mutations
bunx tsc --noEmit
bun run lint
bun run build              # only if lint/tsc pass and time permits
```

Manual checks (dev: `bun run dev` + `bunx convex dev`):

1. Complete a workout with rep sets, a timed hold, a warmup set, and a cardio entry with vest weight; open its detail page.
2. Title: pencil → rename → Enter → header updates, toast, `workout_title_edited` in posthog debug.
3. Tap a rep set → change weight/reps/RPE → Save → row updates AND summary Volume stat changes (proves recompute); check history card volume updated too.
4. Toggle warmup on a set → Warmup badge appears; verify weight×reps unchanged in DB.
5. Tap a timed set → duration stepper (not weight/reps) → save → row shows new hold time.
6. Delete a set → row gone, Volume/summary drop; delete a whole exercise's sets → exerciseCount stat drops.
7. Tap cardio row → edit duration + vest → row and Cardio summary stat update; confirm distance/HR fields survived (inspect entry in Convex dashboard).
8. Exercise note: add via icon, edit via callout tap, clear via NoteSheet "Clear" → callout disappears.
9. Workout notes: add, edit, clear → summary card notes section updates; DB `notes` becomes undefined on clear.
10. kg-preference user editing a lb-stored set: save without touching weight → stored weight unchanged (no rounding drift); change weight → stored in original lb unit.
11. In_progress workout detail page: no pencils/tap affordances rendered.
12. Cancelled workout: rows editable, delete workout still works.
13. Mobile viewport (390px) and desktop (1280px): rows full-width tap targets on mobile; content centered `max-w-lg` on desktop; drawers open bottom-anchored on both.
14. Unauthorized check: mutations already ownership-gated; verified by code inspection of `getCurrentUser` + `userId` comparisons (no new auth surface added).
