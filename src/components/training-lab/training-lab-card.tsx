"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, Lock, Sparkles } from "lucide-react";
import Link from "next/link";

export function TrainingLabCard() {
	const ctaState = useQuery(api.ai.trainingLabMutations.getCtaState);

	if (ctaState === undefined) {
		return <Skeleton className="h-32 w-full rounded-lg" />;
	}

	if (ctaState === null || !ctaState.show) {
		return null;
	}

	if (!ctaState?.isPro) {
		return (
			<Link href="/pricing" className="block">
				<Card className="relative overflow-hidden p-3 transition-colors hover:bg-muted/50">
					<div className="absolute inset-0 bg-linear-to-r from-violet-500/5 to-purple-500/10" />
					<div className="relative flex items-center gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
							<FlaskConical className="h-4 w-4 text-violet-500" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<span className="font-medium text-sm">Training Lab</span>
								<span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-500">
									PRO
								</span>
							</div>
							<p className="text-xs text-muted-foreground truncate">
								AI insights on volume, intensity & recovery
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
							<Lock className="h-3 w-3" />
							<span className="hidden sm:inline">Unlock</span>
						</div>
					</div>
				</Card>
			</Link>
		);
	}

	if (ctaState.reportType === "none") {
		const progress = (ctaState.workoutsSinceLastReport / 3) * 100;
		return (
			<Card className="p-4">
				<div className="mb-2 flex items-center gap-2">
					<FlaskConical className="h-5 w-5 text-violet-500" />
					<span className="font-semibold">Training Lab</span>
					<span className="ml-auto rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-500">
						PRO
					</span>
				</div>
				<p className="mb-3 text-sm text-muted-foreground">{ctaState.message}</p>
				<div className="flex items-center gap-2">
					<Progress value={progress} className="h-2" />
					<span className="text-xs font-mono text-muted-foreground">
						{ctaState.workoutsSinceLastReport}/3
					</span>
				</div>
			</Card>
		);
	}

	const isSnapshot = ctaState.reportType === "snapshot";

	return (
		<Card className="relative overflow-hidden p-4">
			<div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-purple-500/5" />
			<div className="relative">
				<div className="mb-2 flex items-center gap-2">
					<FlaskConical className="h-5 w-5 text-violet-500" />
					<span className="font-semibold">Training Lab</span>
					<span className="ml-auto rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-500">
						PRO
					</span>
				</div>
				<p className="mb-3 text-sm">{ctaState.message}</p>
				{isSnapshot && (
					<div className="mb-3 flex items-center gap-2">
						<Progress
							value={(ctaState.workoutsSinceLastReport / 5) * 100}
							className="h-2"
						/>
						<span className="text-xs font-mono text-muted-foreground">
							{ctaState.workoutsSinceLastReport}/5
						</span>
					</div>
				)}
				<Button size="sm" className="w-full gap-2" asChild>
					<Link href="/training-lab">
						<Sparkles className="h-4 w-4" />
						{isSnapshot ? "Generate Snapshot" : "Generate Full Report"}
					</Link>
				</Button>
			</div>
		</Card>
	);
}
