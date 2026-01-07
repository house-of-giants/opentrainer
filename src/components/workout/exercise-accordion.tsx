"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SetStepper } from "./set-stepper";
import { NoteSheet } from "./note-sheet";
import { useHaptic } from "@/hooks/use-haptic";
import {
	Check,
	ChevronDown,
	ChevronUp,
	MessageSquare,
	Shuffle,
	Dumbbell,
	User,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ExerciseStatus = "completed" | "current" | "upcoming";

interface SetData {
	entryId?: string;
	setNumber: number;
	reps: number;
	weight: number;
	unit: "lb" | "kg";
	isBodyweight?: boolean;
}

type WeightMode = "weighted-only" | "bodyweight-only" | "bodyweight-optional";

function getWeightMode(equipment?: string[]): WeightMode {
	if (!equipment || equipment.length === 0) {
		return "bodyweight-optional";
	}
	const hasBodyweight = equipment.includes("bodyweight");
	const hasOtherEquipment = equipment.some((e) => e !== "bodyweight");

	if (hasBodyweight && !hasOtherEquipment) {
		return "bodyweight-only";
	}
	if (hasBodyweight && hasOtherEquipment) {
		return "bodyweight-optional";
	}
	return "weighted-only";
}

interface GhostSetData {
	weight: number;
	reps: number;
	rpe: number | null;
	date: string;
	unit: "lb" | "kg";
}

interface ProgressionSuggestionData {
	type: "increase_weight" | "increase_reps" | "hold" | "deload";
	targetWeight: number | null;
	targetReps: number | null;
	reasoning: string | null;
}

interface ExerciseAccordionProps {
	exerciseName: string;
	sets: SetData[];
	status: ExerciseStatus;
	equipment?: string[];
	defaultWeight?: number;
	defaultReps?: number;
	unit?: "lb" | "kg";
	targetSets?: number;
	targetReps?: string;
	note?: string;
	lastSession?: GhostSetData;
	progressionSuggestion?: ProgressionSuggestionData;
	onAddSet: (set: Omit<SetData, "setNumber" | "entryId">) => void;
	onEditSet?: (set: SetData) => void;
	onSwap?: () => void;
	onNoteChange?: (note: string) => void;
	onSelect?: () => void;
}

function SegmentedProgress({
	current,
	total,
}: {
	current: number;
	total: number;
}) {
	return (
		<div className="flex gap-0.5">
			{Array.from({ length: total }, (_, i) => (
				<div
					key={i}
					className={cn(
						"h-1.5 w-3 transition-colors duration-200",
						i === 0 && "rounded-l-sm",
						i === total - 1 && "rounded-r-sm",
						i < current ? "bg-primary" : "bg-muted-foreground/20"
					)}
				/>
			))}
		</div>
	);
}

function SetRowCompact({ sets }: { sets: SetData[] }) {
	if (sets.length === 0) return null;

	const weight = sets[0].weight;
	const unit = sets[0].unit;
	const isBodyweight = sets[0].isBodyweight;
	const reps = sets.map((s) => s.reps).join(",");

	const weightDisplay =
		isBodyweight && weight === 0
			? "BW"
			: isBodyweight && weight > 0
				? `BW+${weight}`
				: `${weight}`;

	return (
		<span className="font-mono text-xs text-muted-foreground tabular-nums">
			{weightDisplay}
			{!isBodyweight || weight > 0 ? ` ${unit}` : ""} x {reps}
		</span>
	);
}

function formatWeight(
	weight: number,
	unit: string,
	isBodyweight?: boolean
): string {
	if (isBodyweight && weight === 0) return "BW";
	if (isBodyweight && weight > 0) return `BW+${weight} ${unit}`;
	return `${weight} ${unit}`;
}

function GhostSetBox({
	lastSession,
	suggestion,
	loggedSets,
	isCompact,
	onToggle,
}: {
	lastSession: GhostSetData;
	suggestion?: ProgressionSuggestionData;
	loggedSets?: SetData[];
	isCompact?: boolean;
	onToggle?: () => void;
}) {
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const now = new Date();
		const diffDays = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
		);
		if (diffDays === 0) return "Today";
		if (diffDays === 1) return "Yesterday";
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
	};

	const goalDisplay =
		suggestion?.targetWeight && suggestion?.targetReps
			? `${suggestion.targetWeight}${lastSession.unit}×${suggestion.targetReps}`
			: `${lastSession.weight}${lastSession.unit}×${lastSession.reps}`;

	const typeColor = cn(
		suggestion?.type === "increase_weight" &&
			"text-green-600 dark:text-green-400",
		suggestion?.type === "increase_reps" && "text-blue-600 dark:text-blue-400",
		suggestion?.type === "hold" && "text-muted-foreground",
		suggestion?.type === "deload" && "text-orange-600 dark:text-orange-400",
		!suggestion && "text-muted-foreground"
	);

	if (isCompact) {
		const lastLoggedSet =
			loggedSets && loggedSets.length > 0
				? loggedSets[loggedSets.length - 1]
				: null;
		const setsSummary = lastLoggedSet
			? `Set ${lastLoggedSet.setNumber}: ${formatWeight(lastLoggedSet.weight, lastLoggedSet.unit, lastLoggedSet.isBodyweight)}×${lastLoggedSet.reps}`
			: null;

		return (
			<button
				type="button"
				onClick={onToggle}
				className={cn(
					"w-full rounded-md border border-dashed border-muted-foreground/20 bg-muted/10 px-3 py-2 mb-3",
					"flex items-center justify-between gap-2 text-xs",
					"hover:bg-muted/20 transition-colors"
				)}
			>
				<div className="flex items-center gap-2 min-w-0">
					<span className={cn("font-medium shrink-0", typeColor)}>Goal</span>
					<span className="font-mono tabular-nums text-foreground">
						{goalDisplay}
					</span>
					{setsSummary && (
						<>
							<span className="text-muted-foreground/50">•</span>
							<span className="font-mono tabular-nums text-muted-foreground truncate">
								{setsSummary}
							</span>
						</>
					)}
				</div>
				<ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
			</button>
		);
	}

	const rpeDisplay = lastSession.rpe ? `@ RPE ${lastSession.rpe}` : "";
	const targetDisplay =
		suggestion?.targetWeight && suggestion?.targetReps
			? `${suggestion.targetWeight} ${lastSession.unit} × ${suggestion.targetReps}`
			: null;

	return (
		<div
			className={cn(
				"rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 p-3 mb-3",
				onToggle && "cursor-pointer hover:bg-muted/30 transition-colors"
			)}
			onClick={onToggle}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span className="opacity-60">
						Last ({formatDate(lastSession.date)}):
					</span>
					<span className="font-mono tabular-nums">
						{lastSession.weight} {lastSession.unit} × {lastSession.reps}{" "}
						{rpeDisplay}
					</span>
				</div>
				{onToggle && (
					<ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
				)}
			</div>
			{targetDisplay && suggestion && (
				<div className="flex items-center gap-2 text-xs mt-1">
					<span className={cn("font-medium", typeColor)}>Goal:</span>
					<span className="font-mono tabular-nums text-foreground">
						{targetDisplay}
					</span>
				</div>
			)}
			{suggestion?.reasoning && (
				<p className="text-xs text-muted-foreground/70 mt-1.5 italic">
					{suggestion.reasoning}
				</p>
			)}
		</div>
	);
}

function GoalBadge({
	lastSession,
	suggestion,
}: {
	lastSession: GhostSetData;
	suggestion?: ProgressionSuggestionData;
}) {
	if (!suggestion?.targetWeight || !suggestion?.targetReps) return null;

	const weightDiff = suggestion.targetWeight - lastSession.weight;
	const repsDiff = suggestion.targetReps - lastSession.reps;

	let badgeText: string;
	if (suggestion.type === "deload") {
		badgeText = `−${Math.abs(weightDiff)} ${lastSession.unit}`;
	} else if (weightDiff > 0) {
		badgeText = `+${weightDiff} ${lastSession.unit}`;
	} else if (repsDiff > 0) {
		badgeText = `+${repsDiff} rep${repsDiff > 1 ? "s" : ""}`;
	} else {
		badgeText = "Hold";
	}

	const badgeColor = cn(
		"text-[10px] font-medium px-1.5 py-0.5 rounded",
		suggestion.type === "increase_weight" &&
			"bg-green-500/10 text-green-600 dark:text-green-400",
		suggestion.type === "increase_reps" &&
			"bg-blue-500/10 text-blue-600 dark:text-blue-400",
		suggestion.type === "hold" && "bg-muted text-muted-foreground",
		suggestion.type === "deload" &&
			"bg-orange-500/10 text-orange-600 dark:text-orange-400"
	);

	return <span className={badgeColor}>{badgeText}</span>;
}

export function ExerciseAccordion({
	exerciseName,
	sets,
	status,
	equipment,
	defaultWeight = 45,
	defaultReps = 8,
	unit = "lb",
	targetSets,
	targetReps,
	note,
	lastSession,
	progressionSuggestion,
	onAddSet,
	onEditSet,
	onSwap,
	onNoteChange,
	onSelect,
}: ExerciseAccordionProps) {
	const weightMode = getWeightMode(equipment);

	const getInitialWeight = () => {
		if (sets.length > 0) return sets[sets.length - 1].weight;
		if (progressionSuggestion?.targetWeight)
			return progressionSuggestion.targetWeight;
		if (lastSession) return lastSession.weight;
		return defaultWeight;
	};

	const getInitialReps = () => {
		if (sets.length > 0) return sets[sets.length - 1].reps;
		if (progressionSuggestion?.targetReps)
			return progressionSuggestion.targetReps;
		if (lastSession) return lastSession.reps;
		return defaultReps;
	};

	const [weight, setWeight] = useState(getInitialWeight());
	const [reps, setReps] = useState(getInitialReps());
	const [isBodyweight, setIsBodyweight] = useState(
		weightMode === "bodyweight-only" ||
			(sets.length > 0 && sets[sets.length - 1].isBodyweight === true)
	);
	const [showAddedWeight, setShowAddedWeight] = useState(false);
	const [showNoteSheet, setShowNoteSheet] = useState(false);
	const [ghostExpanded, setGhostExpanded] = useState(true);
	const { vibrate } = useHaptic();

	const isExpanded = status === "current";
	const loggedCount = sets.length;
	const isComplete = targetSets !== undefined && loggedCount >= targetSets;

	const handleAddSet = () => {
		vibrate("success");
		const effectiveWeight = isBodyweight && !showAddedWeight ? 0 : weight;
		onAddSet({ reps, weight: effectiveWeight, unit, isBodyweight });
	};

	const handleBodyweightToggle = () => {
		vibrate("light");
		setIsBodyweight(!isBodyweight);
		if (!isBodyweight) {
			setShowAddedWeight(false);
		}
	};

	const handleCardClick = () => {
		if (status !== "current" && onSelect) {
			vibrate("light");
			onSelect();
		}
	};

	const isClickable = status !== "current" && onSelect;

	return (
		<div
			onClick={isClickable ? handleCardClick : undefined}
			className={cn(
				"rounded-lg border transition-all duration-300 ease-out",
				status === "current" && [
					"bg-card shadow-lg",
					"border-primary/30",
					"ring-1 ring-primary/10",
				],
				status === "completed" && [
					"bg-muted/20 border-transparent",
					isClickable && "hover:bg-muted/30 hover:border-muted cursor-pointer",
				],
				status === "upcoming" && [
					"bg-card/50 border-muted/50 opacity-70",
					isClickable && "hover:opacity-90 hover:border-muted cursor-pointer",
				]
			)}
		>
			<div
				className={cn(
					"flex items-center justify-between gap-3 p-4",
					status === "current" && "pb-2"
				)}
			>
				<div className="flex items-center gap-3 min-w-0 flex-1">
					<div
						className={cn(
							"flex h-6 w-6 shrink-0 items-center justify-center rounded",
							"font-mono text-xs font-bold",
							"transition-colors duration-200",
							status === "completed" && "bg-primary/20 text-primary",
							status === "current" && "bg-primary text-primary-foreground",
							status === "upcoming" && "bg-muted text-muted-foreground"
						)}
					>
						{status === "completed" ? (
							<Check className="h-3.5 w-3.5" />
						) : (
							<span>{loggedCount}</span>
						)}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<h3
								className={cn(
									"font-semibold truncate transition-all duration-200",
									status === "current" && "text-lg",
									status === "completed" && "text-sm text-muted-foreground",
									status === "upcoming" && "text-base"
								)}
							>
								{exerciseName}
							</h3>
							{status === "current" && lastSession && progressionSuggestion && (
								<GoalBadge
									lastSession={lastSession}
									suggestion={progressionSuggestion}
								/>
							)}
							{status === "current" && onSwap && (
								<Button
									variant="ghost"
									size="sm"
									className="h-7 w-7 shrink-0 p-0"
									onClick={(e) => {
										e.stopPropagation();
										onSwap();
									}}
								>
									<Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
									<span className="sr-only">Swap exercise</span>
								</Button>
							)}
							{status === "current" && onNoteChange && (
								<Button
									variant="ghost"
									size="sm"
									className="h-7 w-7 shrink-0 p-0"
									onClick={(e) => {
										e.stopPropagation();
										vibrate("light");
										setShowNoteSheet(true);
									}}
								>
									<MessageSquare
										className={cn(
											"h-3.5 w-3.5",
											note
												? "fill-primary text-primary"
												: "text-muted-foreground"
										)}
									/>
									<span className="sr-only">Add note</span>
								</Button>
							)}
						</div>

						{status === "completed" && sets.length > 0 && (
							<SetRowCompact sets={sets} />
						)}

						{status === "current" && targetSets && (
							<div className="mt-1">
								<SegmentedProgress current={loggedCount} total={targetSets} />
							</div>
						)}
					</div>
				</div>

				<div
					className={cn(
						"shrink-0 font-mono text-sm tabular-nums",
						status === "completed" && "text-muted-foreground",
						status === "current" && "text-foreground",
						status === "upcoming" && "text-muted-foreground"
					)}
				>
					{targetSets !== undefined ? (
						<span>
							{loggedCount}/{targetSets}
						</span>
					) : (
						<span>{loggedCount}</span>
					)}
				</div>
			</div>

			<div
				className={cn(
					"grid transition-[grid-template-rows] duration-300 ease-out",
					isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
				)}
			>
				<div className="overflow-hidden">
					<div className="space-y-3 px-4 pb-4 pt-2">
						{lastSession && (
							<GhostSetBox
								lastSession={lastSession}
								suggestion={progressionSuggestion}
								loggedSets={sets}
								isCompact={sets.length > 0 && !ghostExpanded}
								onToggle={
									sets.length > 0
										? () => {
												vibrate("light");
												setGhostExpanded(!ghostExpanded);
											}
										: undefined
								}
							/>
						)}
						{targetSets !== undefined ? (
							<div className="space-y-1.5">
								{Array.from({ length: targetSets }, (_, i) => i + 1).map(
									(setNumber) => {
										const loggedSet = sets.find(
											(s) => s.setNumber === setNumber
										);
										if (loggedSet) {
											return (
												<button
													key={setNumber}
													type="button"
													onClick={() =>
														onEditSet &&
														loggedSet.entryId &&
														onEditSet(loggedSet)
													}
													disabled={!onEditSet || !loggedSet.entryId}
													className={cn(
														"flex w-full items-center justify-between rounded px-3 py-2",
														"bg-muted/40 text-sm transition-colors duration-150",
														"border border-transparent",
														onEditSet &&
															loggedSet.entryId &&
															"hover:bg-muted hover:border-border cursor-pointer"
													)}
												>
													<span className="font-mono text-muted-foreground">
														{String(setNumber).padStart(2, "0")}
													</span>
													<span className="font-mono tabular-nums">
														{loggedSet.isBodyweight && loggedSet.weight === 0
															? `BW x ${loggedSet.reps}`
															: loggedSet.isBodyweight && loggedSet.weight > 0
																? `BW+${loggedSet.weight} ${loggedSet.unit} x ${loggedSet.reps}`
																: `${loggedSet.weight} ${loggedSet.unit} x ${loggedSet.reps}`}
													</span>
													<Check className="h-4 w-4 text-primary" />
												</button>
											);
										} else {
											const displayReps =
												targetReps || defaultReps?.toString() || "—";
											return (
												<div
													key={setNumber}
													className={cn(
														"flex items-center justify-between rounded px-3 py-2",
														"border border-dashed border-muted-foreground/20 text-sm",
														"text-muted-foreground/50"
													)}
												>
													<span className="font-mono">
														{String(setNumber).padStart(2, "0")}
													</span>
													<span className="font-mono tabular-nums">
														— x {displayReps}
													</span>
													<div className="h-4 w-4" />
												</div>
											);
										}
									}
								)}
							</div>
						) : sets.length > 0 ? (
							<div className="space-y-1.5">
								{sets.map((set) => (
									<button
										key={set.setNumber}
										type="button"
										onClick={() => onEditSet && set.entryId && onEditSet(set)}
										disabled={!onEditSet || !set.entryId}
										className={cn(
											"flex w-full items-center justify-between rounded px-3 py-2",
											"bg-muted/40 text-sm transition-colors duration-150",
											"border border-transparent",
											onEditSet &&
												set.entryId &&
												"hover:bg-muted hover:border-border cursor-pointer"
										)}
									>
										<span className="font-mono text-muted-foreground">
											{String(set.setNumber).padStart(2, "0")}
										</span>
										<span className="font-mono tabular-nums">
											{set.isBodyweight && set.weight === 0
												? `BW x ${set.reps}`
												: set.isBodyweight && set.weight > 0
													? `BW+${set.weight} ${set.unit} x ${set.reps}`
													: `${set.weight} ${set.unit} x ${set.reps}`}
										</span>
										<Check className="h-4 w-4 text-primary" />
									</button>
								))}
							</div>
						) : null}

						{weightMode === "bodyweight-optional" && (
							<div className="pt-2">
								<div className="flex rounded-md border bg-muted/20 p-0.5">
									<button
										type="button"
										onClick={() => {
											if (isBodyweight) handleBodyweightToggle();
										}}
										className={cn(
											"flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-2",
											"text-xs font-medium transition-all duration-200",
											!isBodyweight
												? "bg-background text-foreground shadow-sm"
												: "text-muted-foreground hover:text-foreground"
										)}
									>
										<Dumbbell className="h-3.5 w-3.5" />
										WEIGHTED
									</button>
									<button
										type="button"
										onClick={() => {
											if (!isBodyweight) handleBodyweightToggle();
										}}
										className={cn(
											"flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-2",
											"text-xs font-medium transition-all duration-200",
											isBodyweight
												? "bg-background text-foreground shadow-sm"
												: "text-muted-foreground hover:text-foreground"
										)}
									>
										<User className="h-3.5 w-3.5" />
										BODYWEIGHT
									</button>
								</div>
							</div>
						)}

						{weightMode === "bodyweight-only" && (
							<div className="pt-2">
								<button
									type="button"
									onClick={() => {
										vibrate("light");
										setShowAddedWeight(!showAddedWeight);
										if (showAddedWeight) setWeight(0);
									}}
									className={cn(
										"flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2",
										"text-xs font-medium transition-all duration-200",
										showAddedWeight
											? "border-primary/30 bg-primary/5 text-primary"
											: "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
									)}
								>
									<Dumbbell className="h-3.5 w-3.5" />
									{showAddedWeight
										? "ADDED WEIGHT"
										: "+ ADD WEIGHT (VEST/BELT)"}
									{showAddedWeight ? (
										<ChevronUp className="h-3.5 w-3.5 ml-auto" />
									) : (
										<ChevronDown className="h-3.5 w-3.5 ml-auto" />
									)}
								</button>
							</div>
						)}

						<div className="flex flex-wrap items-end justify-center gap-4 pt-3">
							{(weightMode === "weighted-only" ||
								(weightMode === "bodyweight-optional" && !isBodyweight) ||
								(weightMode === "bodyweight-only" && showAddedWeight)) && (
								<SetStepper
									label={weightMode === "bodyweight-only" ? "ADDED" : "WEIGHT"}
									value={weight}
									onChange={setWeight}
									step={5}
									min={0}
									unit={unit}
								/>
							)}
							<SetStepper
								label="REPS"
								value={reps}
								onChange={setReps}
								step={1}
								min={1}
								max={100}
							/>
						</div>

						<Button
							size="lg"
							className={cn(
								"mt-4 h-14 w-full text-base font-semibold tracking-wide",
								"transition-all duration-200"
							)}
							onClick={handleAddSet}
							disabled={isComplete}
						>
							{isComplete
								? "COMPLETE"
								: targetSets !== undefined
									? `LOG SET ${loggedCount + 1}/${targetSets}`
									: `LOG SET ${loggedCount + 1}`}
						</Button>
					</div>
				</div>
			</div>

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
