"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type ImportDayDialogProps = {
  routineId: Id<"routines">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (dayIndex: number) => void;
};

const EXAMPLE_JSON = `{
  "name": "Backup Push Day",
  "exercises": [
    { "name": "Bench Press", "kind": "lifting", "targetSets": 4, "targetReps": "6-8" },
    { "name": "Overhead Press", "kind": "lifting", "targetSets": 3, "targetReps": "8-10" },
    { "name": "Lateral Raises", "kind": "lifting", "targetSets": 3, "targetReps": "12-15" }
  ]
}`;

export function ImportDayDialog({
  routineId,
  open,
  onOpenChange,
  onSuccess,
}: ImportDayDialogProps) {
  const [json, setJson] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const importDay = useMutation(api.routines.importDayToRoutine);

  const handleImport = async () => {
    if (!json.trim()) {
      toast.error("Please paste your day JSON");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importDay({ routineId, json: json.trim() });
      toast.success("Day imported successfully!");
      setJson("");
      onOpenChange(false);
      onSuccess?.(result.dayIndex);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message, {
          duration: 10000,
          style: { whiteSpace: "pre-wrap" },
        });
      } else {
        toast.error("Failed to import day");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handlePasteExample = () => {
    setJson(EXAMPLE_JSON);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Day</DialogTitle>
          <DialogDescription>
            Paste a day in JSON format, or paste a workout export to add it as a new day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="json-input">Day JSON</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={handlePasteExample}
              >
                Paste example
              </Button>
            </div>
            <textarea
              id="json-input"
              className="h-64 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={`Paste your day JSON here...\n\nExample format:\n${EXAMPLE_JSON}`}
              value={json}
              onChange={(e) => setJson(e.target.value)}
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-2">
            <div>
              <p className="font-medium mb-1">Import a day</p>
              <p>
                Use the example format above, or ask AI to create one for you.
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Convert your workout to a day</p>
              <p>
                Go to any completed workout, click Export, copy the JSON, then paste it here to add it as a new day.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !json.trim()}>
            {isImporting ? "Importing..." : "Import Day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
