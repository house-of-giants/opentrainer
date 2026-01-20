"use client";

import { useState, useRef, useEffect } from "react";
import Marquee from "react-fast-marquee";
import { Button } from "@/components/ui/button";
import { SetStepper } from "./set-stepper";
import { RpeSelector } from "./rpe-selector";
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
	rpe?: number | null;
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
	onAddSet: (set: Omit<SetData, "setNumber" | "entryId"> & { rpe?: number | null }) => void;
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

function GhostSetBox({
	lastSession,
	suggestion,
	isCompact,
	onToggle,
}: {
	lastSession: GhostSetData;
	suggestion?: ProgressionSuggestionData;
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
		return (
			<button
				type="button"
				onClick={onToggle}
				className={cn(
					"w-full rounded border border-dashed border-muted-foreground/20 bg-muted/10 px-2 py-1.5 mb-2",
					"flex items-center justify-between gap-2 text-xs",
					"hover:bg-muted/20 transition-colors"
				)}
			>
				<div className="flex items-center gap-1.5 min-w-0">
					<span className={cn("font-medium shrink-0", typeColor)}>Goal</span>
					<span className="font-mono tabular-nums text-foreground">
						{goalDisplay}
					</span>
				</div>
				<ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
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
				"rounded border border-dashed border-muted-foreground/30 bg-muted/20 px-2.5 py-2 mb-2",
				onToggle && "cursor-pointer hover:bg-muted/30 transition-colors"
			)}
			onClick={onToggle}
		>
			<div className="flex items-center justify-between text-[11px]">
				<div className="flex items-center gap-1.5 text-muted-foreground">
					<span className="opacity-70">Last:</span>
					<span className="font-mono tabular-nums">
						{lastSession.weight}{lastSession.unit} × {lastSession.reps}
						{rpeDisplay && <span className="opacity-70"> {rpeDisplay}</span>}
					</span>
					<span className="opacity-50">({formatDate(lastSession.date)})</span>
				</div>
				{onToggle && (
					<ChevronUp className="h-3 w-3 text-muted-foreground" />
				)}
			</div>
			{targetDisplay && suggestion && (
				<div className="flex items-center gap-1.5 text-[11px] mt-1">
					<span className={cn("font-medium", typeColor)}>Goal:</span>
					<span className="font-mono tabular-nums text-foreground">
						{targetDisplay}
					</span>
					{suggestion.reasoning && (
						<span className="text-muted-foreground/60 truncate">
							— {suggestion.reasoning}
						</span>
					)}
				</div>
			)}
		</div>
	);
}

function ExerciseTitle({
	name,
	status,
	animate,
}: {
	name: string;
	status: ExerciseStatus;
	animate?: boolean;
}) {
	const textRef = useRef<HTMLHeadingElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isTruncated, setIsTruncated] = useState(false);

	useEffect(() => {
		const checkTruncation = () => {
			if (textRef.current && containerRef.current) {
				setIsTruncated(
					textRef.current.scrollWidth > containerRef.current.clientWidth
				);
			}
		};
		checkTruncation();
		window.addEventListener("resize", checkTruncation);
		return () => window.removeEventListener("resize", checkTruncation);
	}, [name]);

	const textClassName = cn(
		"font-semibold whitespace-nowrap transition-all duration-200",
		status === "current" && "text-lg",
		status === "completed" && "text-sm text-muted-foreground",
		status === "upcoming" && "text-base"
	);

	if (animate && isTruncated) {
		return (
			<div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
				<Marquee
					speed={30}
					delay={1}
					pauseOnHover
					gradient
					gradientWidth={20}
					gradientColor="var(--card)"
				>
					<h3 className={cn(textClassName, "pr-8")}>{name}</h3>
				</Marquee>
			</div>
		);
	}

	return (
		<div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
			<h3 ref={textRef} className={cn(textClassName, "truncate")}>
				{name}
			</h3>
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
	let badgeLabel: string;
	
	if (suggestion.type === "deload") {
		badgeText = `${Math.abs(weightDiff)} ${lastSession.unit}`;
		badgeLabel = "Ease up";
	} else if (suggestion.type === "increase_weight" && weightDiff > 0) {
		badgeText = `+${weightDiff} ${lastSession.unit}`;
		badgeLabel = "Add weight";
	} else if (suggestion.type === "increase_reps" && repsDiff > 0) {
		badgeText = `+${repsDiff}`;
		badgeLabel = repsDiff > 1 ? "More reps" : "One more";
	} else {
		badgeText = "=";
		badgeLabel = "Maintain";
	}

	const badgeColor = cn(
		"inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
		suggestion.type === "increase_weight" &&
			"bg-green-500/10 text-green-600 dark:text-green-400",
		suggestion.type === "increase_reps" &&
			"bg-blue-500/10 text-blue-600 dark:text-blue-400",
		suggestion.type === "hold" && "bg-muted text-muted-foreground",
		suggestion.type === "deload" &&
			"bg-orange-500/10 text-orange-600 dark:text-orange-400"
	);

	return (
		<span className={badgeColor} title={suggestion.reasoning ?? undefined}>
			<span className="opacity-70">{badgeLabel}</span>
			<span className="font-bold">{badgeText}</span>
		</span>
	);
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
	const [rpe, setRpe] = useState<number | null>(null);
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
		onAddSet({ reps, weight: effectiveWeight, unit, isBodyweight, rpe });
		setRpe(null);
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
							<ExerciseTitle
								name={exerciseName}
								status={status}
								animate={status === "current"}
							/>
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
					<div className="space-y-2 px-3 pb-3 pt-1">
						{lastSession && (
							<GhostSetBox
								lastSession={lastSession}
								suggestion={progressionSuggestion}
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
							<div className="space-y-1">
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
														"flex w-full items-center justify-between rounded px-2.5 py-1.5",
														"bg-muted/40 text-xs transition-colors duration-150",
														"border border-transparent",
														onEditSet &&
															loggedSet.entryId &&
															"hover:bg-muted hover:border-border cursor-pointer"
													)}
												>
													<span className="font-mono text-muted-foreground text-[11px]">
														{setNumber}
													</span>
													<span className="font-mono tabular-nums">
														{loggedSet.isBodyweight && loggedSet.weight === 0
															? `BW × ${loggedSet.reps}`
															: loggedSet.isBodyweight && loggedSet.weight > 0
																? `BW+${loggedSet.weight}${loggedSet.unit} × ${loggedSet.reps}`
																: `${loggedSet.weight}${loggedSet.unit} × ${loggedSet.reps}`}
													</span>
													<Check className="h-3.5 w-3.5 text-primary" />
												</button>
											);
										} else {
											const displayReps =
												targetReps || defaultReps?.toString() || "—";
											return (
												<div
													key={setNumber}
													className={cn(
														"flex items-center justify-between rounded px-2.5 py-1.5",
														"border border-dashed border-muted-foreground/20 text-xs",
														"text-muted-foreground/50"
													)}
												>
													<span className="font-mono text-[11px]">
														{setNumber}
													</span>
													<span className="font-mono tabular-nums">
														— × {displayReps}
													</span>
													<div className="h-3.5 w-3.5" />
												</div>
											);
										}
									}
								)}
							</div>
						) : sets.length > 0 ? (
							<div className="space-y-1">
								{sets.map((set) => (
									<button
										key={set.setNumber}
										type="button"
										onClick={() => onEditSet && set.entryId && onEditSet(set)}
										disabled={!onEditSet || !set.entryId}
										className={cn(
											"flex w-full items-center justify-between rounded px-2.5 py-1.5",
											"bg-muted/40 text-xs transition-colors duration-150",
											"border border-transparent",
											onEditSet &&
												set.entryId &&
												"hover:bg-muted hover:border-border cursor-pointer"
										)}
									>
										<span className="font-mono text-muted-foreground text-[11px]">
											{set.setNumber}
										</span>
										<span className="font-mono tabular-nums">
											{set.isBodyweight && set.weight === 0
												? `BW × ${set.reps}`
												: set.isBodyweight && set.weight > 0
													? `BW+${set.weight}${set.unit} × ${set.reps}`
													: `${set.weight}${set.unit} × ${set.reps}`}
										</span>
										<Check className="h-3.5 w-3.5 text-primary" />
									</button>
								))}
							</div>
						) : null}

						{weightMode === "bodyweight-optional" && (
							<div className="flex rounded border bg-muted/20 p-0.5">
								<button
									type="button"
									onClick={() => {
										if (isBodyweight) handleBodyweightToggle();
									}}
									className={cn(
										"flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5",
										"text-[11px] font-medium transition-all duration-200",
										!isBodyweight
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									)}
								>
									<Dumbbell className="h-3 w-3" />
									Weighted
								</button>
								<button
									type="button"
									onClick={() => {
										if (!isBodyweight) handleBodyweightToggle();
									}}
									className={cn(
										"flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5",
										"text-[11px] font-medium transition-all duration-200",
										isBodyweight
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									)}
								>
									<User className="h-3 w-3" />
									Bodyweight
								</button>
							</div>
						)}

						{weightMode === "bodyweight-only" && (
							<button
								type="button"
								onClick={() => {
									vibrate("light");
									setShowAddedWeight(!showAddedWeight);
									if (showAddedWeight) setWeight(0);
								}}
								className={cn(
									"flex w-full items-center justify-center gap-1.5 rounded border px-2 py-1.5",
									"text-[11px] font-medium transition-all duration-200",
									showAddedWeight
										? "border-primary/30 bg-primary/5 text-primary"
										: "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
								)}
							>
								<Dumbbell className="h-3 w-3" />
								{showAddedWeight ? "Added weight" : "+ Add weight (vest/belt)"}
								{showAddedWeight ? (
									<ChevronUp className="h-3 w-3 ml-auto" />
								) : (
									<ChevronDown className="h-3 w-3 ml-auto" />
								)}
							</button>
						)}

						<div className="flex items-end justify-center gap-6 pt-2">
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

						<div className="pt-2">
							<RpeSelector value={rpe} onChange={setRpe} />
						</div>

						<Button
							size="lg"
							className={cn(
								"mt-3 h-12 w-full text-base font-semibold tracking-wide",
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
