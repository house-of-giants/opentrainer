import { Pressable, Text, View } from "react-native";
import type { EffortScale } from "@opentrainer/lib/effort";

import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/cn";

interface RpeSelectorProps {
  /** Stored RPE. On the RIR scale the chips show 10 - RPE. */
  value: number | null;
  onChange: (value: number | null) => void;
  scale: EffortScale;
}

// One chip per whole RPE, easiest first. On the RIR scale the same chips read
// RIR 4 to 0, so one tap logs either scale.
const EFFORT_STEPS = [
  {
    rpe: 6,
    selectedClass: "border-green-500/30 bg-green-500/20",
    selectedTextClass: "text-green-600 dark:text-green-400",
  },
  {
    rpe: 7,
    selectedClass: "border-lime-500/30 bg-lime-500/20",
    selectedTextClass: "text-lime-600 dark:text-lime-400",
  },
  {
    rpe: 8,
    selectedClass: "border-yellow-500/30 bg-yellow-500/20",
    selectedTextClass: "text-yellow-600 dark:text-yellow-400",
  },
  {
    rpe: 9,
    selectedClass: "border-orange-500/30 bg-orange-500/20",
    selectedTextClass: "text-orange-600 dark:text-orange-400",
  },
  {
    rpe: 10,
    selectedClass: "border-red-500/30 bg-red-500/20",
    selectedTextClass: "text-red-600 dark:text-red-400",
  },
] as const;

function reps(n: number): string {
  return n === 1 ? "1 rep" : `${n} reps`;
}

function caption(value: number | null, scale: EffortScale): string {
  if (value === null) {
    return scale === "rir" ? "Reps in reserve" : "Effort";
  }
  const rir = 10 - value;
  if (scale === "rir" && Number.isInteger(value)) return `${reps(rir)} left`;
  const left =
    rir >= 4
      ? "4+ reps left"
      : Number.isInteger(rir)
        ? `${reps(rir)} left`
        : `${Math.floor(rir)}–${Math.ceil(rir)} reps left`;
  return `RPE ${value} · ${left}`;
}

export function RpeSelector({ value, onChange, scale }: RpeSelectorProps) {
  const { vibrate } = useHaptic();

  const select = (next: number | null) => {
    vibrate("light");
    onChange(next);
  };

  // RPE scale: a whole-number chip stays lit for its half step (8 for 8.5).
  // RIR scale: only an exact match lights, so RPE 8.5 never reads as RIR 2.
  const litStep =
    value === null
      ? undefined
      : EFFORT_STEPS.find((step) =>
          scale === "rpe"
            ? step.rpe === Math.floor(value)
            : step.rpe === value,
        );
  const isHalf = value !== null && !Number.isInteger(value);
  const canHalf = value !== null && value >= 6 && value < 10;

  return (
    <View className="flex-col gap-1.5">
      <Text className="text-center text-xs font-medium text-muted-foreground">
        {caption(value, scale)}
        {value === null ? (
          <Text className="opacity-60"> (optional)</Text>
        ) : null}
      </Text>
      <View className="flex-row gap-1.5">
        {EFFORT_STEPS.map((step) => {
          const selected = step === litStep;
          const label = scale === "rir" ? `${10 - step.rpe}` : `${step.rpe}`;
          return (
            <Pressable
              key={step.rpe}
              onPress={() => select(value === step.rpe ? null : step.rpe)}
              accessibilityRole="button"
              accessibilityLabel={
                scale === "rir"
                  ? `${reps(10 - step.rpe)} in reserve`
                  : `RPE ${label}`
              }
              accessibilityState={{ selected }}
              className={cn(
                "flex-1 items-center justify-center rounded-md border py-2",
                selected ? step.selectedClass : "border-muted-foreground/20",
              )}
            >
              <Text
                className={cn(
                  "text-sm font-semibold",
                  selected ? step.selectedTextClass : "text-muted-foreground",
                )}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
        {scale === "rpe" ? (
          <Pressable
            onPress={() =>
              value !== null &&
              select(isHalf ? Math.floor(value) : value + 0.5)
            }
            disabled={!canHalf}
            accessibilityRole="button"
            accessibilityLabel="Half step"
            accessibilityState={{ selected: isHalf, disabled: !canHalf }}
            className={cn(
              "flex-1 items-center justify-center rounded-md border py-2",
              isHalf && litStep
                ? litStep.selectedClass
                : "border-muted-foreground/20",
              !canHalf && "opacity-40",
            )}
          >
            <Text
              className={cn(
                "text-sm font-semibold",
                isHalf && litStep
                  ? litStep.selectedTextClass
                  : "text-muted-foreground",
              )}
            >
              +½
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
