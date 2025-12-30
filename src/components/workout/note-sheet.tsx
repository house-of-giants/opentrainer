"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
    <DrawerContent className="flex flex-col">
      <DrawerHeader>
        <DrawerTitle>Note</DrawerTitle>
        <p className="text-sm text-muted-foreground">{exerciseName}</p>
      </DrawerHeader>

      <div className="flex-1 px-4 py-4">
        <textarea
          value={localNote}
          onChange={(e) => setLocalNote(e.target.value)}
          placeholder="Add a note about this exercise..."
          className="w-full h-32 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          autoFocus
        />
      </div>

      <DrawerFooter className="flex-row gap-2">
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
      </DrawerFooter>
    </DrawerContent>
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      {open && (
        <NoteSheetContent
          exerciseName={exerciseName}
          note={note}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />
      )}
    </Drawer>
  );
}
