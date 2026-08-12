import { useState, useEffect } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
        <Input
          value={localNote}
          onChangeText={setLocalNote}
          placeholder={
            exerciseName
              ? "Add a note about this exercise..."
              : "Add a note about this workout..."
          }
          multiline
          textAlignVertical="top"
          className="h-32 py-2"
          autoFocus
        />
      </View>

      <View className="flex-row gap-2 pb-4">
        {localNote ? (
          <Button
            variant="ghost"
            textClassName="text-muted-foreground"
            onPress={handleClear}
          >
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
