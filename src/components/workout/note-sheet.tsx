"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NoteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  note: string;
  onSave: (note: string) => void;
}

function NoteSheetContent({
  exerciseName,
  note,
  onOpenChange,
  onSave,
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
    <SheetContent side="bottom" className="flex flex-col">
      <SheetHeader>
        <SheetTitle>Note</SheetTitle>
        <p className="text-sm text-muted-foreground">{exerciseName}</p>
      </SheetHeader>

      <div className="flex-1 px-4 py-4">
        <textarea
          value={localNote}
          onChange={(e) => setLocalNote(e.target.value)}
          placeholder="Add a note about this exercise..."
          className="w-full h-32 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          autoFocus
        />
      </div>

      <SheetFooter className="flex-row gap-2">
        {localNote && (
          <Button variant="ghost" className="text-muted-foreground" onClick={handleClear}>
            Clear
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </SheetFooter>
    </SheetContent>
  );
}

export function NoteSheet({
  open,
  onOpenChange,
  exerciseName,
  note,
  onSave,
}: NoteSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open && (
        <NoteSheetContent
          exerciseName={exerciseName}
          note={note}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />
      )}
    </Sheet>
  );
}
