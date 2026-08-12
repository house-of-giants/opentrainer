"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Clock,
  Download,
  Dumbbell,
  MessageSquare,
  Pencil,
  Route,
  Timer,
  Trash2,
  Weight,
} from "lucide-react";
import Link from "next/link";
import { ExportWorkoutDialog } from "@/components/workout/export-workout-dialog";
import { WorkoutTimeEditorDialog } from "@/components/workout/workout-time-editor-dialog";
import {
  EditSetSheet,
  type EditableSet,
} from "@/components/workout/edit-set-sheet";
import {
  EditCardioSheet,
  type EditableCardio,
} from "@/components/workout/edit-cardio-sheet";
import { NoteSheet } from "@/components/workout/note-sheet";
import { WorkoutExerciseCard } from "@/components/workout/workout-exercise-card";
import { useHaptic } from "@/hooks/use-haptic";
import { toast } from "sonner";
import posthog from "posthog-js";
import {
  calculateVolumeInUnit,
  displayWeight,
  editedWeightForStorage,
  type WeightUnit,
} from "@/lib/units";
import {
  buildRepLiftingUpdate,
  buildTimedLiftingUpdate,
} from "@/lib/workout-set-edit";

type GroupedExercise = {
  name: string;
  entries: Doc<"entries">[];
};

export default function WorkoutDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { vibrate } = useHaptic();
  const workoutId = params.id as Id<"workouts">;
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdatingTimes, setIsUpdatingTimes] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSet, setEditingSet] = useState<EditableSet | null>(null);
  const [editingCardio, setEditingCardio] = useState<EditableCardio | null>(null);
  const [noteExercise, setNoteExercise] = useState<string | null>(null);
  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const workout = useQuery(api.workouts.getWorkoutWithEntries, { workoutId });
  const user = useQuery(api.users.getCurrentUser);
  const updateWorkoutTimes = useMutation(api.workouts.updateWorkoutTimes);
  const deleteWorkout = useMutation(api.workouts.deleteWorkout);
  const updateWorkoutTitle = useMutation(api.workouts.updateWorkoutTitle);
  const updateWorkoutNotes = useMutation(api.workouts.updateWorkoutNotes);
  const updateExerciseNote = useMutation(api.workouts.updateExerciseNote);
  const updateLiftingEntry = useMutation(api.entries.updateLiftingEntry);
  const updateCardioEntry = useMutation(api.entries.updateCardioEntry);
  const deleteEntry = useMutation(api.entries.deleteEntry);
  const isPro = user?.tier === "pro";
  const preferredUnit: WeightUnit = user?.preferredUnits ?? "lb";

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatCardioSummaryDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const formatDistance = (km: number) => {
    if (km >= 1) {
      return `${km.toFixed(1)} km`;
    }
    return `${Math.round(km * 1000)} m`;
  };

  const groupEntriesByExercise = (
    entries: Doc<"entries">[]
  ): GroupedExercise[] => {
    const groups: Record<string, Doc<"entries">[]> = {};
    const order: string[] = [];

    for (const entry of entries) {
      if (!groups[entry.exerciseName]) {
        groups[entry.exerciseName] = [];
        order.push(entry.exerciseName);
      }
      groups[entry.exerciseName].push(entry);
    }

    return order.map((name) => ({
      name,
      entries: groups[name].sort((a, b) => a.createdAt - b.createdAt),
    }));
  };

  if (workout === undefined || user === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-lg items-center gap-4 px-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <main className="flex-1 p-4">
          <div className="mx-auto w-full max-w-lg">
            <Skeleton className="mb-4 h-24 w-full" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (workout === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-xl font-semibold">Workout not found</h1>
        <p className="mb-4 text-muted-foreground">
          This workout doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Button onClick={() => router.push("/history")}>
          Back to History
        </Button>
      </div>
    );
  }

  const entries = workout.entries as Doc<"entries">[];
  const groupedExercises = groupEntriesByExercise(entries);
  const editable = workout.status !== "in_progress";
  const displayedVolume = calculateVolumeInUnit(
    entries.flatMap((entry) =>
      entry.kind === "lifting" &&
      entry.lifting &&
      entry.lifting.durationSeconds === undefined
        ? [entry.lifting]
        : []
    ),
    preferredUnit
  );
  const editableCompletedAt =
    workout.completedAt ??
    workout.startedAt + Math.max(workout.summary?.totalDurationMinutes ?? 60, 1) * 60000;

  const handleUpdateTimes = async (startedAt: number, completedAt: number) => {
    setIsUpdatingTimes(true);
    try {
      await updateWorkoutTimes({
        workoutId,
        startedAt,
        completedAt,
      });
      posthog.capture("workout_times_edited", {
        workout_id: workoutId,
        from_started_at: workout.startedAt,
        to_started_at: startedAt,
        from_completed_at: workout.completedAt ?? editableCompletedAt,
        to_completed_at: completedAt,
      });
      toast.success("Workout date/time updated");
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsUpdatingTimes(false);
    }
  };

  const handleDeleteWorkout = async () => {
    setIsDeleting(true);
    try {
      await deleteWorkout({ workoutId });
      posthog.capture("workout_deleted", {
        workout_id: workoutId,
        status: workout.status,
        entry_count: workout.entries.length,
      });
      toast.success("Workout deleted");
      router.replace("/history");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete workout");
    } finally {
      setIsDeleting(false);
    }
  };

  const startEditingTitle = () => {
    setTitleDraft(workout.title ?? "Workout");
    setIsEditingTitle(true);
  };

  const commitTitle = async () => {
    setIsEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === (workout.title ?? "Workout")) return;
    try {
      await updateWorkoutTitle({ workoutId, title: trimmed });
      posthog.capture("workout_title_edited", { workout_id: workoutId });
      vibrate("success");
      toast.success("Title updated");
    } catch (error) {
      toast.error("Failed to update title");
      console.error(error);
    }
  };

  const handleSaveWorkoutNotes = async (note: string) => {
    try {
      await updateWorkoutNotes({ workoutId, notes: note });
      posthog.capture("workout_notes_edited", {
        workout_id: workoutId,
        cleared: note.trim() === "",
      });
      vibrate("success");
      toast.success("Notes saved");
    } catch (error) {
      toast.error("Failed to save notes");
      console.error(error);
    }
  };

  const handleSaveExerciseNote = async (note: string) => {
    if (!noteExercise) return;
    try {
      await updateExerciseNote({
        workoutId,
        exerciseName: noteExercise,
        note,
      });
      posthog.capture("exercise_note_edited", {
        workout_id: workoutId,
        exercise_name: noteExercise,
        cleared: note.trim() === "",
      });
      vibrate("success");
      toast.success("Note saved");
    } catch (error) {
      toast.error("Failed to save note");
      console.error(error);
    }
  };

  const handleEditSet = (entry: Doc<"entries">) => {
    if (!entry.lifting) return;
    vibrate("light");
    setEditingSet({
      entryId: entry._id,
      exerciseName: entry.exerciseName,
      setNumber: entry.lifting.setNumber,
      reps: entry.lifting.reps ?? 0,
      weight: displayWeight(
        entry.lifting.weight ?? 0,
        entry.lifting.unit,
        preferredUnit
      ),
      unit: preferredUnit,
      storedWeight: entry.lifting.weight,
      storedUnit: entry.lifting.unit,
      isBodyweight: entry.lifting.isBodyweight,
      isWarmup: entry.lifting.isWarmup,
      rpe: entry.lifting.rpe ?? null,
      durationSeconds: entry.lifting.durationSeconds,
    });
  };

  const handleUpdateSet = async (
    entryId: string,
    data: {
      reps?: number;
      weight?: number;
      durationSeconds?: number;
      rpe?: number | null;
      isWarmup?: boolean;
    }
  ) => {
    if (!editingSet) return;
    try {
      await updateLiftingEntry({
        entryId: entryId as Id<"entries">,
        lifting:
          data.durationSeconds !== undefined
            ? buildTimedLiftingUpdate(editingSet, data)
            : buildRepLiftingUpdate(editingSet, data),
      });
      posthog.capture("set_edited", {
        workout_id: workoutId,
        exercise_name: editingSet.exerciseName,
        set_number: editingSet.setNumber,
        reps: data.reps,
        weight: data.weight,
        unit: editingSet.unit,
        duration_seconds: data.durationSeconds,
        rpe: data.rpe,
        is_warmup: data.isWarmup,
      });
      vibrate("success");
      toast.success("Set updated");
    } catch (error) {
      toast.error("Failed to update set");
      console.error(error);
    }
  };

  const handleDeleteSet = async (entryId: string) => {
    vibrate("warning");
    try {
      await deleteEntry({ entryId: entryId as Id<"entries"> });
      posthog.capture("set_deleted", {
        workout_id: workoutId,
        exercise_name: editingSet?.exerciseName,
        set_number: editingSet?.setNumber,
      });
      toast.success("Set deleted");
    } catch (error) {
      toast.error("Failed to delete set");
      console.error(error);
    }
  };

  const handleEditCardio = (entry: Doc<"entries">) => {
    if (!entry.cardio) return;
    vibrate("light");
    setEditingCardio({
      entryId: entry._id,
      exerciseName: entry.exerciseName,
      cardio: entry.cardio,
      displayVestUnit: preferredUnit,
    });
  };

  const handleUpdateCardio = async (
    entryId: string,
    data: { durationSeconds: number; intensity?: number; vestWeight?: number }
  ) => {
    if (!editingCardio) return;
    const stored = editingCardio.cardio;
    const storedVestUnit = stored.vestWeightUnit ?? "lb";
    const vestWeight =
      data.vestWeight === undefined || stored.vestWeight === undefined
        ? stored.vestWeight
        : editedWeightForStorage({
            displayedWeight: data.vestWeight,
            displayUnit: editingCardio.displayVestUnit,
            storedUnit: storedVestUnit,
            originalDisplayedWeight: displayWeight(
              stored.vestWeight,
              storedVestUnit,
              editingCardio.displayVestUnit
            ),
            originalStoredWeight: stored.vestWeight,
          });
    const intensity = data.intensity ?? stored.intensity;
    try {
      await updateCardioEntry({
        entryId: entryId as Id<"entries">,
        cardio: {
          ...stored,
          durationSeconds: data.durationSeconds,
          intensity,
          vestWeight,
        },
      });
      posthog.capture("cardio_edited", {
        workout_id: workoutId,
        exercise_name: editingCardio.exerciseName,
        duration_seconds: data.durationSeconds,
        intensity,
        vest_weight: vestWeight,
      });
      vibrate("success");
      toast.success("Cardio updated");
    } catch (error) {
      toast.error("Failed to update cardio");
      console.error(error);
    }
  };

  const handleDeleteCardio = async (entryId: string) => {
    vibrate("warning");
    try {
      await deleteEntry({ entryId: entryId as Id<"entries"> });
      posthog.capture("cardio_deleted", {
        workout_id: workoutId,
        exercise_name: editingCardio?.exerciseName,
      });
      toast.success("Cardio entry deleted");
    } catch (error) {
      toast.error("Failed to delete entry");
      console.error(error);
    }
  };

  const openWorkoutNotes = () => {
    vibrate("light");
    setShowNotesSheet(true);
  };

  const openExerciseNote = (exerciseName: string) => {
    vibrate("light");
    setNoteExercise(exerciseName);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center gap-4 px-4">
          <Link href="/history">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  className="h-8 min-w-0 flex-1 rounded border bg-background px-2 font-medium outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Workout title"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={commitTitle}
                  aria-label="Save workout title"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate font-semibold text-lg">
                  {workout.title ?? "Workout"}
                </h1>
                {editable && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={startEditingTitle}
                    aria-label="Edit workout title"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
          </div>
          {isPro && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          {workout.status === "cancelled" && (
            <Badge variant="secondary">Cancelled</Badge>
          )}
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mx-auto w-full max-w-lg">
          <Card className="mb-6 p-4">
            {editable && (
              <div className="mb-4 flex justify-end gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete workout
                </Button>
                {workout.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTimeEditor(true)}
                  >
                    <CalendarClock data-icon="inline-start" />
                    Edit date/time
                  </Button>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium font-mono">{formatDate(workout.startedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Time</p>
                <p className="font-medium font-mono tabular-nums">
                  {formatTime(workout.startedAt)}
                  {workout.completedAt && ` - ${formatTime(workout.completedAt)}`}
                </p>
              </div>
              {!!workout.summary?.totalDurationMinutes && (
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium font-mono tabular-nums flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(workout.summary.totalDurationMinutes)}
                  </p>
                </div>
              )}
              {displayedVolume > 0 && (
                <div>
                  <p className="text-muted-foreground">Volume</p>
                  <p className="font-medium font-mono tabular-nums flex items-center gap-1">
                    <Weight className="h-4 w-4" />
                    {Math.round(displayedVolume).toLocaleString()} {preferredUnit}
                  </p>
                </div>
              )}
              {(() => {
                const cardioDuration = workout.summary?.totalCardioDurationSeconds;
                return cardioDuration && cardioDuration > 0 ? (
                  <div>
                    <p className="text-muted-foreground">Cardio</p>
                    <p className="font-medium font-mono tabular-nums flex items-center gap-1">
                      <Timer className="h-4 w-4" />
                      {formatCardioSummaryDuration(cardioDuration)}
                    </p>
                  </div>
                ) : null;
              })()}
              {(() => {
                const distance = workout.summary?.totalDistanceKm;
                return distance && distance > 0 ? (
                  <div>
                    <p className="text-muted-foreground">Distance</p>
                    <p className="font-medium font-mono tabular-nums flex items-center gap-1">
                      <Route className="h-4 w-4" />
                      {formatDistance(distance)}
                    </p>
                  </div>
                ) : null;
              })()}
            </div>
            {workout.notes ? (
              editable ? (
                <button
                  type="button"
                  onClick={openWorkoutNotes}
                  className="mt-4 w-full rounded-md border-t pt-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{workout.notes}</p>
                </button>
              ) : (
                <div className="mt-4 border-t pt-4">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{workout.notes}</p>
                </div>
              )
            ) : (
              editable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 self-start text-muted-foreground"
                  onClick={openWorkoutNotes}
                >
                  <MessageSquare data-icon="inline-start" />
                  Add notes
                </Button>
              )
            )}
          </Card>

          {groupedExercises.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <p>No exercises logged in this workout.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedExercises.map((exercise) => (
                <WorkoutExerciseCard
                  key={exercise.name}
                  exercise={exercise}
                  note={
                    workout.exerciseNotes?.find(
                      (n) => n.exerciseName === exercise.name
                    )?.note
                  }
                  preferredUnit={preferredUnit}
                  editable={editable}
                  onEditSet={handleEditSet}
                  onEditCardio={handleEditCardio}
                  onEditNote={() => openExerciseNote(exercise.name)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ExportWorkoutDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        workoutId={workoutId}
      />

      {workout.status === "completed" && showTimeEditor && (
        <WorkoutTimeEditorDialog
          open={showTimeEditor}
          onOpenChange={setShowTimeEditor}
          initialStartedAt={workout.startedAt}
          initialCompletedAt={editableCompletedAt}
          mode="edit"
          onSubmit={handleUpdateTimes}
          isSubmitting={isUpdatingTimes}
        />
      )}

      <EditSetSheet
        set={editingSet}
        onOpenChange={(open) => {
          if (!open) setEditingSet(null);
        }}
        onSave={handleUpdateSet}
        onDelete={handleDeleteSet}
      />

      <EditCardioSheet
        entry={editingCardio}
        onOpenChange={(open) => {
          if (!open) setEditingCardio(null);
        }}
        onSave={handleUpdateCardio}
        onDelete={handleDeleteCardio}
      />

      <NoteSheet
        open={noteExercise !== null}
        onOpenChange={(open) => {
          if (!open) setNoteExercise(null);
        }}
        exerciseName={noteExercise ?? ""}
        note={
          workout.exerciseNotes?.find((n) => n.exerciseName === noteExercise)
            ?.note ?? ""
        }
        onSave={handleSaveExerciseNote}
      />

      <NoteSheet
        open={showNotesSheet}
        onOpenChange={setShowNotesSheet}
        title="Workout notes"
        exerciseName=""
        note={workout.notes ?? ""}
        onSave={handleSaveWorkoutNotes}
      />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workout?</DialogTitle>
            <DialogDescription>
              This will permanently delete this workout and all logged sets, notes, and related workout analysis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWorkout}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete workout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
