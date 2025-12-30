"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Clock, Ban, Shuffle, AlertTriangle, Check, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Id } from "../../../convex/_generated/dataModel";

type SwapReason = "equipment_busy" | "equipment_unavailable" | "discomfort" | "variety";

interface SmartSwapSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: Id<"workouts">;
  exerciseName: string;
  onSwapComplete: (newExerciseName: string) => void;
}

const SWAP_REASONS: Array<{ reason: SwapReason; label: string; icon: React.ReactNode; description: string }> = [
  { reason: "equipment_busy", label: "Equipment is busy", icon: <Clock className="h-5 w-5" />, description: "Someone else is using it" },
  { reason: "equipment_unavailable", label: "I don't have this equipment", icon: <Ban className="h-5 w-5" />, description: "Not available at my gym" },
  { reason: "discomfort", label: "Causing discomfort", icon: <AlertTriangle className="h-5 w-5" />, description: "Pain or uncomfortable" },
  { reason: "variety", label: "Want variety", icon: <Shuffle className="h-5 w-5" />, description: "Just want something different" },
];

export function SmartSwapSheet({
  open,
  onOpenChange,
  workoutId,
  exerciseName,
  onSwapComplete,
}: SmartSwapSheetProps) {
  const { has } = useAuth();
  const hasAiCoach = has?.({ feature: "ai_coach" });
  
  const [step, setStep] = useState<"reason" | "loading" | "alternatives">("reason");
  const [alternatives, setAlternatives] = useState<Array<{
    exercise: string;
    reasoning: string;
    equipmentNeeded: string[];
    muscleEmphasis: string;
    difficultyAdjustment?: "easier" | "similar" | "harder";
  }>>([]);
  const [swapId, setSwapId] = useState<Id<"exerciseSwaps"> | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const getAlternatives = useAction(api.ai.smartSwap.getAlternatives);
  const confirmSwap = useMutation(api.ai.swapMutations.confirmSwap);

  const handleSelectReason = async (reason: SwapReason) => {
    setStep("loading");

    try {
      const result = await getAlternatives({
        workoutId,
        exerciseName,
        reason,
      });

      setAlternatives(result.alternatives);
      setSwapId(result.swapId ?? null);
      setNote(result.note ?? null);
      setStep("alternatives");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to get alternatives");
      setStep("reason");
    }
  };

  const handleSelectAlternative = async (alternativeExercise: string) => {
    if (swapId) {
      try {
        await confirmSwap({ swapId, selectedExercise: alternativeExercise });
      } catch (error) {
        console.error("Failed to confirm swap:", error);
      }
    }

    toast.success(`Swapped to ${alternativeExercise}`);
    onSwapComplete(alternativeExercise);
    handleClose();
  };

  const handleClose = () => {
    setStep("reason");
    setAlternatives([]);
    setSwapId(null);
    setNote(null);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="h-[85vh] flex flex-col">
        <DrawerHeader>
          <DrawerTitle>
            {!hasAiCoach && "Smart Swap"}
            {hasAiCoach && step === "reason" && "Swap Exercise"}
            {hasAiCoach && step === "loading" && "Finding alternatives..."}
            {hasAiCoach && step === "alternatives" && "Alternatives"}
          </DrawerTitle>
          {hasAiCoach && step === "reason" && (
            <DrawerDescription>
              Why do you want to swap {exerciseName}?
            </DrawerDescription>
          )}
          {hasAiCoach && step === "alternatives" && (
            <DrawerDescription>
              Select an alternative for {exerciseName}
            </DrawerDescription>
          )}
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3">
          {!hasAiCoach && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10 mb-4">
                <Sparkles className="h-8 w-8 text-violet-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Swap is a Pro Feature</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Get AI-powered exercise alternatives that match your equipment, goals, and workout context.
              </p>
              <Button className="gap-2" asChild>
                <Link href="/pricing">
                  <Lock className="h-4 w-4" />
                  Unlock with Pro
                </Link>
              </Button>
              <Button variant="ghost" className="mt-2" onClick={handleClose}>
                Maybe Later
              </Button>
            </div>
          )}

          {hasAiCoach && step === "reason" && (
            <>
              {SWAP_REASONS.map(({ reason, label, icon, description }) => (
                <Card
                  key={reason}
                  className="cursor-pointer p-4 transition-colors hover:bg-muted/50 active:bg-muted/70"
                  onClick={() => handleSelectReason(reason)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {icon}
                    </div>
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}

          {hasAiCoach && step === "loading" && (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {hasAiCoach && step === "alternatives" && (
            <>
              {alternatives.map((alt, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{alt.exercise}</span>
                        {i === 0 && (
                          <Badge variant="secondary" className="text-xs shrink-0">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alt.reasoning}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {alt.equipmentNeeded.map((eq) => (
                          <Badge key={eq} variant="outline" className="text-xs">{eq}</Badge>
                        ))}
                        {alt.difficultyAdjustment && alt.difficultyAdjustment !== "similar" && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              alt.difficultyAdjustment === "easier"
                                ? "border-green-500/30 text-green-600"
                                : "border-red-500/30 text-red-600"
                            }`}
                          >
                            {alt.difficultyAdjustment === "easier" ? "Easier" : "Harder"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelectAlternative(alt.exercise)}
                    >
                      <Check className="h-4 w-4 mr-1.5" />
                      Use
                    </Button>
                  </div>
                </Card>
              ))}

              {note && (
                <Card className="p-3 bg-amber-500/10 border-amber-500/20">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 inline mr-1.5" />
                    {note}
                  </p>
                </Card>
              )}

              <Button variant="outline" className="w-full" onClick={handleClose}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
