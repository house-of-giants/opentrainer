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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

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

        <RadioGroup
          value={unit}
          onValueChange={(value) => setUnit(value as WeightUnit)}
          className="py-4"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="lb" id="lb" />
            <Label htmlFor="lb" className="flex-1 cursor-pointer">
              <div className="font-medium">Imperial (lb)</div>
              <div className="text-sm text-muted-foreground">Pounds</div>
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="kg" id="kg" />
            <Label htmlFor="kg" className="flex-1 cursor-pointer">
              <div className="font-medium">Metric (kg)</div>
              <div className="text-sm text-muted-foreground">Kilograms</div>
            </Label>
          </div>
        </RadioGroup>

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
