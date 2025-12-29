"use client";

import { useQuery } from "convex/react";
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
import { toast } from "sonner";
import { Copy, Download } from "lucide-react";

type ExportWorkoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: Id<"workouts">;
};

export function ExportWorkoutDialog({
  open,
  onOpenChange,
  workoutId,
}: ExportWorkoutDialogProps) {
  const exportData = useQuery(
    api.workouts.exportWorkoutAsJson,
    open ? { workoutId } : "skip"
  );

  const handleCopy = async () => {
    if (!exportData?.json) return;

    try {
      await navigator.clipboard.writeText(exportData.json);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    if (!exportData?.json) return;

    const blob = new Blob([exportData.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportData.workoutTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Workout</DialogTitle>
          <DialogDescription>
            Export this workout as JSON to import it as a routine later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <textarea
              readOnly
              className="h-64 w-full rounded-md border bg-muted px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={exportData?.json ?? "Loading..."}
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Tip: Re-import as a routine</p>
            <p>
              Use &quot;Import Routine&quot; on the routines page to create a new routine from this workout.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!exportData?.json}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button onClick={handleDownload} disabled={!exportData?.json}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
