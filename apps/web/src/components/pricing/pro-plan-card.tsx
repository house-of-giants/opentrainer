"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, Sparkles, TrendingUp, Shield } from "lucide-react";
import Link from "next/link";

const features = [
	{
		icon: FlaskConical,
		name: "AI Coach",
		description: "Training Lab + Smart Swap — your AI training partner",
	},
	{
		icon: TrendingUp,
		name: "Progress Clarity",
		description:
			"Know if you're actually progressing — or just spinning wheels",
	},
	{
		icon: Shield,
		name: "Overtraining Alerts",
		description: "Catch red flags before they become injuries",
	},
	{
		icon: Sparkles,
		name: "Weekly Insights",
		description: "30-second AI reports, not spreadsheet hours",
	},
];

export function ProPlanCard() {
	return (
		<Card className="relative w-full max-w-sm overflow-hidden p-6">
			<div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-purple-500/10" />

			<div className="relative">
				<div className="mb-4 flex justify-center">
					<span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600">
						Alpha — Free for Everyone
					</span>
				</div>

				<div className="mb-6 text-center">
					<h3 className="text-2xl font-bold">OpenTrainer Pro</h3>
					<p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
						Stop wondering if your program is working. Know it.
					</p>
				</div>

				<div className="mb-6 text-center">
					<div className="flex items-baseline justify-center gap-2">
						<span className="text-4xl font-bold">$0</span>
						<span className="text-muted-foreground line-through">$8/mo</span>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						Free while we&apos;re in alpha
					</p>
				</div>

				<ul className="mb-6 space-y-4">
					{features.map((feature) => (
						<li key={feature.name} className="flex gap-3">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
								<feature.icon className="h-4 w-4 text-violet-500" />
							</div>
							<div className="min-w-0">
								<p className="font-medium text-sm">{feature.name}</p>
								<p className="text-xs text-muted-foreground">
									{feature.description}
								</p>
							</div>
						</li>
					))}
				</ul>

				<Button className="w-full gap-2 bg-violet-600 text-white hover:bg-violet-700" asChild>
					<Link href="/dashboard">
						<Sparkles className="h-4 w-4" />
						Get Started Free
					</Link>
				</Button>

				<p className="mt-3 text-center text-xs text-muted-foreground">
					No credit card required during alpha.
				</p>
			</div>
		</Card>
	);
}
