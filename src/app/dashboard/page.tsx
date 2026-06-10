"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { StartWorkoutSheet } from "@/components/workout/start-workout-sheet";
import { WeeklyStatsGrid, GoalSettingDialog } from "@/components/dashboard";
import { DashboardBriefCard } from "@/components/dashboard/dashboard-brief-card";
import { TrainingLabCard } from "@/components/training-lab/training-lab-card";
import { AsciiLogo } from "@/components/ui/ascii-logo";
import { formatDuration } from "@/lib/utils";
import posthog from "posthog-js";

export default function DashboardPage() {
	const router = useRouter();
	const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

	const user = useQuery(api.users.getCurrentUser);
	const activeWorkout = useQuery(api.workouts.getActiveWorkout);
	const workoutHistory = useQuery(api.workouts.getWorkoutHistory, { limit: 3 });
	const dashboardStats = useQuery(api.workouts.getDashboardStats);

	const getOrCreateUser = useMutation(api.users.getOrCreateUser);
	const updateWeeklyGoal = useMutation(api.workouts.updateWeeklyGoal);

	const [showStartSheet, setShowStartSheet] = useState(false);
	const [showGoalDialog, setShowGoalDialog] = useState(false);

	useEffect(() => {
		if (isClerkLoaded && clerkUser && user === null) {
			getOrCreateUser({
				clerkId: clerkUser.id,
				email: clerkUser.primaryEmailAddress?.emailAddress,
				name: clerkUser.fullName ?? undefined,
				imageUrl: clerkUser.imageUrl,
			})
				.then((result) => {
					if (result && (result as { isNew?: boolean }).isNew) {
						// Identify + capture new sign-up
						posthog.identify(clerkUser.id, {
							name: clerkUser.fullName,
							email: clerkUser.primaryEmailAddress?.emailAddress,
						});
						posthog.capture("user_signed_up", {
							clerk_id: clerkUser.id,
						});
					} else {
						// Identify returning user
						posthog.identify(clerkUser.id, {
							name: clerkUser.fullName,
							email: clerkUser.primaryEmailAddress?.emailAddress,
						});
					}
				})
				.catch(console.error);
		}
	}, [isClerkLoaded, clerkUser, user, getOrCreateUser]);

	useEffect(() => {
		if (user && !user.onboardingCompletedAt) {
			router.replace("/onboarding");
		}
	}, [user, router]);

	if (!isClerkLoaded || user === undefined) {
		return (
			<div className="flex min-h-screen flex-col p-4">
				<Skeleton className="mb-6 h-10 w-48" />
				<Skeleton className="mb-4 h-40 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		);
	}

	if (user === null) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center p-4">
				<Skeleton className="h-8 w-32" />
				<p className="mt-2 text-sm text-muted-foreground">
					Setting up your account...
				</p>
			</div>
		);
	}

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	};

	const formatCardioDuration = (seconds: number) => {
		const hours = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		if (hours > 0) {
			return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
		}
		return `${mins}m`;
	};

	const handleSaveGoal = async (newGoal: number) => {
		await updateWeeklyGoal({ weeklyGoal: newGoal });
		posthog.capture("weekly_goal_updated", {
			new_goal: newGoal,
			previous_goal: dashboardStats?.weeklyGoal,
		});
	};

	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
				<div className="flex h-14 items-center justify-between px-4">
					<div className="flex items-center gap-2">
						<AsciiLogo />
						<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
							Alpha
						</span>
					</div>
					<UserButton />
				</div>
			</header>

			<main className="flex-1 space-y-4 p-4 pb-24">
				<h1 className="sr-only">Dashboard</h1>

				{dashboardStats && activeWorkout !== undefined && workoutHistory !== undefined ? (
					<DashboardBriefCard
						weeklyWorkoutCount={dashboardStats.weeklyWorkoutCount}
						weeklyGoal={dashboardStats.weeklyGoal}
						weeklyTotalSets={dashboardStats.weeklyTotalSets}
						weeklyTotalDuration={dashboardStats.weeklyTotalDuration}
						hasActiveWorkout={!!activeWorkout}
						hasHistory={(workoutHistory?.length ?? 0) > 0}
						onStartWorkout={() => setShowStartSheet(true)}
						onContinueWorkout={() => router.push("/workout/active")}
					/>
				) : (
					<Skeleton className="h-36 w-full rounded-lg" />
				)}

				{dashboardStats ? (
					<WeeklyStatsGrid
						workoutCount={dashboardStats.weeklyWorkoutCount}
						workoutGoal={dashboardStats.weeklyGoal}
						totalSets={dashboardStats.weeklyTotalSets}
						totalVolume={dashboardStats.weeklyTotalVolume}
						totalDuration={dashboardStats.weeklyTotalDuration}
						unit={dashboardStats.preferredUnits}
						currentWeek={dashboardStats.currentWeek}
						onEditGoal={() => setShowGoalDialog(true)}
					/>
				) : (
					<Skeleton className="h-40 w-full rounded-lg" />
				)}

				<TrainingLabCard />

				<section>
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
							Recent
						</h2>
						{workoutHistory && workoutHistory.length > 0 && (
							<Link
								href="/history"
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								View all
							</Link>
						)}
					</div>
					{workoutHistory === undefined ? (
						<div className="flex flex-col gap-4">
							<Skeleton className="h-28 w-full rounded-xl" />
							<Skeleton className="h-28 w-full rounded-xl" />
						</div>
					) : workoutHistory.length === 0 ? (
						<div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
							<p className="text-sm">No workouts yet</p>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							{workoutHistory.map((workout) => (
								<Link key={workout._id} href={`/workout/${workout._id}`}>
									<div className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
										<div className="flex items-start justify-between">
											<div className="space-y-1">
												<p className="font-semibold">
													{workout.title ?? "Workout"}
												</p>
												<p className="text-sm text-muted-foreground">
													{formatDate(workout.startedAt)}
												</p>
											</div>
										</div>
										<div className="mt-3 flex gap-4 border-t pt-3">
											<div>
												<p className="text-xs text-muted-foreground">
													Duration
												</p>
												<p className="font-mono font-medium">
													{formatDuration(
														workout.summary?.totalDurationMinutes,
														"—"
													)}
												</p>
											</div>
											{(workout.summary?.totalSets ?? 0) > 0 ? (
												<div>
													<p className="text-xs text-muted-foreground">Sets</p>
													<p className="font-mono font-medium">
														{workout.summary?.totalSets}
													</p>
												</div>
											) : workout.summary?.totalCardioDurationSeconds ? (
												<div>
													<p className="text-xs text-muted-foreground">Cardio</p>
													<p className="font-mono font-medium">
														{formatCardioDuration(workout.summary.totalCardioDurationSeconds)}
													</p>
												</div>
											) : null}
											<div>
												<p className="text-xs text-muted-foreground">
													Exercises
												</p>
												<p className="font-mono font-medium">
													{workout.summary?.exerciseCount ?? 0}
												</p>
											</div>
										</div>
									</div>
								</Link>
							))}
						</div>
					)}
				</section>
			</main>

			<BottomNav onStartWorkout={() => setShowStartSheet(true)} />
			<StartWorkoutSheet
				open={showStartSheet}
				onOpenChange={setShowStartSheet}
				activeWorkout={activeWorkout}
			/>
			<GoalSettingDialog
				open={showGoalDialog}
				onOpenChange={setShowGoalDialog}
				currentGoal={dashboardStats?.weeklyGoal ?? 4}
				onSave={handleSaveGoal}
			/>
		</div>
	);
}
