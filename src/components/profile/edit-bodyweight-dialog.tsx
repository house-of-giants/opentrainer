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
import { displayWeight, type WeightUnit } from "@/lib/units";

interface EditBodyweightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeight: number | undefined;
  storedUnit: WeightUnit | undefined;
  preferredUnit: WeightUnit;
}

export function EditBodyweightDialog({
  open,
  onOpenChange,
  currentWeight,
  storedUnit,
  preferredUnit,
}: EditBodyweightDialogProps) {
  const [weight, setWeight] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const updatePreferences = useMutation(api.users.updatePreferences);

  useEffect(() => {
    if (open && currentWeight !== undefined) {
      const fromUnit = storedUnit ?? "lb";
      const converted = displayWeight(currentWeight, fromUnit, preferredUnit);
      setWeight(converted.toString());
    } else if (open) {
      setWeight("");
    }
  }, [open, currentWeight, storedUnit, preferredUnit]);

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
        bodyweightUnit: preferredUnit,
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

        <div className="py-4">
          <div className="flex items-center justify-center gap-3">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Enter weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-14 w-32 text-2xl font-mono text-center"
              autoFocus
            />
            <span className="text-lg text-muted-foreground font-medium">
              {preferredUnit}
            </span>
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
