"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ExerciseAccordion } from "@/components/workout/exercise-accordion";
import {
	TimedExerciseAccordion,
	type TimedSetData,
} from "@/components/workout/timed-exercise-accordion";
import { CardioExerciseCard } from "@/components/workout/cardio-exercise-card";
import { RestTimerOverlay } from "@/components/workout/rest-timer-overlay";
import {
	AddExerciseSheet,
	ExerciseSelection,
} from "@/components/workout/add-exercise-sheet";
import { SaveAsRoutineDialog } from "@/components/workout/save-as-routine-dialog";
import { SmartSwapSheet } from "@/components/workout/smart-swap-sheet";
import { SwapFollowUpDialog } from "@/components/workout/swap-followup-dialog";
import { EditSetSheet, EditableSet } from "@/components/workout/edit-set-sheet";
import { WorkoutTimeEditorDialog } from "@/components/workout/workout-time-editor-dialog";
import { SessionCommandCenter } from "@/components/workout/session-command-center";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useClientId } from "@/hooks/use-client-id";
import { useHaptic } from "@/hooks/use-haptic";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { calculateProgressionSuggestion } from "@/lib/progression";
import {
	calculateVolumeInUnit,
	displayWeight,
	editedWeightForStorage,
	type WeightUnit,
} from "@/lib/units";
import {
	CardioSaveBlockedError,
	createCardioPersistenceGate,
} from "@/lib/cardio-persistence";
import {
	getExerciseGroup,
	getExerciseGroupKey,
} from "@/lib/workout-exercise-group";
import posthog from "posthog-js";

type EntryData = {
	_id: string;
	exerciseName: string;
	kind: "lifting" | "cardio";
	lifting?: {
		setNumber: number;
		reps?: number;
		weight?: number;
		durationSeconds?: number;
		unit: "kg" | "lb";
		isBodyweight?: boolean;
		rpe?: number;
	};
	cardio?: {
		durationSeconds: number;
		distance?: number;
		distanceUnit?: "m" | "km" | "mi";
		rpe?: number;
		vestWeight?: number;
		vestWeightUnit?: "kg" | "lb";
	};
};

function ExerciseAccordionWithHistory({
	exerciseName,
	targetReps,
	unit,
	sets,
	...rest
}: Omit<
	React.ComponentProps<typeof ExerciseAccordion>,
	"lastSession" | "progressionSuggestion"
>) {
	const history = useQuery(api.entries.getExerciseHistory, { exerciseName });

	const ghostData = useMemo(() => {
		if (!history || history.length === 0) return null;
		return calculateProgressionSuggestion(history, targetReps, unit);
	}, [history, targetReps, unit]);

	return (
		<ExerciseAccordion
			exerciseName={exerciseName}
			targetReps={targetReps}
			sets={sets}
			lastSession={ghostData?.lastSession}
			progressionSuggestion={ghostData?.suggestion}
			unit={unit}
			{...rest}
		/>
	);
}

function TimedExerciseAccordionWithHistory({
	exerciseName,
	...props
}: Omit<React.ComponentProps<typeof TimedExerciseAccordion>, "lastSession">) {
	const history = useQuery(api.entries.getTimedExerciseHistory, { exerciseName });

	return (
		<TimedExerciseAccordion
			exerciseName={exerciseName}
			lastSession={history?.[0]}
			{...props}
		/>
	);
}

type PendingExercise = {
	name: string;
	category: "lifting" | "cardio" | "mobility" | "other";
	primaryMetric?: "duration" | "distance";
	targetSets?: number;
	targetReps?: string;
	targetDurationMinutes?: number;
	measurementType?: "reps" | "duration";
	targetHoldSeconds?: number;
	equipment?: string[];
	muscleGroups?: string[];
};

function getEntryGroupKey(entry: EntryData) {
	return getExerciseGroupKey({
		name: entry.exerciseName,
		category: entry.kind === "cardio" ? "cardio" : "lifting",
		measurementType:
			entry.kind === "lifting" && entry.lifting?.durationSeconds !== undefined
				? "duration"
				: "reps",
	});
}

function useDuration(startedAt: number | undefined) {
	const [duration, setDuration] = useState("");

	useEffect(() => {
		if (!startedAt) return;

		const update = () => {
			const minutes = Math.floor((Date.now() - startedAt) / 60000);
			const hours = Math.floor(minutes / 60);
			const mins = minutes % 60;
			setDuration(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
		};

		update();
		const interval = setInterval(update, 60000);
		return () => clearInterval(interval);
	}, [startedAt]);

	return duration;
}

export default function ActiveWorkoutPage() {
	const router = useRouter();
	const { generateClientId } = useClientId();
	const { vibrate } = useHaptic();
	const [showAddExercise, setShowAddExercise] = useState(false);
	const [showRestTimer, setShowRestTimer] = useState(false);
	const [showSaveRoutine, setShowSaveRoutine] = useState(false);
	const [pendingExercises, setPendingExercises] = useState<PendingExercise[]>(
		[]
	);
	const [swapExercise, setSwapExercise] = useState<{
		groupKey: string;
		name: string;
	} | null>(null);
	const [showSwapFollowUp, setShowSwapFollowUp] = useState(false);
	const [editingSet, setEditingSet] = useState<EditableSet | null>(null);
	const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
	const [manualNavigation, setManualNavigation] = useState(false);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);
	const [showTimeEditor, setShowTimeEditor] = useState(false);
	const [timeEditorInitialEnd, setTimeEditorInitialEnd] = useState<number | null>(
		null
	);
	const [isCompletingWithEditedTime, setIsCompletingWithEditedTime] =
		useState(false);
	const [isCompleting, setIsCompleting] = useState(false);
	const [pendingCardioSaveCount, setPendingCardioSaveCount] = useState(0);
	const [cardioPersistenceGate] = useState(() =>
		createCardioPersistenceGate(setPendingCardioSaveCount)
	);
	const exerciseRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	const workout = useQuery(api.workouts.getActiveWorkout);
	const user = useQuery(api.users.getCurrentUser);
	const preferredUnit: WeightUnit = user?.preferredUnits ?? "lb";
	const entries = useQuery(
		api.entries.getEntriesByWorkout,
		workout ? { workoutId: workout._id } : "skip"
	);
	const routineExercises = useQuery(
		api.workouts.getRoutineExercisesForWorkout,
		workout ? { workoutId: workout._id } : "skip"
	);
	const pendingSwaps = useQuery(
		api.ai.swapMutations.getSwapsForWorkout,
		workout ? { workoutId: workout._id } : "skip"
	);

	const duration = useDuration(workout?.startedAt);

	const addLiftingEntry = useMutation(api.entries.addLiftingEntry);
	const addCardioEntry = useMutation(api.entries.addCardioEntry);
	const updateLiftingEntry = useMutation(api.entries.updateLiftingEntry);
	const deleteEntry = useMutation(api.entries.deleteEntry);
	const completeWorkout = useMutation(api.workouts.completeWorkout);
	const cancelWorkout = useMutation(api.workouts.cancelWorkout);
	const updateExerciseNote = useMutation(api.workouts.updateExerciseNote);
	const createExercise = useMutation(api.exercises.createExercise);

	const getExerciseNote = (exerciseName: string): string | undefined => {
		return workout?.exerciseNotes?.find((n) => n.exerciseName === exerciseName)
			?.note;
	};

	const handleNoteChange = async (exerciseName: string, note: string) => {
		if (!workout) return;
		try {
			await updateExerciseNote({
				workoutId: workout._id,
				exerciseName,
				note,
			});
		} catch (error) {
			toast.error("Failed to save note");
			console.error(error);
		}
	};

	// Stable order: exercises appear in the order they were added to pendingExercises
	// We don't remove from pendingExercises when logging sets - this preserves order and metadata
	const exerciseGroups = useMemo(() => {
		const groups = new Map<
			string,
			{ entries: EntryData[]; meta: PendingExercise }
		>();

		// First, add all pending exercises to establish stable order and meta (targetSets, targetReps, etc.)
		for (const pending of pendingExercises) {
			groups.set(getExerciseGroupKey(pending), { entries: [], meta: pending });
		}

		// Then, add entries to their groups (entries may exist for exercises in pendingExercises)
		if (entries) {
			for (const entry of entries) {
				const groupKey = getEntryGroupKey(entry as EntryData);
				const existing = groups.get(groupKey);
				if (existing) {
					existing.entries.push(entry as EntryData);
				} else {
					// Entry for an exercise not in pendingExercises (edge case: old data or manual add)
					// Add at the end to preserve stable ordering of pending exercises
					groups.set(groupKey, {
						entries: [entry as EntryData],
						meta: {
							name: entry.exerciseName,
							category: entry.kind === "cardio" ? "cardio" : "lifting",
							primaryMetric: entry.kind === "cardio" ? "duration" : undefined,
							measurementType:
								entry.lifting?.durationSeconds !== undefined
									? "duration"
									: undefined,
						},
					});
				}
			}
		}

		return groups;
	}, [entries, pendingExercises]);

	useEffect(() => {
		if (workout === null) {
			router.push("/dashboard");
		}
	}, [workout, router]);

	useEffect(() => {
		if (
			routineExercises &&
			routineExercises.length > 0 &&
			pendingExercises.length === 0
		) {
			const pending: PendingExercise[] = routineExercises.map((ex) => {
				const exerciseWithEquipment = ex as typeof ex & {
					equipment?: string[];
				};
				return {
					name: ex.exerciseName,
					category:
						ex.kind === "cardio" ? ("cardio" as const) : ("lifting" as const),
					primaryMetric:
						ex.kind === "cardio" ? ("duration" as const) : undefined,
					targetSets: ex.targetSets,
					targetReps: ex.targetReps,
					targetDurationMinutes: ex.targetDuration,
					measurementType: ex.measurementType,
					targetHoldSeconds: ex.targetHoldSeconds,
					equipment: exerciseWithEquipment.equipment,
				};
			});
			const timeout = setTimeout(() => setPendingExercises(pending), 0);
			return () => clearTimeout(timeout);
		}
	}, [routineExercises, pendingExercises.length]);

	const exerciseList = useMemo(
		() => Array.from(exerciseGroups.entries()),
		[exerciseGroups]
	);

	const prevEntriesLengthRef = useRef(entries?.length ?? 0);

	useEffect(() => {
		const currentLength = entries?.length ?? 0;
		const prevLength = prevEntriesLengthRef.current;
		prevEntriesLengthRef.current = currentLength;

		if (manualNavigation) {
			if (currentLength > prevLength) {
				const timeout = setTimeout(() => setManualNavigation(false), 0);
				return () => clearTimeout(timeout);
			}
			return;
		}

		if (exerciseList.length === 0) return;
		if (currentLength <= prevLength) return;

		const currentExercise = exerciseList[currentExerciseIndex];
		if (!currentExercise) return;

		const [, { entries: groupEntries, meta }] = currentExercise;

		if (meta.category === "cardio") {
			const hasLogged = groupEntries.some((e) => e.kind === "cardio");
			if (hasLogged && currentExerciseIndex < exerciseList.length - 1) {
				const timeout = setTimeout(() => {
					setCurrentExerciseIndex((prev) => prev + 1);
				}, 800);
				return () => clearTimeout(timeout);
			}
			return;
		}

		const liftingEntries = groupEntries.filter(
			(e) =>
				e.kind === "lifting" &&
				(meta.measurementType === "duration"
					? e.lifting?.durationSeconds !== undefined
					: e.lifting?.durationSeconds === undefined)
		);
		const isComplete =
			meta.targetSets !== undefined && liftingEntries.length >= meta.targetSets;

		if (isComplete && currentExerciseIndex < exerciseList.length - 1) {
			const timeout = setTimeout(() => {
				setCurrentExerciseIndex((prev) => prev + 1);
			}, 800);
			return () => clearTimeout(timeout);
		}
	}, [exerciseList, currentExerciseIndex, entries?.length, manualNavigation]);

	useEffect(() => {
		if (exerciseList.length === 0) return;

		const currentExercise = exerciseList[currentExerciseIndex];
		if (!currentExercise) return;

		const [groupKey] = currentExercise;
		const element = exerciseRefs.current.get(groupKey);

		if (element) {
			setTimeout(() => {
				element.scrollIntoView({ behavior: "smooth", block: "center" });
			}, 100);
		}
	}, [currentExerciseIndex, exerciseList]);

	if (workout === undefined || workout === null || user === undefined) {
		return (
			<div className="flex min-h-screen flex-col p-4">
				<Skeleton className="mb-4 h-8 w-48" />
				<Skeleton className="mb-4 h-64 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	const handleAddSet = async (
		exerciseName: string,
		set: {
			reps: number;
			weight: number;
			unit: "lb" | "kg";
			isBodyweight?: boolean;
			rpe?: number | null;
		}
	) => {
		const group = exerciseGroups.get(getExerciseGroupKey({
			name: exerciseName,
			category: "lifting",
			measurementType: "reps",
		}));
		const existingSets = group?.entries ?? [];
		const setNumber = existingSets.length + 1;

		try {
			await addLiftingEntry({
				workoutId: workout._id,
				clientId: generateClientId(),
				exerciseName,
				lifting: {
					setNumber,
					reps: set.reps,
					weight: set.weight,
					unit: preferredUnit,
					isBodyweight: set.isBodyweight,
					rpe: set.rpe ?? undefined,
				},
			});
			posthog.capture("set_logged", {
				exercise_name: exerciseName,
				set_number: setNumber,
				reps: set.reps,
				weight: set.weight,
				unit: preferredUnit,
				is_bodyweight: set.isBodyweight ?? false,
				rpe: set.rpe ?? null,
			});
			setShowRestTimer(true);
		} catch (error) {
			toast.error("Failed to log set");
			console.error(error);
		}
	};

	const handleAddTimedSet = async (
		exerciseName: string,
		set: { durationSeconds: number; rpe?: number | null }
	) => {
		const group = exerciseGroups.get(getExerciseGroupKey({
			name: exerciseName,
			category: "lifting",
			measurementType: "duration",
		}));
		const existingSets = group?.entries.filter(
			(entry) => entry.kind === "lifting" && entry.lifting?.durationSeconds !== undefined
		) ?? [];
		const setNumber = existingSets.length + 1;

		try {
			await addLiftingEntry({
				workoutId: workout._id,
				clientId: generateClientId(),
				exerciseName,
				lifting: {
					setNumber,
					durationSeconds: set.durationSeconds,
					unit: "lb",
					rpe: set.rpe ?? undefined,
				},
			});
			posthog.capture("set_logged", {
				exercise_name: exerciseName,
				set_number: setNumber,
				measurement_type: "duration",
				duration_seconds: set.durationSeconds,
				rpe: set.rpe ?? null,
			});
			setShowRestTimer(true);
		} catch (error) {
			posthog.captureException(error);
			throw error;
		}
	};

	const handleLogCardio = async (
		exerciseName: string,
		data: {
			durationSeconds: number;
			distance?: number;
			distanceUnit?: "km" | "mi";
			rpe?: number;
			vestWeight?: number;
			vestWeightUnit?: "kg" | "lb";
			intensity?: number;
		}
	) => {
		try {
			await cardioPersistenceGate.runSave(async () => {
				await addCardioEntry({
					workoutId: workout._id,
					clientId: generateClientId(),
					exerciseName,
					cardio: {
						mode: "steady",
						durationSeconds: data.durationSeconds,
						distance: data.distance,
						distanceUnit:
							data.distanceUnit === "km"
								? "km"
								: data.distanceUnit === "mi"
									? "mi"
									: undefined,
						rpe: data.rpe,
						vestWeight: data.vestWeight,
						vestWeightUnit: data.vestWeightUnit,
						intensity: data.intensity,
					},
				});
				posthog.capture("cardio_logged", {
					exercise_name: exerciseName,
					duration_seconds: data.durationSeconds,
					distance: data.distance,
					distance_unit: data.distanceUnit,
					rpe: data.rpe,
				});
			});
			// Don't remove from pendingExercises - we need to preserve order and metadata
			toast.success("Cardio logged!");
		} catch (error) {
			const reason =
				error instanceof CardioSaveBlockedError
					? "workout_completing"
					: "mutation_failed";
			posthog.capture("cardio_log_failed", { reason });
			toast.error(
				reason === "workout_completing"
					? "Workout is already finishing"
					: "Failed to log cardio"
			);
			console.error(error);
			throw error;
		}
	};

	const handleAddExercise = async (exercise: ExerciseSelection) => {
		const groupKey = getExerciseGroupKey(exercise);
		if (!exerciseGroups.has(groupKey)) {
			if (exercise.muscleGroups && exercise.muscleGroups.length > 0) {
				try {
					await createExercise({
						name: exercise.name,
						category: exercise.category,
						muscleGroups: exercise.muscleGroups,
						primaryMetric: exercise.primaryMetric,
						measurementType: exercise.measurementType,
					});
				} catch (error) {
					console.error("Failed to create exercise:", error);
				}
			}
			setPendingExercises((prev) => [...prev, exercise]);
		}
		setShowAddExercise(false);
	};

	const handleSwapComplete = (
		oldExercise: { groupKey: string; name: string },
		selection: {
			name: string;
			measurementType: "reps" | "duration";
			targetHoldSeconds?: number;
		}
	) => {
		const newExercise = selection.name;
		const isPendingExercise = pendingExercises.some(
			(p) => getExerciseGroupKey(p) === oldExercise.groupKey
		);

		if (isPendingExercise) {
			setPendingExercises((prev) =>
				prev.map((p) =>
					getExerciseGroupKey(p) === oldExercise.groupKey
						? {
								...p,
								name: newExercise,
								measurementType: selection.measurementType,
								targetHoldSeconds:
									selection.measurementType === "duration"
										? selection.targetHoldSeconds ?? 30
										: undefined,
								targetReps:
									selection.measurementType === "duration"
										? undefined
										: p.targetReps ?? "8-12",
							}
						: p
				)
			);
		} else if (!exerciseGroups.has(getExerciseGroupKey({
			name: newExercise,
			category: "lifting",
			measurementType: selection.measurementType,
		}))) {
			setPendingExercises((prev) => [
				...prev,
				{
					name: newExercise,
					category: "lifting" as const,
					measurementType: selection.measurementType,
					targetHoldSeconds: selection.targetHoldSeconds,
				},
			]);
		}
		posthog.capture("exercise_swapped", {
			old_exercise: oldExercise.name,
			new_exercise: newExercise,
			workout_id: workout._id,
		});
		setSwapExercise(null);
	};

	const handleCompletionSuccess = (usedTimeOverride: boolean) => {
		posthog.capture("workout_completed", {
			workout_id: workout._id,
			is_from_routine: !!workout.routineId,
			exercise_count: exerciseGroups.size,
			total_sets: Array.from(exerciseGroups.values()).reduce(
				(acc, { entries }) =>
					acc + entries.filter((e) => e.kind === "lifting").length,
				0
			),
			used_time_override: usedTimeOverride,
		});
		toast.success("Workout completed!");

		const hasSwapsNeedingFollowUp = pendingSwaps && pendingSwaps.length > 0;

		if (hasSwapsNeedingFollowUp) {
			setShowSwapFollowUp(true);
		} else {
			handlePostWorkoutFlow();
		}
	};

	const handleComplete = async () => {
		const completionStart = cardioPersistenceGate.tryStartCompletion();
		if (completionStart !== "started") {
			if (completionStart === "cardio_save_pending") {
				toast.info("Wait for cardio to finish saving");
			}
			return;
		}

		setIsCompleting(true);
		vibrate("success");
		try {
			await completeWorkout({ workoutId: workout._id });
			handleCompletionSuccess(false);
		} catch (error) {
			toast.error("Failed to complete workout");
			posthog.captureException(error);
			console.error(error);
		} finally {
			setIsCompleting(false);
			cardioPersistenceGate.finishCompletion();
		}
	};

	const handleOpenTimeEditor = () => {
		if (cardioPersistenceGate.pendingCount > 0) {
			toast.info("Wait for cardio to finish saving");
			return;
		}
		setTimeEditorInitialEnd(Date.now());
		setShowTimeEditor(true);
	};

	const handleCompleteWithEditedTime = async (
		startedAt: number,
		completedAt: number
	) => {
		const completionStart = cardioPersistenceGate.tryStartCompletion();
		if (completionStart !== "started") {
			throw new Error(
				completionStart === "cardio_save_pending"
					? "Wait for cardio to finish saving"
					: "Workout completion is already in progress"
			);
		}

		setIsCompletingWithEditedTime(true);
		vibrate("success");
		try {
			await completeWorkout({
				workoutId: workout._id,
				startedAtOverride: startedAt,
				completedAtOverride: completedAt,
			});
			handleCompletionSuccess(true);
		} catch (error) {
			posthog.captureException(error);
			console.error(error);
			throw error;
		} finally {
			setIsCompletingWithEditedTime(false);
			cardioPersistenceGate.finishCompletion();
		}
	};

	const handlePostWorkoutFlow = () => {
		const hasExercises = exerciseGroups.size > 0;
		const isFromRoutine = !!workout.routineId;

		if (hasExercises && !isFromRoutine) {
			setShowSaveRoutine(true);
		} else {
			router.push("/dashboard");
		}
	};

	const handleSwapFollowUpComplete = () => {
		setShowSwapFollowUp(false);
		handlePostWorkoutFlow();
	};

	const handleRoutineDialogComplete = () => {
		router.push("/dashboard");
	};

	const handleConfirmCancel = async () => {
		setIsCancelling(true);
		vibrate("warning");
		try {
			await cancelWorkout({ workoutId: workout._id });
			posthog.capture("workout_cancelled", {
				workout_id: workout._id,
				is_from_routine: !!workout.routineId,
				exercise_count: exerciseGroups.size,
				sets_logged: Array.from(exerciseGroups.values()).reduce(
					(acc, { entries }) => acc + entries.filter((e) => e.kind === "lifting").length,
					0
				),
			});
			setShowCancelDialog(false);
			toast.success("Workout cancelled");
			router.push("/dashboard");
		} catch (error) {
			toast.error("Failed to cancel workout");
			console.error(error);
		} finally {
			setIsCancelling(false);
		}
	};

	const handleEditSet = (
		exerciseName: string,
		set: {
			entryId?: string;
			setNumber: number;
			reps: number;
			weight: number;
			unit: "lb" | "kg";
			isBodyweight?: boolean;
			rpe?: number | null;
		}
	) => {
		if (!set.entryId) return;
		const storedSet = getExerciseGroup(exerciseGroups, {
			name: exerciseName,
			category: "lifting",
			measurementType: "reps",
		})
			?.entries.find((entry) => entry._id === set.entryId)?.lifting;
		setEditingSet({
			entryId: set.entryId,
			exerciseName,
			setNumber: set.setNumber,
			reps: set.reps,
			weight: set.weight,
			unit: set.unit,
			storedWeight: storedSet?.weight,
			storedUnit: storedSet?.unit,
			isBodyweight: set.isBodyweight,
			rpe: set.rpe,
		});
	};

	const handleEditTimedSet = (exerciseName: string, set: TimedSetData) => {
		if (!set.entryId) return;
		setEditingSet({
			entryId: set.entryId,
			exerciseName,
			setNumber: set.setNumber,
			reps: 0,
			weight: 0,
			unit: "lb",
			durationSeconds: set.durationSeconds,
			rpe: set.rpe,
		});
	};

	const handleUpdateSet = async (
		entryId: string,
		data: { reps?: number; weight?: number; durationSeconds?: number; rpe?: number | null }
	) => {
		if (!editingSet) return;
		try {
			await updateLiftingEntry({
				entryId:
					entryId as unknown as import("../../../../convex/_generated/dataModel").Id<"entries">,
				lifting:
					data.durationSeconds !== undefined
						? {
								setNumber: editingSet.setNumber,
								durationSeconds: data.durationSeconds,
								unit: editingSet.unit,
								rpe: data.rpe ?? undefined,
							}
						: {
								setNumber: editingSet.setNumber,
								reps: data.reps,
								weight:
									data.weight === undefined
										? undefined
										: editedWeightForStorage({
												displayedWeight: data.weight,
												displayUnit: editingSet.unit,
												storedUnit:
													editingSet.storedUnit ?? editingSet.unit,
												originalDisplayedWeight: editingSet.weight,
												originalStoredWeight: editingSet.storedWeight,
											}),
								unit: editingSet.storedUnit ?? editingSet.unit,
								isBodyweight: editingSet.isBodyweight,
								rpe: data.rpe ?? undefined,
							},
			});
			vibrate("success");
			toast.success("Set updated");
		} catch (error) {
			toast.error("Failed to update set");
			console.error(error);
		}
	};

	const handleDeleteSet = async (entryId: string) => {
		try {
			await deleteEntry({
				entryId:
					entryId as unknown as import("../../../../convex/_generated/dataModel").Id<"entries">,
			});
			vibrate("warning");
			toast.success("Set deleted");
		} catch (error) {
			toast.error("Failed to delete set");
			console.error(error);
		}
	};

	const sessionStats = (() => {
		let loggedSets = 0;
		let targetSets = 0;
		let totalVolume = 0;

		for (const [, { entries: groupEntries, meta }] of exerciseGroups) {
			if (meta.category === "cardio") {
				targetSets += 1;
				if (groupEntries.some((entry) => entry.kind === "cardio")) loggedSets += 1;
				continue;
			}

			const liftingEntries = groupEntries.filter((entry) => entry.kind === "lifting" && entry.lifting);
			loggedSets += liftingEntries.length;
			targetSets += meta.targetSets ?? Math.max(liftingEntries.length, 1);

			totalVolume += calculateVolumeInUnit(
				liftingEntries.flatMap((entry) =>
					entry.lifting ? [entry.lifting] : []
				),
				preferredUnit
			);
		}

		return { loggedSets, targetSets, totalVolume, unit: preferredUnit };
	})();

	const currentExerciseName = exerciseList[currentExerciseIndex]?.[1].meta.name;
	const nextExerciseName = exerciseList[currentExerciseIndex + 1]?.[1].meta.name;
	const hasPendingCardioSaves = pendingCardioSaveCount > 0;
	const isWorkoutCompleting = isCompleting || isCompletingWithEditedTime;

	const jumpToCurrentExercise = () => {
		const currentExerciseKey = exerciseList[currentExerciseIndex]?.[0];
		if (!currentExerciseKey) return;
		const element = exerciseRefs.current.get(currentExerciseKey);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	};

	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
				<div className="flex h-14 items-center justify-between gap-3 px-4">
					<div className="min-w-0 flex-1">
						<h1 className="truncate font-semibold">
							{workout.title ?? "Workout"}
						</h1>
						<div className="flex items-center gap-2">
							<p className="text-xs text-muted-foreground font-mono tabular-nums">
								{duration}
							</p>
							<Button
								variant="ghost"
								size="sm"
								className="h-auto px-1.5 py-0 text-xs text-muted-foreground"
								onClick={handleOpenTimeEditor}
								disabled={hasPendingCardioSaves || isWorkoutCompleting}
							>
								Edit time
							</Button>
						</div>
					</div>
					<div className="flex shrink-0 gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowCancelDialog(true)}
							disabled={isCancelling}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleComplete}
							disabled={hasPendingCardioSaves || isWorkoutCompleting}
							aria-describedby={
								hasPendingCardioSaves ? "cardio-save-status" : undefined
							}
						>
							{hasPendingCardioSaves
								? "Saving..."
								: isWorkoutCompleting
									? "Finishing..."
									: "Finish"}
						</Button>
						<span
							id="cardio-save-status"
							className="sr-only"
							role="status"
							aria-live="polite"
						>
							{hasPendingCardioSaves
								? `${pendingCardioSaveCount} cardio ${
										pendingCardioSaveCount === 1 ? "entry is" : "entries are"
									} still saving.`
								: ""}
						</span>
					</div>
				</div>
			</header>

			<div className="px-4 pt-4">
				<SessionCommandCenter
					duration={duration}
					exerciseCount={exerciseList.length}
					currentExerciseName={currentExerciseName}
					nextExerciseName={nextExerciseName}
					loggedSets={sessionStats.loggedSets}
					targetSets={sessionStats.targetSets}
					totalVolume={sessionStats.totalVolume}
					unit={sessionStats.unit}
					onJumpToCurrent={jumpToCurrentExercise}
				/>
			</div>

			<main className="flex-1 space-y-4 p-4">
				{Array.from(exerciseGroups.entries()).map(
					([groupKey, { entries: groupEntries, meta }], index) => {
						const name = meta.name;
						const getExerciseStatus = ():
							| "completed"
							| "current"
							| "upcoming" => {
							if (index < currentExerciseIndex) return "completed";
							if (index === currentExerciseIndex) return "current";
							return "upcoming";
						};

						if (meta.category === "cardio") {
							const loggedCardioEntry = groupEntries.find(
								(entry) => entry.kind === "cardio"
							);
							const status = getExerciseStatus();

							return (
								<div
									key={groupKey}
									ref={(el) => {
										if (el) exerciseRefs.current.set(groupKey, el);
									}}
								>
									<CardioExerciseCard
										exerciseName={name}
										primaryMetric={meta.primaryMetric ?? "duration"}
										unit={preferredUnit}
										status={status}
										defaultMinutes={meta.targetDurationMinutes}
										note={getExerciseNote(name)}
										loggedData={loggedCardioEntry?.cardio}
										onLog={(data) => handleLogCardio(name, data)}
										onNoteChange={(note: string) =>
											handleNoteChange(name, note)
										}
										onSelect={() => {
											setManualNavigation(true);
											setCurrentExerciseIndex(index);
										}}
									/>
								</div>
							);
						}

						if (meta.measurementType === "duration") {
							const timedSets = groupEntries
								.filter(
									(entry) =>
										entry.kind === "lifting" &&
										entry.lifting?.durationSeconds !== undefined
								)
								.map((entry) => ({
									entryId: entry._id,
									setNumber: entry.lifting!.setNumber,
									durationSeconds: entry.lifting!.durationSeconds!,
									rpe: entry.lifting!.rpe ?? null,
								}));

							return (
								<div
									key={groupKey}
									ref={(element) => {
										if (element) exerciseRefs.current.set(groupKey, element);
									}}
								>
									<TimedExerciseAccordionWithHistory
										exerciseName={name}
										sets={timedSets}
										status={getExerciseStatus()}
										targetSets={meta.targetSets}
										targetDurationSeconds={meta.targetHoldSeconds}
										note={getExerciseNote(name)}
										onAddSet={(set) => handleAddTimedSet(name, set)}
										onEditSet={(set) => handleEditTimedSet(name, set)}
										onSwap={() => setSwapExercise({ groupKey, name })}
										onNoteChange={(note) => handleNoteChange(name, note)}
										onSelect={() => {
											setManualNavigation(true);
											setCurrentExerciseIndex(index);
										}}
									/>
								</div>
							);
						}

						const sets = groupEntries
							.filter((e) => e.kind === "lifting" && e.lifting)
							.map((e) => {
								const sourceUnit = e.lifting!.unit ?? "lb";
								return {
									entryId: e._id,
									setNumber: e.lifting!.setNumber,
									reps: e.lifting!.reps ?? 0,
									weight: displayWeight(
										e.lifting!.weight ?? 0,
										sourceUnit,
										preferredUnit
									),
									unit: preferredUnit,
									isBodyweight: e.lifting!.isBodyweight,
									rpe: e.lifting!.rpe ?? null,
								};
							});

						const parseTargetReps = (
							targetReps?: string
						): number | undefined => {
							if (!targetReps) return undefined;
							const match = targetReps.match(/\d+/);
							return match ? parseInt(match[0], 10) : undefined;
						};

						const status = getExerciseStatus();

						return (
							<div
								key={groupKey}
								ref={(el) => {
									if (el) exerciseRefs.current.set(groupKey, el);
								}}
							>
								<ExerciseAccordionWithHistory
									exerciseName={name}
									sets={sets}
									status={status}
									unit={preferredUnit}
									equipment={meta.equipment}
									defaultReps={parseTargetReps(meta.targetReps)}
									targetSets={meta.targetSets}
									targetReps={meta.targetReps}
									note={getExerciseNote(name)}
								onAddSet={(set: {
									reps: number;
									weight: number;
									unit: "lb" | "kg";
									isBodyweight?: boolean;
									rpe?: number | null;
								}) => handleAddSet(name, set)}
									onEditSet={(set: {
										entryId?: string;
										setNumber: number;
										reps: number;
										weight: number;
										unit: "lb" | "kg";
										isBodyweight?: boolean;
										rpe?: number | null;
									}) => handleEditSet(name, set)}
									onSwap={() => setSwapExercise({ groupKey, name })}
									onNoteChange={(note: string) => handleNoteChange(name, note)}
									onSelect={() => {
										setManualNavigation(true);
										setCurrentExerciseIndex(index);
									}}
								/>
							</div>
						);
					}
				)}

				<Button
					variant="outline"
					size="lg"
					className="h-16 w-full text-lg"
					onClick={() => setShowAddExercise(true)}
				>
					+ Add Exercise
				</Button>
			</main>

			<AddExerciseSheet
				open={showAddExercise}
				onOpenChange={setShowAddExercise}
				onSelectExercise={handleAddExercise}
			/>

			<SaveAsRoutineDialog
				open={showSaveRoutine}
				onOpenChange={setShowSaveRoutine}
				workoutId={workout._id}
				workoutTitle={workout.title}
				onComplete={handleRoutineDialogComplete}
			/>

			{swapExercise && (
				<SmartSwapSheet
					open={!!swapExercise}
					onOpenChange={(open) => !open && setSwapExercise(null)}
					workoutId={workout._id}
					exerciseName={swapExercise.name}
					onSwapComplete={(selection) =>
						handleSwapComplete(swapExercise, selection)
					}
				/>
			)}

			<SwapFollowUpDialog
				open={showSwapFollowUp}
				onOpenChange={setShowSwapFollowUp}
				swaps={pendingSwaps ?? []}
				onComplete={handleSwapFollowUpComplete}
			/>

			<EditSetSheet
				set={editingSet}
				onOpenChange={(open) => !open && setEditingSet(null)}
				onSave={handleUpdateSet}
				onDelete={handleDeleteSet}
			/>

			{showTimeEditor && (
				<WorkoutTimeEditorDialog
					open={showTimeEditor}
					onOpenChange={setShowTimeEditor}
					initialStartedAt={workout.startedAt}
					initialCompletedAt={timeEditorInitialEnd ?? Date.now()}
					mode="finish"
					onSubmit={handleCompleteWithEditedTime}
					isSubmitting={isCompletingWithEditedTime}
				/>
			)}

			<Dialog
				open={showCancelDialog}
				onOpenChange={(open) => {
					if (!isCancelling) {
						setShowCancelDialog(open);
					}
				}}
			>
				<DialogContent className="max-w-sm" showCloseButton={!isCancelling}>
					<DialogHeader>
						<DialogTitle>Cancel workout?</DialogTitle>
						<DialogDescription>
							Cancelling will discard all progress from your current workout.
							This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowCancelDialog(false)}
							disabled={isCancelling}
						>
							Keep Workout
						</Button>
						<Button
							variant="destructive"
							onClick={handleConfirmCancel}
							disabled={isCancelling}
						>
							{isCancelling ? "Cancelling..." : "Cancel Workout"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{showRestTimer && (
				<RestTimerOverlay
					durationSeconds={90}
					onComplete={() => setShowRestTimer(false)}
					onSkip={() => setShowRestTimer(false)}
				/>
			)}
		</div>
	);
}
