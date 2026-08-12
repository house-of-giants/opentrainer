import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Clock,
  Download,
  Dumbbell,
  MessageSquare,
  Pencil,
  Route as RouteIcon,
  Timer,
  Trash2,
  Weight,
} from "lucide-react-native";
import { api } from "@opentrainer/backend";
import type { Doc, Id } from "@opentrainer/backend";
import {
  calculateVolumeInUnit,
  displayWeight,
  editedWeightForStorage,
  type WeightUnit,
} from "@opentrainer/lib/units";
import {
  buildRepLiftingUpdate,
  buildTimedLiftingUpdate,
} from "@opentrainer/lib/workout-set-edit";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  EditCardioSheet,
  type EditableCardio,
} from "@/components/workout/edit-cardio-sheet";
import {
  EditSetSheet,
  type EditableSet,
} from "@/components/workout/edit-set-sheet";
import { ExportWorkoutDialog } from "@/components/workout/export-workout-dialog";
import { NoteSheet } from "@/components/workout/note-sheet";
import { WorkoutExerciseCard } from "@/components/workout/workout-exercise-card";
import { WorkoutTimeEditorDialog } from "@/components/workout/workout-time-editor-dialog";
import { useHaptic } from "@/hooks/use-haptic";
import { analytics } from "@/lib/analytics";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/workout/[id]/page.tsx.
type GroupedExercise = {
  name: string;
  entries: Doc<"entries">[];
};

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <View className="w-1/2 pb-4 pr-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <View className="flex-row items-center gap-1">
        {icon}
        <Text className="font-mono text-sm font-medium text-foreground">
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function WorkoutDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { vibrate } = useHaptic();
  const workoutId = params.id as Id<"workouts">;
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdatingTimes, setIsUpdatingTimes] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSet, setEditingSet] = useState<EditableSet | null>(null);
  const [editingCardio, setEditingCardio] = useState<EditableCardio | null>(
    null,
  );
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
    entries: Doc<"entries">[],
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
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="h-14 flex-row items-center gap-4 border-b border-border px-4">
          <Skeleton className="h-8 w-8" testID="detail-skeleton" />
          <Skeleton className="h-6 w-48" />
        </View>
        <View className="p-4">
          <Skeleton className="mb-4 h-24 w-full" />
          <View className="gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (workout === null) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center p-4">
          <Dumbbell size={48} color={colors.mutedForeground} />
          <Text className="mb-2 mt-4 text-xl font-semibold text-foreground">
            Workout not found
          </Text>
          <Text className="mb-4 text-center text-muted-foreground">
            This workout doesn&apos;t exist or you don&apos;t have access.
          </Text>
          <Button onPress={() => router.replace("/(app)/(tabs)/history")}>
            Back to History
          </Button>
        </View>
      </SafeAreaView>
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
        : [],
    ),
    preferredUnit,
  );
  const editableCompletedAt =
    workout.completedAt ??
    workout.startedAt +
      Math.max(workout.summary?.totalDurationMinutes ?? 60, 1) * 60000;

  const handleUpdateTimes = async (startedAt: number, completedAt: number) => {
    setIsUpdatingTimes(true);
    try {
      await updateWorkoutTimes({
        workoutId,
        startedAt,
        completedAt,
      });
      analytics.capture("workout_times_edited", {
        workout_id: workoutId,
        from_started_at: workout.startedAt,
        to_started_at: startedAt,
        from_completed_at: workout.completedAt ?? completedAt,
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
      analytics.capture("workout_deleted", {
        workout_id: workoutId,
        status: workout.status,
        entry_count: workout.entries.length,
      });
      toast.success("Workout deleted");
      router.replace("/(app)/(tabs)/history");
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
      analytics.capture("workout_title_edited", { workout_id: workoutId });
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
      analytics.capture("workout_notes_edited", {
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
      analytics.capture("exercise_note_edited", {
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
        preferredUnit,
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
    },
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
      analytics.capture("set_edited", {
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
      analytics.capture("set_deleted", {
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
    data: { durationSeconds: number; intensity?: number; vestWeight?: number },
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
              editingCardio.displayVestUnit,
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
      analytics.capture("cardio_edited", {
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
      analytics.capture("cardio_deleted", {
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

  const cardioDuration = workout.summary?.totalCardioDurationSeconds;
  const distance = workout.summary?.totalDistanceKm;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="h-14 flex-row items-center gap-2 border-b border-border px-2">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </Button>
        <View className="min-w-0 flex-1">
          {isEditingTitle ? (
            <View className="flex-row items-center gap-2">
              <Input
                value={titleDraft}
                onChangeText={setTitleDraft}
                onSubmitEditing={commitTitle}
                returnKeyType="done"
                placeholder="Workout title"
                accessibilityLabel="Workout title"
                autoFocus
                className="h-9 flex-1 font-medium"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                className="shrink-0"
                onPress={commitTitle}
                accessibilityLabel="Save workout title"
              >
                <Check size={16} color={colors.foreground} />
              </Button>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Text
                numberOfLines={1}
                className="shrink text-lg font-semibold text-foreground"
              >
                {workout.title ?? "Workout"}
              </Text>
              {editable && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0"
                  onPress={startEditingTitle}
                  accessibilityLabel="Edit workout title"
                >
                  <Pencil size={16} color={colors.mutedForeground} />
                </Button>
              )}
            </View>
          )}
        </View>
        {isPro && (
          <Button
            variant="ghost"
            size="icon"
            onPress={() => setShowExportDialog(true)}
            accessibilityLabel="Export workout"
          >
            <Download size={20} color={colors.foreground} />
          </Button>
        )}
        {workout.status === "cancelled" && (
          <Badge variant="secondary">Cancelled</Badge>
        )}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-16">
        <Card className="mb-6 p-4">
          {editable && (
            <View className="mb-4 flex-row justify-end gap-2">
              <Button
                variant="destructive"
                size="sm"
                onPress={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={16} color="#ffffff" />
                <Text className="text-sm font-medium text-white">
                  Delete workout
                </Text>
              </Button>
              {workout.status === "completed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setShowTimeEditor(true)}
                >
                  <CalendarClock size={16} color={colors.foreground} />
                  <Text className="text-sm font-medium text-foreground">
                    Edit date/time
                  </Text>
                </Button>
              )}
            </View>
          )}
          <View className="flex-row flex-wrap">
            <SummaryStat label="Date" value={formatDate(workout.startedAt)} />
            <SummaryStat
              label="Time"
              value={`${formatTime(workout.startedAt)}${
                workout.completedAt ? ` - ${formatTime(workout.completedAt)}` : ""
              }`}
            />
            {!!workout.summary?.totalDurationMinutes && (
              <SummaryStat
                label="Duration"
                value={formatDuration(workout.summary.totalDurationMinutes) ?? ""}
                icon={<Clock size={16} color={colors.foreground} />}
              />
            )}
            {displayedVolume > 0 && (
              <SummaryStat
                label="Volume"
                value={`${Math.round(displayedVolume).toLocaleString()} ${preferredUnit}`}
                icon={<Weight size={16} color={colors.foreground} />}
              />
            )}
            {!!cardioDuration && cardioDuration > 0 && (
              <SummaryStat
                label="Cardio"
                value={formatCardioSummaryDuration(cardioDuration)}
                icon={<Timer size={16} color={colors.foreground} />}
              />
            )}
            {!!distance && distance > 0 && (
              <SummaryStat
                label="Distance"
                value={formatDistance(distance)}
                icon={<RouteIcon size={16} color={colors.foreground} />}
              />
            )}
          </View>
          {workout.notes ? (
            editable ? (
              <Pressable
                onPress={openWorkoutNotes}
                accessibilityRole="button"
                accessibilityLabel="Edit workout notes"
                className="mt-4 w-full rounded-md border-t border-border pt-4 active:bg-muted"
              >
                <Text className="text-sm text-muted-foreground">Notes</Text>
                <Text className="text-sm text-foreground">{workout.notes}</Text>
              </Pressable>
            ) : (
              <View className="mt-4 border-t border-border pt-4">
                <Text className="text-sm text-muted-foreground">Notes</Text>
                <Text className="text-sm text-foreground">{workout.notes}</Text>
              </View>
            )
          ) : (
            editable && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 self-start"
                onPress={openWorkoutNotes}
              >
                <MessageSquare size={16} color={colors.mutedForeground} />
                <Text className="text-sm font-medium text-muted-foreground">
                  Add notes
                </Text>
              </Button>
            )
          )}
        </Card>

        {groupedExercises.length === 0 ? (
          <Card className="p-6">
            <Text className="text-center text-muted-foreground">
              No exercises logged in this workout.
            </Text>
          </Card>
        ) : (
          <View className="gap-4">
            {groupedExercises.map((exercise) => (
              <WorkoutExerciseCard
                key={exercise.name}
                exercise={exercise}
                note={
                  workout.exerciseNotes?.find(
                    (n) => n.exerciseName === exercise.name,
                  )?.note
                }
                preferredUnit={preferredUnit}
                editable={editable}
                onEditSet={handleEditSet}
                onEditCardio={handleEditCardio}
                onEditNote={() => openExerciseNote(exercise.name)}
              />
            ))}
          </View>
        )}
      </ScrollView>

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
        <DialogHeader>
          <DialogTitle>Delete workout?</DialogTitle>
          <DialogDescription>
            This will permanently delete this workout and all logged sets,
            notes, and related workout analysis.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => setShowDeleteConfirm(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onPress={handleDeleteWorkout}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete workout"}
          </Button>
        </DialogFooter>
      </Dialog>
    </SafeAreaView>
  );
}
