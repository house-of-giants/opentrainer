import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAction, useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_DISPLAY_NAMES,
  type EquipmentId,
} from "@opentrainer/backend/convex/lib/equipment";
import { RefreshCw } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/profile/edit-equipment-dialog.tsx, including
// the AI re-analyze flow (api.ai.equipmentParser.parseEquipment).
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
  const { colors } = useTheme();
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
    <Dialog open={open} onOpenChange={onOpenChange} contentClassName="max-h-[85%]">
      <DialogHeader>
        <DialogTitle>Equipment</DialogTitle>
        <DialogDescription>
          Describe your gym or select equipment manually.
        </DialogDescription>
      </DialogHeader>

      <ScrollView className="flex-shrink" contentContainerClassName="gap-4 py-4">
        <View className="gap-2">
          <Label>Gym Description</Label>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder={
              'e.g., "Planet Fitness" or "Home gym with dumbbells and pull-up bar"'
            }
            accessibilityLabel="Gym Description"
            multiline
            textAlignVertical="top"
            className="h-20 py-2 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onPress={handleAnalyze}
            disabled={isAnalyzing}
            loading={isAnalyzing}
          >
            {isAnalyzing ? (
              <Text className="text-sm font-medium text-foreground">
                Analyzing...
              </Text>
            ) : (
              <>
                <RefreshCw size={16} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">
                  Analyze Equipment
                </Text>
              </>
            )}
          </Button>
          {parserNote && (
            <Text className="rounded bg-muted/50 p-2 text-xs text-muted-foreground">
              {`💡 ${parserNote}`}
            </Text>
          )}
        </View>

        <View className="gap-4">
          <Label>Available Equipment</Label>
          {Object.entries(EQUIPMENT_CATEGORIES).map(([category, items]) => (
            <View key={category} className="gap-2">
              <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {formatCategoryName(category)}
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {items.map((id) => {
                  const isSelected = selected.has(id);
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      onPress={() => toggleEquipment(id)}
                      className={cn(
                        "w-[48%] rounded border px-2 py-1.5",
                        isSelected ? "border-primary bg-primary/10" : "border-border",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm",
                          isSelected ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {EQUIPMENT_DISPLAY_NAMES[id as EquipmentId]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <DialogFooter className="border-t border-border pt-4">
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onPress={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function formatCategoryName(category: string): string {
  return category
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
