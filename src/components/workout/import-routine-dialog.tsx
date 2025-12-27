"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
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

type ImportRoutineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

const EXAMPLE_JSON = `{
  "version": 1,
  "name": "Push Pull Legs",
  "days": [
    {
      "name": "Push Day",
      "exercises": [
        { "name": "Bench Press", "kind": "lifting", "targetSets": 4, "targetReps": "6-8" },
        { "name": "Overhead Press", "kind": "lifting", "targetSets": 3, "targetReps": "8-10" }
      ]
    }
  ]
}`;

export function ImportRoutineDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportRoutineDialogProps) {
  const [json, setJson] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const importRoutine = useMutation(api.routines.importRoutineFromJson);

  const handleImport = async () => {
    if (!json.trim()) {
      toast.error("Please paste your routine JSON");
      return;
    }

    setIsImporting(true);
    try {
      await importRoutine({ json: json.trim() });
      toast.success("Routine imported successfully!");
      setJson("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to import routine");
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
          <DialogTitle>Import Routine</DialogTitle>
          <DialogDescription>
            Paste a routine in JSON format. You can use ChatGPT to generate one!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="json-input">Routine JSON</Label>
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
              placeholder={`Paste your routine JSON here...\n\nExample format:\n${EXAMPLE_JSON}`}
              value={json}
              onChange={(e) => setJson(e.target.value)}
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Tip: Generate with AI</p>
            <p>
              Ask ChatGPT: &quot;Create a 3-day workout routine in JSON format with name, days array, and exercises with name, kind (lifting/cardio), targetSets, and targetReps.&quot;
            </p>
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
            {isImporting ? "Importing..." : "Import Routine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
