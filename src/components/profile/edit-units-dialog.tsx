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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
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
          <FieldLabel>
            <Field orientation="horizontal">
              <RadioGroupItem value="lb" />
              <FieldContent>
                <FieldTitle>Imperial (lb)</FieldTitle>
                <FieldDescription>Pounds</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
          <FieldLabel>
            <Field orientation="horizontal">
              <RadioGroupItem value="kg" />
              <FieldContent>
                <FieldTitle>Metric (kg)</FieldTitle>
                <FieldDescription>Kilograms</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
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
