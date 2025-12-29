"use client";

import { cn } from "@/lib/utils";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_DISPLAY_NAMES,
  type EquipmentId,
} from "../../../../convex/lib/equipment";

interface EquipmentConfirmStepProps {
  equipment: string[];
  onEquipmentChange: (equipment: string[]) => void;
  note: string | null;
  isLoading: boolean;
}

export function EquipmentConfirmStep({
  equipment,
  onEquipmentChange,
  note,
  isLoading,
}: EquipmentConfirmStepProps) {
  const toggleEquipment = (id: string) => {
    if (equipment.includes(id)) {
      onEquipmentChange(equipment.filter((e) => e !== id));
    } else {
      onEquipmentChange([...equipment, id]);
    }
  };

  const formatCategoryName = (category: string): string => {
    return category
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Analyzing your gym...</h1>
          <p className="mt-2 text-muted-foreground">
            Hold tight, we&apos;re detecting your equipment.
          </p>
        </div>
        <div className="flex justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">We detected this equipment</h1>
        <p className="mt-2 text-muted-foreground">
          Tap to add or remove items. This helps AI suggest the right exercises.
        </p>
      </div>

      {note && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {note}
          </p>
        </div>
      )}

      <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-2">
        {Object.entries(EQUIPMENT_CATEGORIES).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide sticky top-0 bg-background py-1">
              {formatCategoryName(category)}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {items.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleEquipment(id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-all",
                    equipment.includes(id)
                      ? "border-primary bg-primary/10 text-foreground font-medium"
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
  );
}
