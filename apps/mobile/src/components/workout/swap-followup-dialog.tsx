import { ScrollView, Text, View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";
import { AlertTriangle, ArrowRight, Settings } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/theme/theme-provider";

type SwapReason =
  | "equipment_busy"
  | "equipment_unavailable"
  | "discomfort"
  | "variety";

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
  const { colors } = useTheme();
  const markPromptShown = useMutation(
    api.ai.swapMutations.markPermanentSwapPromptShown,
  );
  const acceptPermanentSwap = useMutation(
    api.ai.swapMutations.acceptPermanentSwap,
  );

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
  const equipmentSwaps = swaps.filter(
    (s) => s.reason === "equipment_unavailable",
  );

  if (swaps.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>About your exercise swaps</DialogTitle>
        <DialogDescription>
          You made some swaps during your workout. Would you like to make any
          permanent changes?
        </DialogDescription>
      </DialogHeader>

      <ScrollView className="max-h-96">
        <View className="gap-4 py-2">
          {discomfortSwaps.map((swap) => (
            <Card key={swap._id} className="p-4">
              <View className="mb-3 flex-row items-start gap-3">
                <AlertTriangle size={20} color="#f59e0b" />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-medium text-foreground">
                    Discomfort swap
                  </Text>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Text
                      numberOfLines={1}
                      className="shrink text-sm text-muted-foreground"
                    >
                      {swap.originalExercise}
                    </Text>
                    <ArrowRight size={12} color={colors.mutedForeground} />
                    <Text
                      numberOfLines={1}
                      className="shrink text-sm text-muted-foreground"
                    >
                      {swap.substitutedExercise}
                    </Text>
                  </View>
                </View>
              </View>
              <Text className="mb-3 text-sm text-muted-foreground">
                Would you like to permanently replace this exercise in your
                routines?
              </Text>
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => handleDecline(swap)}
                >
                  Keep original
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onPress={() => handleAccept(swap)}
                >
                  Replace permanently
                </Button>
              </View>
            </Card>
          ))}

          {equipmentSwaps.map((swap) => (
            <Card key={swap._id} className="p-4">
              <View className="mb-3 flex-row items-start gap-3">
                <Settings size={20} color="#3b82f6" />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-medium text-foreground">
                    Equipment not available
                  </Text>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Text
                      numberOfLines={1}
                      className="shrink text-sm text-muted-foreground"
                    >
                      {swap.originalExercise}
                    </Text>
                    <ArrowRight size={12} color={colors.mutedForeground} />
                    <Text
                      numberOfLines={1}
                      className="shrink text-sm text-muted-foreground"
                    >
                      {swap.substitutedExercise}
                    </Text>
                  </View>
                </View>
              </View>
              <Text className="mb-3 text-sm text-muted-foreground">
                Update your equipment profile to get better exercise
                suggestions?
              </Text>
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => handleDecline(swap)}
                >
                  Not now
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onPress={() => handleAccept(swap)}
                >
                  Update profile
                </Button>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      <Button variant="ghost" className="w-full" onPress={handleDismissAll}>
        Dismiss all
      </Button>
    </Dialog>
  );
}
