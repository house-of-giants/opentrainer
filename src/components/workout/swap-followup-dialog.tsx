"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, Settings } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

type SwapReason = "equipment_busy" | "equipment_unavailable" | "discomfort" | "variety";

interface SwapData {
  _id: Id<"exerciseSwaps">;
  originalExercise: string;
  substitutedExercise?: string;
  reason: SwapReason;
  originalEquipment?: string;
}

interface SwapFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swaps: SwapData[];
  onComplete: () => void;
}

export function SwapFollowUpDialog({
  open,
  onOpenChange,
  swaps,
  onComplete,
}: SwapFollowUpDialogProps) {
  const markPromptShown = useMutation(api.ai.swapMutations.markPermanentSwapPromptShown);
  const acceptPermanentSwap = useMutation(api.ai.swapMutations.acceptPermanentSwap);

  const handleAccept = async (swap: SwapData) => {
    await acceptPermanentSwap({ swapId: swap._id, accepted: true });
    await markPromptShown({ swapId: swap._id });
  };

  const handleDecline = async (swap: SwapData) => {
    await acceptPermanentSwap({ swapId: swap._id, accepted: false });
    await markPromptShown({ swapId: swap._id });
  };

  const handleDismissAll = async () => {
    await Promise.all(swaps.map((swap) => markPromptShown({ swapId: swap._id })));
    onComplete();
  };

  const discomfortSwaps = swaps.filter((s) => s.reason === "discomfort");
  const equipmentSwaps = swaps.filter((s) => s.reason === "equipment_unavailable");

  if (swaps.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>About your exercise swaps</DialogTitle>
          <DialogDescription>
            You made some swaps during your workout. Would you like to make any permanent changes?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {discomfortSwaps.map((swap) => (
            <Card key={swap._id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Discomfort swap</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="truncate">{swap.originalExercise}</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="truncate">{swap.substitutedExercise}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Would you like to permanently replace this exercise in your routines?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDecline(swap)}
                >
                  Keep original
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAccept(swap)}
                >
                  Replace permanently
                </Button>
              </div>
            </Card>
          ))}

          {equipmentSwaps.map((swap) => (
            <Card key={swap._id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <Settings className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Equipment not available</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="truncate">{swap.originalExercise}</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="truncate">{swap.substitutedExercise}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Update your equipment profile to get better exercise suggestions?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDecline(swap)}
                >
                  Not now
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAccept(swap)}
                >
                  Update profile
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Button variant="ghost" className="w-full" onClick={handleDismissAll}>
          Dismiss all
        </Button>
      </DialogContent>
    </Dialog>
  );
}
