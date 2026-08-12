import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight, MessageSquare } from "lucide-react-native";
import type { Doc } from "@opentrainer/backend";
import { displayWeight, type WeightUnit } from "@opentrainer/lib/units";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/workout/workout-exercise-card.tsx.
function formatHoldDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${mins}m`;
}

const rowClassName =
  "w-full flex-row items-center justify-between rounded-md bg-muted/50 px-3 py-2";

function RowWrapper({
  editable,
  onPress,
  accessibilityLabel,
  children,
}: {
  editable: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  if (!editable) {
    return <View className={rowClassName}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(rowClassName, "active:bg-muted")}
    >
      {children}
    </Pressable>
  );
}

function LiftingSetRow({
  entry,
  preferredUnit,
  editable,
  onEdit,
}: {
  entry: Doc<"entries">;
  preferredUnit: WeightUnit;
  editable: boolean;
  onEdit: () => void;
}) {
  const { colors } = useTheme();
  const lifting = entry.lifting;
  if (!lifting) return null;

  return (
    <RowWrapper
      editable={editable}
      onPress={onEdit}
      accessibilityLabel={`Edit set ${lifting.setNumber} of ${entry.exerciseName}`}
    >
      <View className="flex-row items-center gap-2">
        <Text className="text-sm text-muted-foreground">
          Set {lifting.setNumber}
        </Text>
        {lifting.isWarmup && <Badge variant="outline">Warmup</Badge>}
      </View>
      <View className="flex-row items-center gap-3">
        {lifting.durationSeconds !== undefined ? (
          <Text className="font-mono text-sm font-medium text-foreground">
            {formatHoldDuration(lifting.durationSeconds)} hold
          </Text>
        ) : (
          <>
            <Text className="font-mono text-sm font-medium text-foreground">
              {displayWeight(lifting.weight ?? 0, lifting.unit, preferredUnit)}{" "}
              {preferredUnit}
            </Text>
            <Text className="text-sm text-muted-foreground">x</Text>
            <Text className="font-mono text-sm font-medium text-foreground">
              {lifting.reps ?? 0} reps
            </Text>
          </>
        )}
        {lifting.rpe !== undefined && lifting.rpe > 0 && (
          <Badge variant="secondary">{`RPE ${lifting.rpe}`}</Badge>
        )}
        {editable && <ChevronRight size={16} color={colors.mutedForeground} />}
      </View>
    </RowWrapper>
  );
}

function CardioEntryRow({
  entry,
  preferredUnit,
  editable,
  onEdit,
}: {
  entry: Doc<"entries">;
  preferredUnit: WeightUnit;
  editable: boolean;
  onEdit: () => void;
}) {
  const { colors } = useTheme();
  const cardio = entry.cardio;
  if (!cardio) return null;

  return (
    <RowWrapper
      editable={editable}
      onPress={onEdit}
      accessibilityLabel={`Edit cardio entry for ${entry.exerciseName}`}
    >
      <Text className="text-sm capitalize text-muted-foreground">
        {cardio.mode}
      </Text>
      <View className="flex-row items-center gap-3">
        <Text className="font-mono text-sm font-medium text-foreground">
          {formatHoldDuration(cardio.durationSeconds)}
        </Text>
        {cardio.intensity !== undefined && cardio.intensity > 0 && (
          <Badge variant="secondary">{`Level ${cardio.intensity}`}</Badge>
        )}
        {cardio.vestWeight !== undefined && (
          <Text className="font-mono text-sm font-medium text-foreground">
            Vest{" "}
            {displayWeight(
              cardio.vestWeight,
              cardio.vestWeightUnit ?? "lb",
              preferredUnit,
            )}{" "}
            {preferredUnit}
          </Text>
        )}
        {editable && <ChevronRight size={16} color={colors.mutedForeground} />}
      </View>
    </RowWrapper>
  );
}

function MobilityEntryRow({ entry }: { entry: Doc<"entries"> }) {
  const mobility = entry.mobility;
  if (!mobility) return null;

  const parts: string[] = [];
  if (mobility.sets !== undefined && mobility.sets > 1) {
    parts.push(`${mobility.sets} sets`);
  }
  if (mobility.reps !== undefined && mobility.reps > 0) {
    parts.push(`${mobility.reps} reps`);
  }
  if (mobility.holdSeconds !== undefined && mobility.holdSeconds > 0) {
    parts.push(`${formatHoldDuration(mobility.holdSeconds)} hold`);
  }

  return (
    <View className={rowClassName}>
      <View className="flex-row items-center gap-2">
        <Text className="text-sm text-muted-foreground">Mobility</Text>
        {mobility.perSide && <Badge variant="outline">Per side</Badge>}
      </View>
      <Text className="font-mono text-sm font-medium text-foreground">
        {parts.length > 0 ? parts.join(" · ") : "Done"}
      </Text>
    </View>
  );
}

export function WorkoutExerciseCard({
  exercise,
  note,
  preferredUnit,
  editable,
  onEditSet,
  onEditCardio,
  onEditNote,
}: {
  exercise: { name: string; entries: Doc<"entries">[] };
  note?: string;
  preferredUnit: WeightUnit;
  editable: boolean;
  onEditSet: (entry: Doc<"entries">) => void;
  onEditCardio: (entry: Doc<"entries">) => void;
  onEditNote: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Card className="p-4">
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <Text className="flex-1 font-semibold text-foreground">
          {exercise.name}
        </Text>
        {editable && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onPress={onEditNote}
            accessibilityLabel={`Edit note for ${exercise.name}`}
          >
            <MessageSquare size={16} color={colors.mutedForeground} />
          </Button>
        )}
      </View>
      <View className="gap-2">
        {exercise.entries.map((entry) => {
          if (entry.kind === "lifting" && entry.lifting) {
            return (
              <LiftingSetRow
                key={entry._id}
                entry={entry}
                preferredUnit={preferredUnit}
                editable={editable}
                onEdit={() => onEditSet(entry)}
              />
            );
          }

          if (entry.kind === "cardio" && entry.cardio) {
            return (
              <CardioEntryRow
                key={entry._id}
                entry={entry}
                preferredUnit={preferredUnit}
                editable={editable}
                onEdit={() => onEditCardio(entry)}
              />
            );
          }

          if (entry.kind === "mobility" && entry.mobility) {
            return <MobilityEntryRow key={entry._id} entry={entry} />;
          }

          return null;
        })}
      </View>
      {note ? (
        editable ? (
          <Pressable
            onPress={onEditNote}
            accessibilityRole="button"
            accessibilityLabel={`Edit note for ${exercise.name}`}
            className="mt-3 w-full flex-row items-start gap-2 rounded-md bg-muted/30 px-3 py-2 active:bg-muted"
          >
            <MessageSquare
              size={16}
              color={colors.mutedForeground}
              style={{ marginTop: 2 }}
            />
            <Text className="flex-1 text-sm text-muted-foreground">{note}</Text>
          </Pressable>
        ) : (
          <View className="mt-3 w-full flex-row items-start gap-2 rounded-md bg-muted/30 px-3 py-2">
            <MessageSquare
              size={16}
              color={colors.mutedForeground}
              style={{ marginTop: 2 }}
            />
            <Text className="flex-1 text-sm text-muted-foreground">{note}</Text>
          </View>
        )
      ) : null}
    </Card>
  );
}
