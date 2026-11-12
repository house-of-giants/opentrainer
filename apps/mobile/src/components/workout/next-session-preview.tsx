import { Text, View } from "react-native";
import {
  describeNextSessionChange,
  firstLiftOfDay,
  formatSetTarget,
  routineDayLabel,
} from "@opentrainer/lib/next-session";
import type { WeightUnit } from "@opentrainer/lib/units";

import { Skeleton } from "@/components/ui/skeleton";
import { useNextLiftTarget, type NextRoutineDay } from "@/hooks/use-next-session";

/** Routine, day, and the first lift's last and next targets. */
export function NextSessionPreview({
  next,
  unit,
}: {
  next: NextRoutineDay;
  unit: WeightUnit;
}) {
  const day = next.routine.days[next.dayIndex];

  return (
    <View className="gap-2">
      <View>
        <Text
          numberOfLines={1}
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
        >
          Next up · {next.routine.name}
        </Text>
        <Text className="mt-1 text-lg font-semibold leading-tight text-foreground">
          {routineDayLabel(next.dayIndex, day.name)}
        </Text>
      </View>
      <FirstLiftTargets day={day} unit={unit} />
    </View>
  );
}

function FirstLiftTargets({
  day,
  unit,
}: {
  day: NextRoutineDay["routine"]["days"][number];
  unit: WeightUnit;
}) {
  const lift = firstLiftOfDay(day);
  const result = useNextLiftTarget(lift?.exerciseName, lift?.targetReps, unit);

  if (!lift) return null;

  return (
    <View>
      <Text className="font-medium text-foreground">{lift.exerciseName}</Text>
      {result === undefined ? (
        <Skeleton className="mt-1 h-4 w-48" />
      ) : (
        <Text className="font-mono text-sm text-muted-foreground">
          {result === null
            ? "No sets logged yet."
            : `Last time ${formatSetTarget(
                result.lastSession.weight,
                result.lastSession.reps,
                result.lastSession.unit,
              )}. Next: ${describeNextSessionChange(result, lift.targetReps).target}.`}
        </Text>
      )}
    </View>
  );
}
