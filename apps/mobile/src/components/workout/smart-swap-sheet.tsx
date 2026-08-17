import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";
import {
  Dumbbell,
  Clock,
  Ban,
  Shuffle,
  AlertTriangle,
  Check,
  Sparkles,
} from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/cn";

type SwapReason =
  | "equipment_busy"
  | "equipment_unavailable"
  | "discomfort"
  | "variety";

interface SmartSwapSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: Id<"workouts">;
  exerciseName: string;
  onSwapComplete: (selection: {
    name: string;
    measurementType: "reps" | "duration";
    targetHoldSeconds?: number;
  }) => void;
}

const SWAP_REASONS: {
  reason: SwapReason;
  label: string;
  icon: (color: string) => ReactNode;
  description: string;
}[] = [
  {
    reason: "equipment_busy",
    label: "Equipment is busy",
    icon: (color) => <Clock size={20} color={color} />,
    description: "Someone else is using it",
  },
  {
    reason: "equipment_unavailable",
    label: "I don't have this equipment",
    icon: (color) => <Ban size={20} color={color} />,
    description: "Not available at my gym",
  },
  {
    reason: "discomfort",
    label: "Causing discomfort",
    icon: (color) => <AlertTriangle size={20} color={color} />,
    description: "Pain or uncomfortable",
  },
  {
    reason: "variety",
    label: "Want variety",
    icon: (color) => <Shuffle size={20} color={color} />,
    description: "Just want something different",
  },
];

export function SmartSwapSheet({
  open,
  onOpenChange,
  workoutId,
  exerciseName,
  onSwapComplete,
}: SmartSwapSheetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useQuery(api.users.getCurrentUser);
  const hasAiCoach = user?.tier === "pro";

  const [step, setStep] = useState<"reason" | "loading" | "alternatives">(
    "reason",
  );
  const [alternatives, setAlternatives] = useState<
    {
      exercise: string;
      reasoning: string;
      equipmentNeeded: string[];
      muscleEmphasis: string;
      difficultyAdjustment?: "easier" | "similar" | "harder";
      measurementType?: "reps" | "duration";
      targetHoldSeconds?: number;
    }[]
  >([]);
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
      toast.error(
        error instanceof Error ? error.message : "Failed to get alternatives",
      );
      setStep("reason");
    }
  };

  const handleSelectAlternative = async (
    alternative: (typeof alternatives)[number],
  ) => {
    if (swapId) {
      try {
        await confirmSwap({ swapId, selectedExercise: alternative.exercise });
      } catch (error) {
        console.error("Failed to confirm swap:", error);
      }
    }

    toast.success(`Swapped to ${alternative.exercise}`);
    onSwapComplete({
      name: alternative.exercise,
      measurementType: alternative.measurementType ?? "reps",
      targetHoldSeconds: alternative.targetHoldSeconds,
    });
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
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
      snapPoints={["85%"]}
      scrollable
    >
      <SheetHeader>
        <SheetTitle>
          {!hasAiCoach
            ? "Smart Swap"
            : step === "reason"
              ? "Swap Exercise"
              : step === "loading"
                ? "Finding alternatives..."
                : "Alternatives"}
        </SheetTitle>
        {hasAiCoach && step === "reason" && (
          <SheetDescription>
            Why do you want to swap {exerciseName}?
          </SheetDescription>
        )}
        {hasAiCoach && step === "alternatives" && (
          <SheetDescription>
            Select an alternative for {exerciseName}
          </SheetDescription>
        )}
      </SheetHeader>

      <View className="gap-3 pb-8 pt-2">
        {!hasAiCoach && (
          <View className="items-center py-8">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
              <Sparkles size={32} color="#8b5cf6" />
            </View>
            <View className="mb-3 rounded-full bg-violet-500/10 px-3 py-1">
              <Text className="text-xs font-semibold text-violet-600">
                Free During Alpha
              </Text>
            </View>
            <Text className="mb-2 text-lg font-semibold text-foreground">
              Smart Swap
            </Text>
            <Text className="mb-6 max-w-xs text-center text-sm text-muted-foreground">
              Get AI-powered exercise alternatives that match your equipment,
              goals, and workout context — free during alpha.
            </Text>
            <Button
              onPress={() => {
                handleClose();
                // integration: web links to /dashboard; the dashboard tab is
                // the (tabs) index route.
                router.push("/(app)/(tabs)");
              }}
            >
              <Sparkles size={16} color={colors.primaryForeground} />
              <Text className="text-sm font-medium text-primary-foreground">
                Get Started Free
              </Text>
            </Button>
            <Button variant="ghost" className="mt-2" onPress={handleClose}>
              Maybe Later
            </Button>
          </View>
        )}

        {hasAiCoach && step === "reason" && (
          <>
            {SWAP_REASONS.map(({ reason, label, icon, description }) => (
              <Pressable
                key={reason}
                onPress={() => handleSelectReason(reason)}
                accessibilityRole="button"
              >
                <Card className="p-4 active:bg-muted/50">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {icon(colors.foreground)}
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="font-medium text-foreground">
                        {label}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {description}
                      </Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))}
          </>
        )}

        {hasAiCoach && step === "loading" && (
          <View className="gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </View>
        )}

        {hasAiCoach && step === "alternatives" && (
          <>
            {alternatives.map((alt, i) => (
              <Card key={i} className="p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <View className="mb-1 flex-row items-center gap-2">
                      <Dumbbell size={16} color={colors.mutedForeground} />
                      <Text
                        numberOfLines={1}
                        className="min-w-0 shrink font-medium text-foreground"
                      >
                        {alt.exercise}
                      </Text>
                      {i === 0 && (
                        <Badge variant="secondary" textClassName="text-xs">
                          Recommended
                        </Badge>
                      )}
                    </View>
                    <Text className="mb-2 text-sm text-muted-foreground">
                      {alt.reasoning}
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {alt.equipmentNeeded.map((eq) => (
                        <Badge key={eq} variant="outline" textClassName="text-xs">
                          {eq}
                        </Badge>
                      ))}
                      {alt.difficultyAdjustment &&
                        alt.difficultyAdjustment !== "similar" && (
                          <Badge
                            variant="outline"
                            className={cn(
                              alt.difficultyAdjustment === "easier"
                                ? "border-green-500/30"
                                : "border-red-500/30",
                            )}
                            textClassName={cn(
                              "text-xs",
                              alt.difficultyAdjustment === "easier"
                                ? "text-green-600"
                                : "text-red-600",
                            )}
                          >
                            {alt.difficultyAdjustment === "easier"
                              ? "Easier"
                              : "Harder"}
                          </Badge>
                        )}
                    </View>
                  </View>
                  <Button size="sm" onPress={() => handleSelectAlternative(alt)}>
                    <Check size={16} color={colors.primaryForeground} />
                    <Text className="text-sm font-medium text-primary-foreground">
                      Use
                    </Text>
                  </Button>
                </View>
              </Card>
            ))}

            {note && (
              <Card className="border-amber-500/20 bg-amber-500/10 p-3">
                <View className="flex-row items-start gap-1.5">
                  <AlertTriangle size={16} color="#b45309" />
                  <Text className="flex-1 text-sm text-amber-700 dark:text-amber-400">
                    {note}
                  </Text>
                </View>
              </Card>
            )}

            <Button variant="outline" className="w-full" onPress={handleClose}>
              Cancel
            </Button>
          </>
        )}
      </View>
    </Sheet>
  );
}
