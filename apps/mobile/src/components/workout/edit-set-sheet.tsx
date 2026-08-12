// STUB — replaced by lane B at integration; keep props identical to web.
// Mirrors apps/web/src/components/workout/edit-set-sheet.tsx.
export interface EditableSet {
  entryId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  durationSeconds?: number;
  unit: "lb" | "kg";
  storedWeight?: number;
  storedUnit?: "lb" | "kg";
  isBodyweight?: boolean;
  isWarmup?: boolean;
  rpe?: number | null;
}

interface EditSetSheetProps {
  set: EditableSet | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    entryId: string,
    data: {
      reps?: number;
      weight?: number;
      durationSeconds?: number;
      rpe?: number | null;
      isWarmup?: boolean;
    },
  ) => void;
  onDelete: (entryId: string) => void;
}

export function EditSetSheet(props: EditSetSheetProps) {
  void props;
  return null;
}
