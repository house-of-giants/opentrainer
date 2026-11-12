import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { WeightUnit } from "@opentrainer/lib/units";
import {
  DEFAULT_WEIGHT_STEP,
  isValidWeightStep,
  MAX_WEIGHT_STEP,
  type WeightStepSetting,
} from "@opentrainer/lib/weight-step";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";

const PRESETS: Record<WeightUnit, number[]> = {
  lb: [1.25, 2.5, 5, 10],
  kg: [0.5, 1, 1.25, 2.5, 5],
};

interface WeightStepSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  unit: WeightUnit;
  /** The step in use now, saved or default. */
  step: number;
  isCustom: boolean;
  /** Null clears the saved step, so the exercise uses the default. */
  onSave: (setting: WeightStepSetting | null) => void;
}

function WeightStepSheetContent({
  onOpenChange,
  exerciseName,
  unit,
  step,
  isCustom,
  onSave,
}: Omit<WeightStepSheetProps, "open">) {
  const { vibrate } = useHaptic();
  const [draft, setDraft] = useState(step.toString());
  const [error, setError] = useState<string | null>(null);
  const defaultStep = DEFAULT_WEIGHT_STEP[unit];
  const draftStep = Number(draft.trim());

  const save = (setting: WeightStepSetting | null) => {
    vibrate("medium");
    onSave(setting);
    onOpenChange(false);
  };

  const handleSave = () => {
    if (draft.trim() === "" || !isValidWeightStep(draftStep)) {
      setError(`Enter a step more than 0 and at most ${MAX_WEIGHT_STEP}.`);
      return;
    }
    save(draftStep === defaultStep ? null : { weightStep: draftStep, unit });
  };

  const handleDraftChange = (text: string) => {
    setDraft(text);
    setError(null);
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Weight step</SheetTitle>
        <SheetDescription>
          {exerciseName}: how much the weight buttons and “add weight” goals
          change by.
        </SheetDescription>
      </SheetHeader>

      <View className="gap-3 py-4">
        <View className="flex-row gap-1.5">
          {PRESETS[unit].map((preset) => {
            const selected = draftStep === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => {
                  vibrate("light");
                  handleDraftChange(preset.toString());
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={cn(
                  "h-11 flex-1 items-center justify-center rounded-md border",
                  selected
                    ? "border-primary/40 bg-primary/10"
                    : "border-muted-foreground/20",
                )}
              >
                <Text
                  className={cn(
                    "font-mono text-sm tabular-nums",
                    selected
                      ? "font-semibold text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {`${preset} ${unit}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          value={draft}
          onChangeText={handleDraftChange}
          onSubmitEditing={handleSave}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholder={`Custom (${unit})`}
          accessibilityLabel={`Custom step in ${unit}`}
          className="font-mono"
        />
        {error ? (
          <Text accessibilityRole="alert" className="text-sm text-destructive">
            {error}
          </Text>
        ) : null}
      </View>

      <View className="flex-row gap-2 pb-4">
        {isCustom ? (
          <Button
            variant="ghost"
            textClassName="text-muted-foreground"
            onPress={() => save(null)}
          >
            {`Use default (${defaultStep} ${unit})`}
          </Button>
        ) : null}
        <View className="flex-1" />
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onPress={handleSave}>Save</Button>
      </View>
    </>
  );
}

export function WeightStepSheet({ open, ...props }: WeightStepSheetProps) {
  return (
    <Sheet open={open} onOpenChange={props.onOpenChange}>
      {open && <WeightStepSheetContent {...props} />}
    </Sheet>
  );
}
