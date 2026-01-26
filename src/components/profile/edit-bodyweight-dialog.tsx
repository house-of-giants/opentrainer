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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type WeightUnit = "lb" | "kg";

interface EditBodyweightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeight: number | undefined;
  currentUnit: WeightUnit | undefined;
}

export function EditBodyweightDialog({
  open,
  onOpenChange,
  currentWeight,
  currentUnit,
}: EditBodyweightDialogProps) {
  const [weight, setWeight] = useState(currentWeight?.toString() ?? "");
  const [unit, setUnit] = useState<WeightUnit>(currentUnit ?? "lb");
  const [isSaving, setIsSaving] = useState(false);
  const updatePreferences = useMutation(api.users.updatePreferences);

  useEffect(() => {
    if (open) {
      setWeight(currentWeight?.toString() ?? "");
      setUnit(currentUnit ?? "lb");
    }
  }, [open, currentWeight, currentUnit]);

  const handleSave = async () => {
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    setIsSaving(true);
    try {
      await updatePreferences({
        bodyweight: weightValue,
        bodyweightUnit: unit,
      });
      toast.success("Bodyweight updated");
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
          <DialogTitle>Bodyweight</DialogTitle>
          <DialogDescription>
            Track your current bodyweight for progress monitoring.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Enter weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-14 text-2xl font-mono text-center"
              autoFocus
            />
            <div className="flex rounded-md border overflow-hidden">
              <button
                type="button"
                onClick={() => setUnit("lb")}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors",
                  unit === "lb"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                lb
              </button>
              <button
                type="button"
                onClick={() => setUnit("kg")}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors",
                  unit === "kg"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                kg
              </button>
            </div>
          </div>
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
