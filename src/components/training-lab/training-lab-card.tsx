"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, Sparkles } from "lucide-react";
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
			<Link href="/training-lab" className="block">
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
									FREE IN ALPHA
								</span>
							</div>
							<p className="text-xs text-muted-foreground truncate">
								AI insights on volume, intensity & recovery
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-1 text-xs text-violet-500">
							<Sparkles className="h-3 w-3" />
							<span className="hidden sm:inline">Try Free</span>
						</div>
					</div>
				</Card>
			</Link>
		);
	}

	if (!ctaState.canGenerate && ctaState.totalWorkouts === 0) {
		return (
			<Card className="p-4">
				<div className="mb-2 flex items-center gap-2">
					<FlaskConical className="h-5 w-5 text-violet-500" />
					<span className="font-semibold">Training Lab</span>
					<span className="ml-auto rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-500">
						ALPHA
					</span>
				</div>
				<p className="text-sm text-muted-foreground">{ctaState.message}</p>
			</Card>
		);
	}

	return (
		<Card className="relative overflow-hidden p-4">
			<div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-purple-500/5" />
			<div className="relative">
				<div className="mb-2 flex items-center gap-2">
					<FlaskConical className="h-5 w-5 text-violet-500" />
					<span className="font-semibold">Training Lab</span>
					<span className="ml-auto rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-500">
						ALPHA
					</span>
				</div>
				<p className="mb-3 text-sm">{ctaState.message}</p>
				<Button size="sm" className="w-full gap-2" asChild disabled={!ctaState.canGenerate}>
					<Link href="/training-lab">
						<Sparkles className="h-4 w-4" />
						{ctaState.hasReport ? "View Analysis" : "Generate Analysis"}
					</Link>
				</Button>
			</div>
		</Card>
	);
}
