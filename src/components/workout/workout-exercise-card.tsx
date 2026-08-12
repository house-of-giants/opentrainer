"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, MessageSquare } from "lucide-react";
import { Doc } from "../../../convex/_generated/dataModel";
import { displayWeight, type WeightUnit } from "@/lib/units";

function formatHoldDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${mins}m`;
}

function RowWrapper({
  editable,
  onClick,
  children,
}: {
  editable: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const className =
    "flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm";

  if (!editable) {
    return <div className={className}>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} text-left transition-colors hover:bg-muted active:bg-muted`}
    >
      {children}
    </button>
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
  const lifting = entry.lifting;
  if (!lifting) return null;

  return (
    <RowWrapper editable={editable} onClick={onEdit}>
      <span className="text-muted-foreground">
        Set {lifting.setNumber}
        {lifting.isWarmup && (
          <Badge variant="outline" className="ml-2 text-xs">
            Warmup
          </Badge>
        )}
      </span>
      <div className="flex items-center gap-3">
        {lifting.durationSeconds !== undefined ? (
          <span className="font-medium font-mono tabular-nums">
            {formatHoldDuration(lifting.durationSeconds)} hold
          </span>
        ) : (
          <>
            <span className="font-medium font-mono tabular-nums">
              {displayWeight(lifting.weight ?? 0, lifting.unit, preferredUnit)}{" "}
              {preferredUnit}
            </span>
            <span className="text-muted-foreground">x</span>
            <span className="font-medium font-mono tabular-nums">
              {lifting.reps ?? 0} reps
            </span>
          </>
        )}
        {lifting.rpe && (
          <Badge variant="secondary" className="text-xs">
            RPE {lifting.rpe}
          </Badge>
        )}
        {editable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
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
  const cardio = entry.cardio;
  if (!cardio) return null;

  return (
    <RowWrapper editable={editable} onClick={onEdit}>
      <span className="text-muted-foreground capitalize">{cardio.mode}</span>
      <div className="flex items-center gap-3">
        <span className="font-medium font-mono tabular-nums">
          {formatHoldDuration(cardio.durationSeconds)}
        </span>
        {cardio.intensity && (
          <Badge variant="secondary" className="text-xs">
            Level {cardio.intensity}
          </Badge>
        )}
        {cardio.vestWeight !== undefined && (
          <span className="font-medium font-mono tabular-nums">
            Vest{" "}
            {displayWeight(
              cardio.vestWeight,
              cardio.vestWeightUnit ?? "lb",
              preferredUnit
            )}{" "}
            {preferredUnit}
          </span>
        )}
        {editable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </RowWrapper>
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
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold">{exercise.name}</h3>
        {editable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onEditNote}
            aria-label={`Edit note for ${exercise.name}`}
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>
      <div className="space-y-2">
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

          return null;
        })}
      </div>
      {note &&
        (editable ? (
          <button
            type="button"
            onClick={onEditNote}
            className="mt-3 flex w-full items-start gap-2 rounded-md bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 active:bg-muted"
          >
            <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{note}</span>
          </button>
        ) : (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm">
            <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{note}</span>
          </div>
        ))}
    </Card>
  );
}
