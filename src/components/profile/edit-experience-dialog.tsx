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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

const LEVELS: Array<{ id: ExperienceLevel; label: string; description: string }> = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Less than 1 year of consistent training",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "1-3 years, comfortable with main lifts",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "3+ years, structured programming experience",
  },
];

interface EditExperienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLevel: ExperienceLevel | undefined;
}

export function EditExperienceDialog({
  open,
  onOpenChange,
  currentLevel,
}: EditExperienceDialogProps) {
  const [selected, setSelected] = useState<ExperienceLevel | undefined>(currentLevel);
  const [isSaving, setIsSaving] = useState(false);
  const updateOnboarding = useMutation(api.users.updateOnboarding);

  const handleSave = async () => {
    if (!selected) {
      toast.error("Select an experience level");
      return;
    }

    setIsSaving(true);
    try {
      await updateOnboarding({ experienceLevel: selected });
      toast.success("Experience level updated");
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
          <DialogTitle>Experience Level</DialogTitle>
          <DialogDescription>
            How long have you been lifting?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => setSelected(level.id)}
              className={cn(
                "w-full rounded-lg border p-4 text-left transition-colors",
                selected === level.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <div className="font-medium">{level.label}</div>
              <div className="text-sm text-muted-foreground">{level.description}</div>
            </button>
          ))}
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
