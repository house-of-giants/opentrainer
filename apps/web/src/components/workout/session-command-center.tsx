"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, CheckCircle2, Dumbbell, Gauge, Target } from "lucide-react";

type SessionCommandCenterProps = {
	duration: string;
	exerciseCount: number;
	currentExerciseName?: string;
	nextExerciseName?: string;
	loggedSets: number;
	targetSets: number;
	totalVolume: number;
	unit: "lb" | "kg";
	onJumpToCurrent: () => void;
};

function formatVolume(volume: number, unit: "lb" | "kg") {
	if (volume <= 0) return `0 ${unit}`;
	if (volume >= 1000) return `${Math.round(volume / 100) / 10}k ${unit}`;
	return `${Math.round(volume)} ${unit}`;
}

export function SessionCommandCenter({
	duration,
	exerciseCount,
	currentExerciseName,
	nextExerciseName,
	loggedSets,
	targetSets,
	totalVolume,
	unit,
	onJumpToCurrent,
}: SessionCommandCenterProps) {
	const hasPlan = exerciseCount > 0;
	const progress = targetSets > 0 ? Math.min(100, Math.round((loggedSets / targetSets) * 100)) : loggedSets > 0 ? 100 : 0;
	const setsRemaining = Math.max(targetSets - loggedSets, 0);
	const nextAction = !hasPlan
		? "Add an exercise to get started."
		: setsRemaining === 0
			? "All planned sets logged. Finish up or add extra work."
			: currentExerciseName
				? `Log ${currentExerciseName}`
				: "Choose your first exercise.";

	return (
		<Card className="gap-4 border-primary/30 bg-linear-to-br from-primary/10 via-card to-card p-4 shadow-none">
			<div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
				<div className="min-w-0 flex-1 basis-52">
					<p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
						Session overview
					</p>
					<h2 className="mt-1 truncate text-lg font-semibold sm:text-xl">{nextAction}</h2>
					<p className="mt-1 truncate text-sm text-muted-foreground">
						{nextExerciseName ? `Up next: ${nextExerciseName}.` : "Log sets as you go."}
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-full sm:w-auto sm:shrink-0"
					onClick={onJumpToCurrent}
					disabled={!hasPlan || !currentExerciseName}
				>
					<ArrowDown className="mr-1.5 h-3.5 w-3.5" />
					Current exercise
				</Button>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>{loggedSets}/{targetSets || loggedSets} planned sets</span>
					<span>{progress}%</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-muted">
					<div
						className={cn("h-full rounded-full bg-primary transition-all", progress === 100 && "bg-green-500")}
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
				<Metric icon={Gauge} label="Time" value={duration || "0m"} />
				<Metric icon={CheckCircle2} label="Left" value={targetSets > 0 ? String(setsRemaining) : "—"} />
				<Metric icon={Dumbbell} label="Volume" value={formatVolume(totalVolume, unit)} />
				<Metric icon={Target} label="Moves" value={String(exerciseCount)} />
			</div>
		</Card>
	);
}

function Metric({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Gauge;
	label: string;
	value: string;
}) {
	return (
		<div className="min-w-0 rounded-lg border bg-background/70 px-2 py-2">
			<Icon className="mx-auto mb-1 h-3.5 w-3.5 text-muted-foreground" />
			<p className="truncate font-mono text-sm font-semibold tabular-nums">{value}</p>
			<p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
		</div>
	);
}
