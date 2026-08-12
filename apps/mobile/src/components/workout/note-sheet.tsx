import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/workout/note-sheet.tsx (vaul drawer →
// bottom sheet). Props identical.
interface NoteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  note: string;
  onSave: (note: string) => void;
  title?: string;
}

function NoteSheetContent({
  exerciseName,
  note,
  onOpenChange,
  onSave,
  title,
}: Omit<NoteSheetProps, "open">) {
  const { colors } = useTheme();
  const [localNote, setLocalNote] = useState(note);

  useEffect(() => {
    setLocalNote(note);
  }, [note]);

  const handleSave = () => {
    onSave(localNote);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalNote("");
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{title ?? "Note"}</SheetTitle>
        {exerciseName ? (
          <Text className="text-sm text-muted-foreground">{exerciseName}</Text>
        ) : null}
      </SheetHeader>

      <View className="py-4">
        <TextInput
          value={localNote}
          onChangeText={setLocalNote}
          placeholder={
            exerciseName
              ? "Add a note about this exercise..."
              : "Add a note about this workout..."
          }
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
          autoFocus
          accessibilityLabel={title ?? "Note"}
          className="h-32 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </View>

      <View className="flex-row items-center gap-2">
        {localNote ? (
          <Button variant="ghost" textClassName="text-muted-foreground" onPress={handleClear}>
            Clear
          </Button>
        ) : null}
        <View className="flex-1" />
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onPress={handleSave}>Save</Button>
      </View>
    </>
  );
}

export function NoteSheet({
  open,
  onOpenChange,
  exerciseName,
  note,
  onSave,
  title,
}: NoteSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open && (
        <NoteSheetContent
          exerciseName={exerciseName}
          note={note}
          onOpenChange={onOpenChange}
          onSave={onSave}
          title={title}
        />
      )}
    </Sheet>
  );
}
