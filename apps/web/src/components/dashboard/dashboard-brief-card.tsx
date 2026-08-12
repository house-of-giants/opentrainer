"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import { ArrowRight, CalendarClock, Dumbbell, Flame } from "lucide-react";

type DashboardBriefCardProps = {
	weeklyWorkoutCount: number;
	weeklyGoal: number;
	weeklyTotalSets: number;
	weeklyTotalDuration?: number;
	hasActiveWorkout: boolean;
	hasHistory: boolean;
	onStartWorkout: () => void;
	onContinueWorkout: () => void;
};

export function DashboardBriefCard({
	weeklyWorkoutCount,
	weeklyGoal,
	weeklyTotalSets,
	weeklyTotalDuration,
	hasActiveWorkout,
	hasHistory,
	onStartWorkout,
	onContinueWorkout,
}: DashboardBriefCardProps) {
	const workoutsLeft = Math.max(weeklyGoal - weeklyWorkoutCount, 0);
	const brief = hasActiveWorkout
		? "Workout in progress. Pick up where you left off."
		: workoutsLeft === 0
			? "Weekly goal complete. Anything extra is a bonus."
			: hasHistory
				? `${workoutsLeft} session${workoutsLeft === 1 ? "" : "s"} left to hit this week's goal.`
				: "Log your first workout to start building history.";
	const cta = hasActiveWorkout ? "Continue workout" : "Start workout";
	const onClick = hasActiveWorkout ? onContinueWorkout : onStartWorkout;

	return (
		<Card className="gap-4 overflow-hidden border-primary/30 bg-linear-to-br from-primary/10 via-card to-card p-4 shadow-none">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
				<div className="min-w-0">
					<p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
						Today&apos;s brief
					</p>
					<h2 className="mt-1 text-lg font-semibold leading-tight sm:text-xl">{brief}</h2>
				</div>
				<Button
					type="button"
					size="sm"
					onClick={onClick}
					className="w-full sm:w-auto sm:shrink-0"
				>
					{cta}
					<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
				</Button>
			</div>

			<div className="grid grid-cols-3 gap-2">
				<BriefMetric icon={Flame} label="Week" value={`${weeklyWorkoutCount}/${weeklyGoal}`} />
				<BriefMetric icon={Dumbbell} label="Sets" value={String(weeklyTotalSets)} />
				<BriefMetric icon={CalendarClock} label="Time" value={formatDuration(weeklyTotalDuration)} />
			</div>
		</Card>
	);
}

function BriefMetric({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Flame;
	label: string;
	value: string;
}) {
	return (
		<div className="min-w-0 rounded-lg border bg-background/70 px-2.5 py-2 sm:px-3">
			<Icon className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
			<p className="truncate font-mono text-sm font-semibold tabular-nums sm:text-base">
				{value}
			</p>
			<p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
		</div>
	);
}
