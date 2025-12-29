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
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface EditAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDays: number | undefined;
  currentDuration: number | undefined;
}

export function EditAvailabilityDialog({
  open,
  onOpenChange,
  currentDays,
  currentDuration,
}: EditAvailabilityDialogProps) {
  const [days, setDays] = useState(currentDays ?? 4);
  const [duration, setDuration] = useState(currentDuration ?? 60);
  const [isSaving, setIsSaving] = useState(false);
  const updateOnboarding = useMutation(api.users.updateOnboarding);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateOnboarding({
        weeklyAvailability: days,
        sessionDuration: duration,
      });
      toast.success("Availability updated");
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
          <DialogTitle>Training Availability</DialogTitle>
          <DialogDescription>
            How often can you train?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Days per week</span>
              <span className="text-2xl font-bold tabular-nums">{days}</span>
            </div>
            <Slider
              value={[days]}
              onValueChange={([value]) => setDays(value)}
              min={1}
              max={7}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>7</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Session length</span>
              <span className="text-2xl font-bold tabular-nums">{duration} min</span>
            </div>
            <Slider
              value={[duration]}
              onValueChange={([value]) => setDuration(value)}
              min={30}
              max={120}
              step={15}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30 min</span>
              <span>120 min</span>
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
