// STUB — replaced by lane B at integration; keep props identical to web.
// Mirrors apps/web/src/components/workout/workout-time-editor-dialog.tsx.
interface WorkoutTimeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStartedAt: number;
  initialCompletedAt: number;
  mode: "finish" | "edit";
  onSubmit: (startedAt: number, completedAt: number) => Promise<void>;
  isSubmitting: boolean;
}

export function WorkoutTimeEditorDialog(props: WorkoutTimeEditorDialogProps) {
  void props;
  return null;
}
