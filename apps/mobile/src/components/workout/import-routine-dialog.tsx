import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";

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

// Port of apps/web/src/components/workout/import-routine-dialog.tsx.
// Like the web dialog, no client-side JSON parsing happens here: the raw
// string is trimmed and sent to routines.importRoutineFromJson, which parses,
// validates, and throws descriptive errors that surface as an error toast.
type ImportRoutineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

const EXAMPLE_JSON = `{
  "version": 1,
  "name": "Push Pull Legs",
  "days": [
    {
      "name": "Push Day",
      "exercises": [
        { "name": "Bench Press", "kind": "lifting", "targetSets": 4, "targetReps": "6-8" },
        { "name": "Overhead Press", "kind": "lifting", "targetSets": 3, "targetReps": "8-10" }
      ]
    }
  ]
}`;

export function ImportRoutineDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportRoutineDialogProps) {
  const { colors } = useTheme();
  const [json, setJson] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const importRoutine = useMutation(api.routines.importRoutineFromJson);

  const handleImport = async () => {
    if (!json.trim()) {
      toast.error("Please paste your routine JSON");
      return;
    }

    setIsImporting(true);
    try {
      await importRoutine({ json: json.trim() });
      toast.success("Routine imported successfully!");
      setJson("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        // Web extends the toast to 10s with pre-wrap styling; the RN toast
        // wrapper has no options slot, so the message renders as-is.
        toast.error(error.message);
      } else {
        toast.error("Failed to import routine");
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
        <DialogTitle>Import Routine</DialogTitle>
        <DialogDescription>
          Paste a routine in JSON format, or paste a workout export to convert
          it to a routine.
        </DialogDescription>
      </DialogHeader>

      <View className="gap-4 py-2">
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Label>Routine JSON</Label>
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
            placeholder={`Paste your routine JSON here...\n\nExample format:\n${EXAMPLE_JSON}`}
            placeholderTextColor={colors.mutedForeground}
            value={json}
            onChangeText={setJson}
            accessibilityLabel="Routine JSON"
          />
        </View>

        <View className="gap-2 rounded-md bg-muted p-3">
          <View>
            <Text className="mb-1 text-xs font-medium text-muted-foreground">
              Import a routine
            </Text>
            <Text className="text-xs text-muted-foreground">
              Use the example format above, or ask AI to create one for you.
            </Text>
          </View>
          <View>
            <Text className="mb-1 text-xs font-medium text-muted-foreground">
              Convert your workout to a routine
            </Text>
            <Text className="text-xs text-muted-foreground">
              Go to any completed workout, tap Export, copy the JSON, then paste
              it here to turn it into a reusable routine.
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
          {isImporting ? "Importing..." : "Import Routine"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
