"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type WeightUnit = "lb" | "kg";

interface EditUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUnit: WeightUnit | undefined;
}

export function EditUnitsDialog({
  open,
  onOpenChange,
  currentUnit,
}: EditUnitsDialogProps) {
  const [unit, setUnit] = useState<WeightUnit>(currentUnit ?? "lb");
  const [isSaving, setIsSaving] = useState(false);
  const updatePreferences = useMutation(api.users.updatePreferences);

  useEffect(() => {
    if (open) {
      setUnit(currentUnit ?? "lb");
    }
  }, [open, currentUnit]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({
        preferredUnits: unit,
      });
      toast.success("Units updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Weight Units</DialogTitle>
          <DialogDescription>
            Choose your preferred unit for tracking weights.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <button
            type="button"
            onClick={() => setUnit("lb")}
            className={cn(
              "w-full p-4 rounded-lg border text-left transition-colors",
              unit === "lb"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted"
            )}
          >
            <div className="font-medium">Imperial (lb)</div>
            <div className="text-sm text-muted-foreground">Pounds</div>
          </button>
          <button
            type="button"
            onClick={() => setUnit("kg")}
            className={cn(
              "w-full p-4 rounded-lg border text-left transition-colors",
              unit === "kg"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted"
            )}
          >
            <div className="font-medium">Metric (kg)</div>
            <div className="text-sm text-muted-foreground">Kilograms</div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
