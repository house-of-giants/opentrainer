import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useMutation } from "convex/react";
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
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/workout/import-day-dialog.tsx. As on web,
// the raw JSON string goes straight to routines.importDayToRoutine; the
// mutation owns parsing/validation and its error message becomes the toast.
type ImportDayDialogProps = {
  routineId: Id<"routines">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (dayIndex: number) => void;
};

const EXAMPLE_JSON = `{
  "name": "Backup Push Day",
  "exercises": [
    { "name": "Bench Press", "kind": "lifting", "targetSets": 4, "targetReps": "6-8" },
    { "name": "Overhead Press", "kind": "lifting", "targetSets": 3, "targetReps": "8-10" },
    { "name": "Lateral Raises", "kind": "lifting", "targetSets": 3, "targetReps": "12-15" }
  ]
}`;

export function ImportDayDialog({
  routineId,
  open,
  onOpenChange,
  onSuccess,
}: ImportDayDialogProps) {
  const { colors } = useTheme();
  const [json, setJson] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const importDay = useMutation(api.routines.importDayToRoutine);

  const handleImport = async () => {
    if (!json.trim()) {
      toast.error("Please paste your day JSON");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importDay({ routineId, json: json.trim() });
      toast.success("Day imported successfully!");
      setJson("");
      onOpenChange(false);
      onSuccess?.(result.dayIndex);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to import day");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handlePasteExample = () => {
    setJson(EXAMPLE_JSON);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Import Day</DialogTitle>
        <DialogDescription>
          Paste a day in JSON format, or paste a workout export to add it as a
          new day.
        </DialogDescription>
      </DialogHeader>

      <View className="gap-4 py-2">
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Label>Day JSON</Label>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0"
              textClassName="text-xs"
              onPress={handlePasteExample}
            >
              Paste example
            </Button>
          </View>
          <TextInput
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            className="h-64 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground"
            placeholder={`Paste your day JSON here...\n\nExample format:\n${EXAMPLE_JSON}`}
            placeholderTextColor={colors.mutedForeground}
            value={json}
            onChangeText={setJson}
            accessibilityLabel="Day JSON"
          />
        </View>

        <View className="gap-2 rounded-md bg-muted p-3">
          <View>
            <Text className="mb-1 text-xs font-medium text-muted-foreground">
              Import a day
            </Text>
            <Text className="text-xs text-muted-foreground">
              Use the example format above, or ask AI to create one for you.
            </Text>
          </View>
          <View>
            <Text className="mb-1 text-xs font-medium text-muted-foreground">
              Convert your workout to a day
            </Text>
            <Text className="text-xs text-muted-foreground">
              Go to any completed workout, tap Export, copy the JSON, then paste
              it here to add it as a new day.
            </Text>
          </View>
        </View>
      </View>

      <DialogFooter>
        <Button
          variant="ghost"
          onPress={() => onOpenChange(false)}
          disabled={isImporting}
        >
          Cancel
        </Button>
        <Button onPress={handleImport} disabled={isImporting || !json.trim()}>
          {isImporting ? "Importing..." : "Import Day"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
