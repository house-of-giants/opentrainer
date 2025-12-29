"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
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
import { RefreshCw, Loader2 } from "lucide-react";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_DISPLAY_NAMES,
  type EquipmentId,
} from "../../../convex/lib/equipment";

interface EditEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDescription: string | undefined;
  currentEquipment: string[];
}

export function EditEquipmentDialog({
  open,
  onOpenChange,
  currentDescription,
  currentEquipment,
}: EditEquipmentDialogProps) {
  const [description, setDescription] = useState(currentDescription ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(currentEquipment));
  const [parserNote, setParserNote] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateOnboarding = useMutation(api.users.updateOnboarding);
  const parseEquipment = useAction(api.ai.equipmentParser.parseEquipment);

  const toggleEquipment = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (!description.trim()) {
      toast.error("Enter a gym description first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await parseEquipment({ description });
      setSelected(new Set(result.equipment));
      setParserNote(result.note ?? null);
      toast.success("Equipment detected");
    } catch {
      toast.error("Failed to analyze equipment");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateOnboarding({
        equipmentDescription: description || undefined,
        equipment: Array.from(selected),
      });
      toast.success("Equipment updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Equipment</DialogTitle>
          <DialogDescription>
            Describe your gym or select equipment manually.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Gym Description</label>
            <div className="flex gap-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='e.g., "Planet Fitness" or "Home gym with dumbbells and pull-up bar"'
                className="flex-1 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Analyze Equipment
                </>
              )}
            </Button>
            {parserNote && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                💡 {parserNote}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Available Equipment</label>
            {Object.entries(EQUIPMENT_CATEGORIES).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {formatCategoryName(category)}
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleEquipment(id)}
                      className={cn(
                        "rounded border px-2 py-1.5 text-left text-sm transition-colors",
                        selected.has(id)
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {EQUIPMENT_DISPLAY_NAMES[id as EquipmentId]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
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

function formatCategoryName(category: string): string {
  return category
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
