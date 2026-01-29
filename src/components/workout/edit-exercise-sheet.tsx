"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Dumbbell, Heart, Activity, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export type RoutineExercise = {
	id: string;
	exerciseId?: Id<"exercises">;
	exerciseName: string;
	kind: "lifting" | "cardio" | "mobility";
	targetSets: number;
	targetReps: string;
	targetDuration?: number;
	targetHoldSeconds?: number;
	perSide?: boolean;
	restSeconds: number;
};

interface EditExerciseSheetProps {
	exercise: RoutineExercise | null;
	onOpenChange: (open: boolean) => void;
	onSave: (exercise: RoutineExercise) => void;
	onDelete: (exerciseId: string) => void;
}

const REST_PRESETS = [60, 90, 120, 180];

export function EditExerciseSheet({
	exercise,
	onOpenChange,
	onSave,
	onDelete,
}: EditExerciseSheetProps) {
	return (
		<Drawer open={!!exercise} onOpenChange={onOpenChange}>
			{exercise && (
				<EditExerciseForm
					key={exercise.id}
					exercise={exercise}
					onOpenChange={onOpenChange}
					onSave={onSave}
					onDelete={onDelete}
				/>
			)}
		</Drawer>
	);
}

function EditExerciseForm({
	exercise,
	onOpenChange,
	onSave,
	onDelete,
}: {
	exercise: RoutineExercise;
	onOpenChange: (open: boolean) => void;
	onSave: (exercise: RoutineExercise) => void;
	onDelete: (exerciseId: string) => void;
}) {
	const [name, setName] = useState(exercise.exerciseName);
	const [kind, setKind] = useState<"lifting" | "cardio" | "mobility">(
		exercise.kind
	);
	const [sets, setSets] = useState(exercise.targetSets);
	const [reps, setReps] = useState(exercise.targetReps);
	const [duration, setDuration] = useState(exercise.targetDuration ?? 20);
	const [holdSeconds, setHoldSeconds] = useState(
		exercise.targetHoldSeconds ?? 30
	);
	const [perSide, setPerSide] = useState(exercise.perSide ?? false);
	const [rest, setRest] = useState(exercise.restSeconds);

	useEffect(() => {
		setName(exercise.exerciseName);
		setKind(exercise.kind);
		setSets(exercise.targetSets);
		setReps(exercise.targetReps);
		setDuration(exercise.targetDuration ?? 20);
		setHoldSeconds(exercise.targetHoldSeconds ?? 30);
		setPerSide(exercise.perSide ?? false);
		setRest(exercise.restSeconds);
	}, [exercise]);

	const createExercise = useMutation(api.exercises.createExercise);
	const updateExercise = useMutation(api.exercises.updateExercise);
	const exerciseData = useQuery(
		api.exercises.getExercise,
		exercise.exerciseId ? { id: exercise.exerciseId } : "skip"
	);
	const availableMuscleGroups = useQuery(api.exercises.getMuscleGroups, {});

	const [muscleGroups, setMuscleGroups] = useState<string[]>([]);

	useEffect(() => {
		if (exerciseData?.muscleGroups) {
			setMuscleGroups(exerciseData.muscleGroups);
		} else {
			setMuscleGroups([]);
		}
	}, [exerciseData, exercise.exerciseId]);

	const toggleMuscleGroup = (muscle: string) => {
		if (exerciseData?.isSystemExercise) {
			return;
		}
		setMuscleGroups((prev) =>
			prev.includes(muscle)
				? prev.filter((m) => m !== muscle)
				: [...prev, muscle]
		);
	};

	const isSystemExercise = exerciseData?.isSystemExercise ?? false;

	const handleSave = async () => {
		if (kind === "lifting" && muscleGroups.length === 0 && !isSystemExercise) {
			toast.error("Please select at least one muscle group for lifting exercises");
			return;
		}

		let exerciseId = exercise.exerciseId;

		if (kind === "lifting" && !isSystemExercise) {
			if (exerciseId) {
				try {
					await updateExercise({
						id: exerciseId,
						muscleGroups,
						name,
					});
				} catch (error) {
					toast.error("Failed to update exercise");
					console.error(error);
					return;
				}
			} else {
				try {
					exerciseId = await createExercise({
						name,
						category: kind,
						muscleGroups,
					});
				} catch (error) {
					toast.error("Failed to create exercise");
					console.error(error);
					return;
				}
			}
		}

		onSave({
			...exercise,
			exerciseId,
			exerciseName: name,
			kind,
			targetSets: sets,
			targetReps: reps,
			targetDuration: duration,
			targetHoldSeconds: holdSeconds,
			perSide,
			restSeconds: rest,
		});
		onOpenChange(false);
	};

	const handleDelete = () => {
		onDelete(exercise.id);
		onOpenChange(false);
	};

	const formatRest = (seconds: number) => {
		if (seconds >= 60) {
			const mins = Math.floor(seconds / 60);
			const secs = seconds % 60;
			return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
		}
		return `${seconds}s`;
	};

	return (
		<DrawerContent className="h-[85vh] flex flex-col">
			<DrawerHeader>
				<DrawerTitle>Edit Exercise</DrawerTitle>
				<DrawerDescription>
					Configure sets, reps, and rest time
				</DrawerDescription>
			</DrawerHeader>

			<div className="flex-1 overflow-y-auto px-4 space-y-6">
				<div className="space-y-2">
					<Label>Exercise Name</Label>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Exercise name"
						className="h-12 text-lg"
						disabled={isSystemExercise}
					/>
				</div>

				<div className="space-y-3">
					<Label>Type</Label>
					<Tabs
						value={kind}
						onValueChange={(v) =>
							setKind(v as "lifting" | "cardio" | "mobility")
						}
					>
						<TabsList className="grid w-full grid-cols-3 h-12">
							<TabsTrigger value="lifting" className="h-10 gap-2" disabled={isSystemExercise}>
								<Dumbbell className="h-4 w-4" />
								Lifting
							</TabsTrigger>
							<TabsTrigger value="cardio" className="h-10 gap-2" disabled={isSystemExercise}>
								<Heart className="h-4 w-4" />
								Cardio
							</TabsTrigger>
							<TabsTrigger value="mobility" className="h-10 gap-2" disabled={isSystemExercise}>
								<Activity className="h-4 w-4" />
								Mobility
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{kind === "lifting" ? (
					<>
						<div className="space-y-3">
							<Label>
								Muscle Groups
								{isSystemExercise && (
									<span className="ml-2 text-xs text-muted-foreground font-normal">
										(read-only)
									</span>
								)}
							</Label>
							<div className="flex flex-wrap gap-2">
								{!availableMuscleGroups ? (
									<p className="text-sm text-muted-foreground">Loading muscle groups...</p>
								) : (
									availableMuscleGroups.map((muscle) => (
										<Badge
											key={muscle}
											variant={muscleGroups.includes(muscle) ? "default" : "outline"}
											className={`capitalize h-10 px-4 text-sm font-medium ${
												isSystemExercise ? "opacity-60" : "cursor-pointer"
											}`}
											onClick={() => toggleMuscleGroup(muscle)}
										>
											{muscle}
											{muscleGroups.includes(muscle) && !isSystemExercise && (
												<X className="ml-1.5 h-3.5 w-3.5" />
											)}
										</Badge>
									))
								)}
							</div>
							{muscleGroups.length === 0 && !isSystemExercise && (
								<p className="text-sm text-muted-foreground">
									Select at least one muscle group
								</p>
							)}
							{isSystemExercise && (
								<p className="text-sm text-muted-foreground">
									Muscle groups are predefined for this exercise
								</p>
							)}
						</div>

						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<Label>Sets</Label>
								<span className="text-2xl font-mono font-bold tabular-nums">
									{sets}
								</span>
							</div>
							<div className="flex items-center gap-3">
								<Button
									variant="outline"
									size="icon"
									className="h-12 w-12 text-lg"
									onClick={() => setSets(Math.max(1, sets - 1))}
								>
									−
								</Button>
								<Slider
									value={[sets]}
									onValueChange={([v]) => setSets(v)}
									min={1}
									max={10}
									step={1}
									className="flex-1"
								/>
								<Button
									variant="outline"
									size="icon"
									className="h-12 w-12 text-lg"
									onClick={() => setSets(Math.min(10, sets + 1))}
								>
									+
								</Button>
							</div>
						</div>

						<div className="space-y-3">
							<Label>Reps</Label>
							<div className="grid grid-cols-4 gap-2">
								{["5", "8", "10", "12"].map((preset) => (
									<Button
										key={preset}
										variant={reps === preset ? "default" : "outline"}
										className="h-12 font-mono"
										onClick={() => setReps(preset)}
									>
										{preset}
									</Button>
								))}
							</div>
							<div className="grid grid-cols-3 gap-2">
								{["6-8", "8-12", "12-15"].map((preset) => (
									<Button
										key={preset}
										variant={reps === preset ? "default" : "outline"}
										className="h-12 font-mono"
										onClick={() => setReps(preset)}
									>
										{preset}
									</Button>
								))}
							</div>
							<Input
								value={reps}
								onChange={(e) => setReps(e.target.value)}
								placeholder="Custom (e.g., AMRAP)"
								className="h-12 text-center font-mono"
							/>
						</div>

						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<Label>Rest Between Sets</Label>
								<span className="text-lg font-mono font-semibold">
									{formatRest(rest)}
								</span>
							</div>
							<div className="grid grid-cols-4 gap-2">
								{REST_PRESETS.map((preset) => (
									<Button
										key={preset}
										variant={rest === preset ? "default" : "outline"}
										className="h-12"
										onClick={() => setRest(preset)}
									>
										{formatRest(preset)}
									</Button>
								))}
							</div>
							<Slider
								value={[rest]}
								onValueChange={([v]) => setRest(v)}
								min={30}
								max={300}
								step={15}
							/>
						</div>
					</>
				) : kind === "cardio" ? (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<Label>Duration</Label>
							<span className="text-2xl font-mono font-bold tabular-nums">
								{duration} min
							</span>
						</div>
						<div className="grid grid-cols-4 gap-2">
							{[10, 20, 30, 45].map((preset) => (
								<Button
									key={preset}
									variant={duration === preset ? "default" : "outline"}
									className="h-12 font-mono"
									onClick={() => setDuration(preset)}
								>
									{preset}m
								</Button>
							))}
						</div>
						<Slider
							value={[duration]}
							onValueChange={([v]) => setDuration(v)}
							min={5}
							max={90}
							step={5}
						/>
					</div>
				) : (
					<>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<Label>Sets</Label>
								<span className="text-2xl font-mono font-bold tabular-nums">
									{sets}
								</span>
							</div>
							<div className="flex items-center gap-3">
								<Button
									variant="outline"
									size="icon"
									className="h-12 w-12 text-lg"
									onClick={() => setSets(Math.max(1, sets - 1))}
								>
									−
								</Button>
								<Slider
									value={[sets]}
									onValueChange={([v]) => setSets(v)}
									min={1}
									max={10}
									step={1}
									className="flex-1"
								/>
								<Button
									variant="outline"
									size="icon"
									className="h-12 w-12 text-lg"
									onClick={() => setSets(Math.min(10, sets + 1))}
								>
									+
								</Button>
							</div>
						</div>

						<div className="space-y-3">
							<Label>Reps</Label>
							<div className="grid grid-cols-4 gap-2">
								{["5", "10", "15", "20"].map((preset) => (
									<Button
										key={preset}
										variant={reps === preset ? "default" : "outline"}
										className="h-12 font-mono"
										onClick={() => setReps(preset)}
									>
										{preset}
									</Button>
								))}
							</div>
							<Input
								value={reps}
								onChange={(e) => setReps(e.target.value)}
								placeholder="Reps (leave empty for hold)"
								className="h-12 text-center font-mono"
							/>
						</div>

						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<Label>Hold Duration</Label>
								<span className="text-2xl font-mono font-bold tabular-nums">
									{holdSeconds}s
								</span>
							</div>
							<div className="grid grid-cols-4 gap-2">
								{[15, 30, 45, 60].map((preset) => (
									<Button
										key={preset}
										variant={holdSeconds === preset ? "default" : "outline"}
										className="h-12 font-mono"
										onClick={() => setHoldSeconds(preset)}
									>
										{preset}s
									</Button>
								))}
							</div>
							<Slider
								value={[holdSeconds]}
								onValueChange={([v]) => setHoldSeconds(v)}
								min={5}
								max={120}
								step={5}
							/>
						</div>

						<div className="flex items-center justify-between py-2">
							<Label>Per Side</Label>
							<Button
								variant={perSide ? "default" : "outline"}
								size="sm"
								onClick={() => setPerSide(!perSide)}
							>
								{perSide ? "Yes" : "No"}
							</Button>
						</div>
					</>
				)}

				<Button
					variant="ghost"
					className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
					onClick={handleDelete}
				>
					<Trash2 className="mr-2 h-4 w-4" />
					Remove Exercise
				</Button>
			</div>

			<DrawerFooter className="flex-row gap-2">
				<Button
					variant="outline"
					className="flex-1"
					onClick={() => onOpenChange(false)}
				>
					Cancel
				</Button>
				<Button className="flex-1" onClick={handleSave}>
					Save Changes
				</Button>
			</DrawerFooter>
		</DrawerContent>
	);
}
