"use client";

import { useState } from "react";
import { Check, MessageSquare, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoteSheet } from "./note-sheet";
import { RpeSelector } from "./rpe-selector";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";

type ExerciseStatus = "completed" | "current" | "upcoming";

export interface TimedSetData {
	entryId?: string;
	setNumber: number;
	durationSeconds: number;
	rpe?: number | null;
	isWarmup?: boolean;
}

interface TimedExerciseAccordionProps {
	exerciseName: string;
	sets: TimedSetData[];
	status: ExerciseStatus;
	targetSets?: number;
	targetDurationSeconds?: number;
	lastSession?: {
		date: string;
		sets: Array<{ durationSeconds: number }>;
	};
	note?: string;
	onAddSet: (set: { durationSeconds: number; rpe?: number | null }) => Promise<void>;
	onEditSet?: (set: TimedSetData) => void;
	onSwap?: () => void;
	onNoteChange?: (note: string) => void;
	onSelect?: () => void;
}

function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatHistoryDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

export function TimedExerciseAccordion({
	exerciseName,
	sets,
	status,
	targetSets,
	targetDurationSeconds = 30,
	lastSession,
	note,
	onAddSet,
	onEditSet,
	onSwap,
	onNoteChange,
	onSelect,
}: TimedExerciseAccordionProps) {
	const { vibrate } = useHaptic();
	const [durationSeconds, setDurationSeconds] = useState(
		sets.at(-1)?.durationSeconds ?? targetDurationSeconds
	);
	const [rpe, setRpe] = useState<number | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showNoteSheet, setShowNoteSheet] = useState(false);

	const loggedCount = sets.length;
	const isComplete = targetSets !== undefined && loggedCount >= targetSets;
	const isExpanded = status === "current";

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!Number.isFinite(durationSeconds) || durationSeconds < 1) {
			setError("Enter a duration of at least 1 second.");
			return;
		}

		setError(null);
		setIsSubmitting(true);
		try {
			await onAddSet({ durationSeconds, rpe });
			setRpe(null);
			vibrate("success");
		} catch {
			setError("This set could not be saved. Try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div
			className={cn(
				"rounded-lg border transition-all duration-300 ease-out",
				status === "current" && "border-primary/30 bg-card shadow-lg ring-1 ring-primary/10",
				status === "completed" && "border-transparent bg-muted/20",
				status === "upcoming" && "border-muted/50 bg-card/50 opacity-70"
			)}
		>
			<div className="flex items-center gap-3 p-4">
				<button
					type="button"
					onClick={status === "current" ? undefined : onSelect}
					disabled={status === "current" || !onSelect}
					className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<span
						className={cn(
							"flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-bold",
							status === "current" && "bg-primary text-primary-foreground",
							status === "completed" && "bg-primary/20 text-primary",
							status === "upcoming" && "bg-muted text-muted-foreground"
						)}
					>
						{status === "completed" ? <Check className="h-3.5 w-3.5" /> : loggedCount}
					</span>
					<span className="min-w-0 flex-1">
						<span className="block truncate font-semibold">{exerciseName}</span>
						<span className="block text-xs text-muted-foreground">
							Timed hold · {formatDuration(targetDurationSeconds)} target
						</span>
					</span>
					<span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
						{targetSets === undefined ? loggedCount : `${loggedCount}/${targetSets}`}
					</span>
				</button>

				{isExpanded && onSwap && (
					<Button variant="ghost" size="icon" className="h-10 w-10" onClick={onSwap}>
						<Shuffle className="h-4 w-4" />
						<span className="sr-only">Swap exercise</span>
					</Button>
				)}
				{isExpanded && onNoteChange && (
					<Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setShowNoteSheet(true)}>
						<MessageSquare className={cn("h-4 w-4", note && "fill-primary text-primary")} />
						<span className="sr-only">Add note</span>
					</Button>
				)}
			</div>

			{isExpanded && (
				<form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
					{lastSession && (
						<p className="rounded border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
							Last {formatHistoryDate(lastSession.date)}: {lastSession.sets.map((set) => formatDuration(set.durationSeconds)).join(", ")}
						</p>
					)}

					{sets.length > 0 && (
						<div className="space-y-1" aria-label="Logged timed sets">
							{sets.map((set) => (
								<button
									key={set.setNumber}
									type="button"
									onClick={() => onEditSet?.(set)}
									disabled={!onEditSet || !set.entryId}
									className="flex min-h-11 w-full items-center justify-between rounded border border-transparent bg-muted/40 px-3 text-sm enabled:hover:border-border enabled:hover:bg-muted"
								>
									<span className="text-muted-foreground">Set {set.setNumber}</span>
									<span className="font-mono font-medium tabular-nums">{formatDuration(set.durationSeconds)}</span>
									<Check className="h-4 w-4 text-primary" />
								</button>
							))}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor={`duration-${exerciseName}`}>Duration (seconds)</Label>
						<Input
							id={`duration-${exerciseName}`}
							name="durationSeconds"
							type="number"
							inputMode="numeric"
							enterKeyHint="done"
							min={1}
							max={3600}
							required
							value={durationSeconds}
							onChange={(event) => {
								setError(null);
								setDurationSeconds(Number(event.target.value));
							}}
							aria-describedby={error ? `duration-error-${exerciseName}` : undefined}
							className="h-12 text-center font-mono text-lg"
						/>
					</div>

					<RpeSelector value={rpe} onChange={setRpe} />

					{error && (
						<p id={`duration-error-${exerciseName}`} role="alert" className="text-sm text-destructive">
							{error}
						</p>
					)}

					<Button type="submit" size="lg" className="h-12 w-full" disabled={isComplete || isSubmitting}>
						{isComplete
							? "COMPLETE"
							: isSubmitting
								? "SAVING…"
								: targetSets === undefined
									? `LOG SET ${loggedCount + 1}`
									: `LOG SET ${loggedCount + 1}/${targetSets}`}
					</Button>
				</form>
			)}

			{onNoteChange && (
				<NoteSheet
					open={showNoteSheet}
					onOpenChange={setShowNoteSheet}
					exerciseName={exerciseName}
					note={note ?? ""}
					onSave={onNoteChange}
				/>
			)}
		</div>
	);
}
