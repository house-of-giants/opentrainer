import { ScrollView, Share, Text, View } from "react-native";
import { useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { Copy, Share2 } from "lucide-react-native";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/workout/export-workout-dialog.tsx.
// The JSON payload is produced server-side by api.workouts.exportWorkoutAsJson,
// so it is byte-identical to web. Browser download is replaced by the native
// share sheet; copy uses expo-clipboard instead of navigator.clipboard.
type ExportWorkoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: Id<"workouts">;
};

export function ExportWorkoutDialog({
  open,
  onOpenChange,
  workoutId,
}: ExportWorkoutDialogProps) {
  const { colors } = useTheme();
  const exportData = useQuery(
    api.workouts.exportWorkoutAsJson,
    open ? { workoutId } : "skip",
  );

  const handleCopy = async () => {
    if (!exportData?.json) return;

    try {
      await Clipboard.setStringAsync(exportData.json);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    if (!exportData?.json) return;

    const fileName = `${exportData.workoutTitle
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()}.json`;

    try {
      await Share.share({ message: exportData.json, title: fileName });
    } catch {
      toast.error("Failed to share");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} contentClassName="max-h-[90%]">
      <DialogHeader>
        <DialogTitle>Export Workout</DialogTitle>
        <DialogDescription>
          Export this workout as JSON to import it as a routine later.
        </DialogDescription>
      </DialogHeader>

      <View className="gap-4">
        <ScrollView className="h-64 rounded-md border border-border bg-muted px-3 py-2">
          <Text
            selectable
            accessibilityLabel="Workout JSON"
            className="font-mono text-xs text-foreground"
          >
            {exportData?.json ?? "Loading..."}
          </Text>
        </ScrollView>

        <View className="rounded-md bg-muted p-3">
          <Text className="mb-1 text-xs font-medium text-muted-foreground">
            Tip: Re-import as a routine
          </Text>
          <Text className="text-xs text-muted-foreground">
            Use &quot;Import Routine&quot; on the routines page to create a new
            routine from this workout.
          </Text>
        </View>
      </View>

      <DialogFooter>
        <Button
          variant="outline"
          onPress={handleCopy}
          disabled={!exportData?.json}
        >
          <Copy size={16} color={colors.foreground} />
          <Text className="text-sm font-medium text-foreground">Copy</Text>
        </Button>
        <Button onPress={handleShare} disabled={!exportData?.json}>
          <Share2 size={16} color={colors.primaryForeground} />
          <Text className="text-sm font-medium text-primary-foreground">
            Share
          </Text>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
