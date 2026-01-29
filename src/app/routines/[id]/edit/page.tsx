"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	ArrowLeft,
	Check,
	ChevronRight,
	GripVertical,
	Pencil,
	Plus,
	Search,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useHaptic } from "@/hooks/use-haptic";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	EditExerciseSheet,
	type RoutineExercise,
} from "@/components/workout/edit-exercise-sheet";
import { ImportDayDialog } from "@/components/workout/import-day-dialog";

type RoutineDay = {
	id: string;
	name: string;
	exercises: RoutineExercise[];
};

const DEFAULT_EXERCISE: Omit<RoutineExercise, "id" | "exerciseName"> = {
	kind: "lifting",
	targetSets: 3,
	targetReps: "8-12",
	targetDuration: 20,
	targetHoldSeconds: 30,
	perSide: false,
	restSeconds: 90,
};

const MUSCLE_GROUPS = [
	"chest",
	"back",
	"shoulders",
	"biceps",
	"triceps",
	"quads",
	"hamstrings",
	"glutes",
	"calves",
	"core",
	"traps",
	"forearms",
];

function SortableExerciseItem({
	exercise,
	onClick,
}: {
	exercise: RoutineExercise;
	onClick: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: exercise.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const getSummary = () => {
		if (exercise.kind === "cardio") {
			return `${exercise.targetDuration ?? 20} min`;
		}
		if (exercise.kind === "mobility") {
			const base = exercise.targetHoldSeconds
				? `${exercise.targetHoldSeconds}s hold`
				: `${exercise.targetSets}×${exercise.targetReps}`;
			return exercise.perSide ? `${base} /side` : base;
		}
		return `${exercise.targetSets}×${exercise.targetReps}`;
	};
	const summary = getSummary();

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg group"
		>
			<button
				className="touch-none cursor-grab active:cursor-grabbing shrink-0 p-1 -m-1"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4 text-muted-foreground" />
			</button>

			<button
				className="flex-1 flex items-center justify-between min-w-0 text-left"
				onClick={onClick}
			>
				<span className="font-medium truncate">{exercise.exerciseName}</span>
				<div className="flex items-center gap-2 shrink-0 ml-2">
					<span className="text-sm text-muted-foreground font-mono tabular-nums">
						{summary}
					</span>
					<ChevronRight className="h-4 w-4 text-muted-foreground" />
				</div>
			</button>
		</div>
	);
}

export default function EditRoutinePage() {
	const router = useRouter();
	const params = useParams();
	const { vibrate } = useHaptic();

	const routineId = params.id as Id<"routines">;
	const routine = useQuery(api.routines.getRoutine, { routineId });
	const updateRoutine = useMutation(api.routines.updateRoutine);
	const createExercise = useMutation(api.exercises.createExercise);
	const seedExercises = useMutation(api.exercises.seedSystemExercises);
	const exercises = useQuery(api.exercises.getExercises, {});

	const [routineName, setRoutineName] = useState("");
	const [description, setDescription] = useState("");
	const [days, setDays] = useState<RoutineDay[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);

	const [showExercisePicker, setShowExercisePicker] = useState(false);
	const [activeDayId, setActiveDayId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
	const [customExerciseName, setCustomExerciseName] = useState("");
	const [customExerciseMuscles, setCustomExerciseMuscles] = useState<string[]>([]);
	const [showMuscleGroupDialog, setShowMuscleGroupDialog] = useState(false);

	const [editingExercise, setEditingExercise] = useState<{
		dayId: string;
		exercise: RoutineExercise;
	} | null>(null);
	const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
	const [editingDayNameId, setEditingDayNameId] = useState<string | null>(null);
	const [showImportDayDialog, setShowImportDayDialog] = useState(false);

	useEffect(() => {
		if (routine && !isInitialized) {
			setRoutineName(routine.name);
			setDescription(routine.description || "");
			const parsedDays = routine.days.map((day) => ({
				id: crypto.randomUUID(),
				name: day.name,
				exercises: day.exercises.map((ex) => {
					let targetDuration = ex.targetDuration;
					if (ex.kind === "cardio" && !targetDuration && ex.targetReps) {
						const match = ex.targetReps.match(/(\d+)/);
						if (match) {
							targetDuration = parseInt(match[1], 10);
						}
					}
					return {
						id: crypto.randomUUID(),
						exerciseId: ex.exerciseId,
						exerciseName: ex.exerciseName,
						kind: ex.kind,
						targetSets: ex.targetSets || 3,
						targetReps: ex.targetReps || "8-12",
						targetDuration: targetDuration || 20,
						targetHoldSeconds: ex.targetHoldSeconds || 30,
						perSide: ex.perSide || false,
						restSeconds: 90,
					};
				}),
			}));
			setDays(parsedDays);
			if (parsedDays.length > 0) {
				setExpandedDayId(parsedDays[0].id);
			}
			setIsInitialized(true);
		}
	}, [routine, isInitialized]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 150, tolerance: 5 },
		}),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	);

	const handleDragEnd = (dayId: string) => (event: DragEndEvent) => {
		const { active, over } = event;
		if (over && active.id !== over.id) {
			vibrate("light");
			setDays((prev) =>
				prev.map((d) => {
					if (d.id !== dayId) return d;
					const oldIndex = d.exercises.findIndex((e) => e.id === active.id);
					const newIndex = d.exercises.findIndex((e) => e.id === over.id);
					return {
						...d,
						exercises: arrayMove(d.exercises, oldIndex, newIndex),
					};
				})
			);
		}
	};

	const addDay = () => {
		vibrate("light");
		const newDay: RoutineDay = {
			id: crypto.randomUUID(),
			name: `Day ${days.length + 1}`,
			exercises: [],
		};
		setDays([...days, newDay]);
		setExpandedDayId(newDay.id);
	};

	const removeDay = (dayId: string) => {
		vibrate("medium");
		setDays(days.filter((d) => d.id !== dayId));
		if (expandedDayId === dayId) {
			setExpandedDayId(days.find((d) => d.id !== dayId)?.id ?? null);
		}
	};

	const updateDayName = (dayId: string, name: string) => {
		setDays(days.map((d) => (d.id === dayId ? { ...d, name } : d)));
	};

	const openExercisePicker = (dayId: string) => {
		vibrate("light");
		setActiveDayId(dayId);
		setShowExercisePicker(true);
		setSearchQuery("");
		setSelectedMuscle(null);
	};

	const toggleCustomMuscleGroup = (muscle: string) => {
		setCustomExerciseMuscles((prev) =>
			prev.includes(muscle)
				? prev.filter((m) => m !== muscle)
				: [...prev, muscle]
		);
	};

	const handleAddCustomExercise = async () => {
		if (customExerciseMuscles.length === 0) {
			toast.error("Please select at least one muscle group");
			return;
		}
		
		try {
			const exerciseId = await createExercise({
				name: customExerciseName,
				category: "lifting",
				muscleGroups: customExerciseMuscles,
			});
			
			addExerciseToDay(customExerciseName, undefined, "lifting");
			setShowMuscleGroupDialog(false);
			setCustomExerciseName("");
			setCustomExerciseMuscles([]);
			setSearchQuery("");
		} catch (error) {
			toast.error("Failed to create exercise");
			console.error(error);
		}
	};

	const addExerciseToDay = (
		exerciseName: string,
		exerciseId?: Id<"exercises">,
		kind: "lifting" | "cardio" | "mobility" = "lifting"
	) => {
		if (!activeDayId) return;
		vibrate("medium");
		const newExercise: RoutineExercise = {
			id: crypto.randomUUID(),
			exerciseId,
			exerciseName,
			...DEFAULT_EXERCISE,
			kind,
		};
		setDays(
			days.map((d) =>
				d.id === activeDayId
					? { ...d, exercises: [...d.exercises, newExercise] }
					: d
			)
		);
		setShowExercisePicker(false);
	};

	const handleExerciseSave = (updated: RoutineExercise) => {
		if (!editingExercise) return;
		setDays(
			days.map((d) =>
				d.id === editingExercise.dayId
					? {
							...d,
							exercises: d.exercises.map((e) =>
								e.id === updated.id ? updated : e
							),
						}
					: d
			)
		);
	};

	const handleExerciseDelete = (exerciseId: string) => {
		if (!editingExercise) return;
		vibrate("medium");
		setDays(
			days.map((d) =>
				d.id === editingExercise.dayId
					? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
					: d
			)
		);
	};

	const handleSave = async () => {
		if (!routineName.trim()) {
			toast.error("Please enter a routine name");
			return;
		}
		if (days.length === 0) {
			toast.error("Add at least one day");
			return;
		}
		if (!days.some((d) => d.exercises.length > 0)) {
			toast.error("Add at least one exercise");
			return;
		}

		setIsSaving(true);
		try {
			await updateRoutine({
				routineId,
				name: routineName.trim(),
				description: description.trim() || undefined,
				days: days.map((d) => ({
					name: d.name,
					exercises: d.exercises.map((e) => ({
						exerciseId: e.exerciseId,
						exerciseName: e.exerciseName,
						kind: e.kind,
						targetSets:
							e.kind === "lifting" || e.kind === "mobility" ? e.targetSets : 1,
						targetReps:
							e.kind === "lifting" || e.kind === "mobility"
								? e.targetReps
								: undefined,
						targetDuration: e.kind === "cardio" ? e.targetDuration : undefined,
						targetHoldSeconds:
							e.kind === "mobility" ? e.targetHoldSeconds : undefined,
						perSide: e.kind === "mobility" ? e.perSide : undefined,
					})),
				})),
			});
			vibrate("success");
			toast.success("Routine saved!");
			router.push("/routines");
		} catch (error) {
			toast.error("Failed to save routine");
			console.error(error);
		} finally {
			setIsSaving(false);
		}
	};

	const filteredExercises = exercises?.filter((e) => {
		if (selectedMuscle && !e.muscleGroups?.includes(selectedMuscle))
			return false;
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			return (
				e.name.toLowerCase().includes(query) ||
				e.aliases?.some((a) => a.toLowerCase().includes(query))
			);
		}
		return true;
	});

	const needsSeeding = exercises && exercises.length === 0;

	if (routine === undefined) {
		return (
			<div className="flex min-h-screen flex-col">
				<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
					<div className="flex h-14 items-center gap-4 px-4">
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-6 w-32 flex-1" />
						<Skeleton className="h-8 w-16" />
					</div>
				</header>
				<main className="flex-1 p-4 space-y-4">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-40 w-full" />
				</main>
			</div>
		);
	}

	if (routine === null) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center p-4">
				<h1 className="text-xl font-semibold mb-2">Routine not found</h1>
				<p className="text-muted-foreground mb-4">
					This routine may have been deleted.
				</p>
				<Link href="/routines">
					<Button>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Routines
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
				<div className="flex h-14 items-center justify-between px-4">
					<div className="flex items-center gap-2">
						<Link href="/routines">
							<Button variant="ghost" size="icon">
								<ArrowLeft className="h-5 w-5" />
							</Button>
						</Link>
						<span className="font-semibold">Edit Routine</span>
					</div>
					<Button onClick={handleSave} disabled={isSaving} size="sm">
						{isSaving ? "Saving..." : "Save"}
					</Button>
				</div>
			</header>

			<main className="flex-1 p-4 pb-24 space-y-6">
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name" className="text-xs text-muted-foreground">
							Routine Name
						</Label>
						<Input
							id="name"
							value={routineName}
							onChange={(e) => setRoutineName(e.target.value)}
							placeholder="e.g., Push Pull Legs"
							className="h-12 text-lg font-medium"
						/>
					</div>
					<div className="space-y-2">
						<Label
							htmlFor="description"
							className="text-xs text-muted-foreground"
						>
							Description (optional)
						</Label>
						<Input
							id="description"
							placeholder="What's this routine about?"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
				</div>

				<section className="space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
							Days
						</h2>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowImportDayDialog(true)}
							>
								<Upload className="mr-1 h-4 w-4" />
								Import
							</Button>
							<Button variant="outline" size="sm" onClick={addDay}>
								<Plus className="mr-1 h-4 w-4" />
								Add Day
							</Button>
						</div>
					</div>

					{days.length === 0 ? (
						<Card className="p-8 text-center">
							<p className="text-muted-foreground mb-4">
								No days yet. Add a day to start building your routine.
							</p>
							<Button onClick={addDay}>
								<Plus className="mr-2 h-4 w-4" />
								Add First Day
							</Button>
						</Card>
					) : (
						<div className="space-y-3">
							{days.map((day) => {
								const isExpanded = expandedDayId === day.id;

								return (
									<Card key={day.id} className="overflow-hidden">
										<div
											className="flex items-center gap-2 p-4 cursor-pointer"
											onClick={() =>
												setExpandedDayId(isExpanded ? null : day.id)
											}
										>
											{editingDayNameId === day.id ? (
												<div
													className="flex items-center gap-2 flex-1 min-w-0"
													onClick={(e) => e.stopPropagation()}
												>
													<input
														type="text"
														value={day.name}
														onChange={(e) =>
															updateDayName(day.id, e.target.value)
														}
														onKeyDown={(e) => {
															if (e.key === "Enter") setEditingDayNameId(null);
															if (e.key === "Escape") setEditingDayNameId(null);
														}}
														className="flex-1 min-w-0 h-8 px-2 rounded border bg-background font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
														placeholder="Day name"
														autoFocus
													/>
													<Button
														size="icon"
														variant="ghost"
														className="h-8 w-8 shrink-0"
														onClick={() => setEditingDayNameId(null)}
													>
														<Check className="h-4 w-4" />
													</Button>
												</div>
											) : (
												<>
													<span className="font-medium truncate">
														{day.name || "Untitled"}
													</span>
													<button
														className="p-1.5 -m-1.5 rounded hover:bg-muted shrink-0"
														onClick={(e) => {
															e.stopPropagation();
															setEditingDayNameId(day.id);
														}}
													>
														<Pencil className="h-3.5 w-3.5 text-muted-foreground" />
													</button>
												</>
											)}
											<div className="flex items-center gap-2 ml-auto shrink-0">
												<span className="text-sm text-muted-foreground font-mono tabular-nums">
													{day.exercises.length}
												</span>
												<ChevronRight
													className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
														isExpanded ? "rotate-90" : ""
													}`}
												/>
											</div>
										</div>

										{isExpanded && (
											<div className="border-t px-4 py-3 space-y-3 bg-muted/20">
												{day.exercises.length > 0 ? (
													<DndContext
														sensors={sensors}
														collisionDetection={closestCenter}
														onDragEnd={handleDragEnd(day.id)}
													>
														<SortableContext
															items={day.exercises.map((e) => e.id)}
															strategy={verticalListSortingStrategy}
														>
															<div className="space-y-2">
																{day.exercises.map((exercise) => (
																	<SortableExerciseItem
																		key={exercise.id}
																		exercise={exercise}
																		onClick={() =>
																			setEditingExercise({
																				dayId: day.id,
																				exercise,
																			})
																		}
																	/>
																))}
															</div>
														</SortableContext>
													</DndContext>
												) : (
													<p className="text-sm text-muted-foreground text-center py-4">
														No exercises yet
													</p>
												)}

												<div className="flex gap-2 pt-2">
													<Button
														variant="outline"
														className="flex-1"
														onClick={() => openExercisePicker(day.id)}
													>
														<Plus className="mr-2 h-4 w-4" />
														Add Exercise
													</Button>
													{days.length > 1 && (
														<Button
															variant="ghost"
															size="icon"
															className="text-destructive hover:text-destructive hover:bg-destructive/10"
															onClick={() => removeDay(day.id)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													)}
												</div>
											</div>
										)}
									</Card>
								);
							})}
						</div>
					)}
				</section>
			</main>

			<Sheet open={showExercisePicker} onOpenChange={setShowExercisePicker}>
				<SheetContent side="bottom" className="h-[85vh] flex flex-col">
					<SheetHeader>
						<SheetTitle>Add Exercise</SheetTitle>
						<SheetDescription>
							Select an exercise to add to your routine
						</SheetDescription>
					</SheetHeader>

					<div className="flex-1 flex flex-col gap-4 px-4 overflow-hidden">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search exercises..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="h-12 pl-10"
							/>
						</div>

						<div className="flex flex-wrap gap-2">
							<Badge
								variant={selectedMuscle === null ? "default" : "outline"}
								className="cursor-pointer"
								onClick={() => setSelectedMuscle(null)}
							>
								All
							</Badge>
							{MUSCLE_GROUPS.map((muscle) => (
								<Badge
									key={muscle}
									variant={selectedMuscle === muscle ? "default" : "outline"}
									className="cursor-pointer capitalize h-10 px-4 text-sm font-medium"
									onClick={() =>
										setSelectedMuscle(selectedMuscle === muscle ? null : muscle)
									}
								>
									{muscle}
								</Badge>
							))}
						</div>

						{needsSeeding && (
							<Card className="p-4 text-center">
								<p className="text-sm text-muted-foreground mb-3">
									No exercises in library. Load the default exercises?
								</p>
								<Button
									size="sm"
									onClick={async () => {
										try {
											const result = await seedExercises({});
											toast.success(`Added ${result.added} exercises`);
										} catch {
											toast.error("Failed to load exercises");
										}
									}}
								>
									Load Exercises
								</Button>
							</Card>
						)}

						<div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-1">
							{searchQuery.trim() && (
								<button
									className="w-full flex items-center justify-between p-3 rounded-lg text-left bg-primary/5 border border-primary/20 hover:bg-primary/10 active:bg-primary/15 transition-colors mb-2"
									onClick={() => {
										setCustomExerciseName(searchQuery.trim());
										setShowMuscleGroupDialog(true);
									}}
								>
									<div className="min-w-0 flex-1">
										<span className="font-medium truncate block text-primary">
											Add &quot;{searchQuery}&quot; as custom exercise
										</span>
										<span className="text-xs text-muted-foreground">
											Create a new exercise
										</span>
									</div>
									<Plus className="h-5 w-5 text-primary shrink-0 ml-2" />
								</button>
							)}
							{filteredExercises?.map((exercise) => (
								<button
									key={exercise._id}
									className="w-full flex items-center justify-between p-3 rounded-lg text-left hover:bg-muted/50 active:bg-muted/70 transition-colors"
									onClick={() =>
										addExerciseToDay(
											exercise.name,
											exercise._id,
											exercise.category === "cardio"
												? "cardio"
												: exercise.category === "mobility"
													? "mobility"
													: "lifting"
										)
									}
								>
									<div className="min-w-0">
										<span className="font-medium truncate block">
											{exercise.name}
										</span>
										{exercise.muscleGroups &&
											exercise.muscleGroups.length > 0 && (
												<span className="text-xs text-muted-foreground capitalize">
													{exercise.muscleGroups.slice(0, 3).join(", ")}
												</span>
											)}
									</div>
									<Plus className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
								</button>
							))}
							{filteredExercises?.length === 0 && !needsSeeding && !searchQuery.trim() && (
								<div className="text-center py-8">
									<p className="text-muted-foreground">No exercises found</p>
									<p className="text-xs text-muted-foreground mt-2">
										Try adjusting your filters or search for a different exercise
									</p>
								</div>
							)}
						</div>
					</div>
				</SheetContent>
			</Sheet>

			<EditExerciseSheet
				exercise={editingExercise?.exercise ?? null}
				onOpenChange={(open) => !open && setEditingExercise(null)}
				onSave={handleExerciseSave}
				onDelete={handleExerciseDelete}
			/>

		<ImportDayDialog
			routineId={routineId}
			open={showImportDayDialog}
			onOpenChange={setShowImportDayDialog}
			onSuccess={() => setIsInitialized(false)}
		/>

		<Dialog open={showMuscleGroupDialog} onOpenChange={setShowMuscleGroupDialog}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Select Muscle Groups</DialogTitle>
					<DialogDescription>
						Choose which muscles &quot;{customExerciseName}&quot; targets
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 py-4">
					<div className="flex flex-wrap gap-2">
						{MUSCLE_GROUPS.map((muscle) => (
							<Badge
								key={muscle}
								variant={customExerciseMuscles.includes(muscle) ? "default" : "outline"}
								className="cursor-pointer capitalize h-10 px-4 text-sm font-medium"
								onClick={() => toggleCustomMuscleGroup(muscle)}
							>
								{muscle}
								{customExerciseMuscles.includes(muscle) && (
									<X className="ml-1.5 h-3.5 w-3.5" />
								)}
							</Badge>
						))}
					</div>

					{customExerciseMuscles.length === 0 && (
						<p className="text-sm text-muted-foreground">
							Select at least one muscle group
						</p>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							setShowMuscleGroupDialog(false);
							setCustomExerciseName("");
							setCustomExerciseMuscles([]);
						}}
					>
						Cancel
					</Button>
					<Button
						onClick={handleAddCustomExercise}
						disabled={customExerciseMuscles.length === 0}
					>
						Add Exercise
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</div>
);
}
