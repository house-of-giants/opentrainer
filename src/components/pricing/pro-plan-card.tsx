"use client";

import { useState } from "react";
import { CheckoutButton } from "@clerk/nextjs/experimental";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, Sparkles, TrendingUp, Shield } from "lucide-react";

const PLAN_ID = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID;

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

const pricing = {
	month: { price: 8, period: "month" as const, label: "Monthly" },
	annual: {
		price: 72,
		period: "annual" as const,
		label: "Annual",
		monthlyEquiv: 6,
		savings: "Save 25%",
	},
};

export function ProPlanCard() {
	const [billingPeriod, setBillingPeriod] = useState<"month" | "annual">(
		"month"
	);
	const selected = pricing[billingPeriod];

	if (!PLAN_ID) {
		console.error("NEXT_PUBLIC_CLERK_PRO_PLAN_ID is not set");
		return null;
	}

	return (
		<Card className="relative w-full max-w-sm overflow-hidden p-6">
			<div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-purple-500/10" />

			<div className="relative">
				<div className="mb-6 text-center">
					<h3 className="text-2xl font-bold">OpenTrainer Pro</h3>
					<p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
						Stop wondering if your program is working. Know it.
					</p>
				</div>

				<div className="mb-4 flex justify-center">
					<div className="inline-flex rounded-lg bg-muted p-1">
						<button
							type="button"
							onClick={() => setBillingPeriod("month")}
							className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
								billingPeriod === "month"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							Monthly
						</button>
						<button
							type="button"
							onClick={() => setBillingPeriod("annual")}
							className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
								billingPeriod === "annual"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							Annual
						</button>
					</div>
				</div>

				<div className="mb-6 text-center">
					{billingPeriod === "month" ? (
						<div className="flex items-baseline justify-center gap-1">
							<span className="text-4xl font-bold">$8</span>
							<span className="text-muted-foreground">/month</span>
						</div>
					) : (
						<>
							<div className="flex items-baseline justify-center gap-1">
								<span className="text-4xl font-bold">$6</span>
								<span className="text-muted-foreground">/month</span>
							</div>
							<p className="mt-1 text-sm text-muted-foreground">
								$72 billed annually ·{" "}
								<span className="font-medium text-green-600">Save 25%</span>
							</p>
						</>
					)}
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

				<CheckoutButton planId={PLAN_ID} planPeriod={selected.period}>
					<Button className="w-full gap-2 bg-violet-600 text-white hover:bg-violet-700">
						<Sparkles className="h-4 w-4" />
						Get Started
					</Button>
				</CheckoutButton>

				<p className="mt-3 text-center text-xs text-muted-foreground">
					Cancel anytime. No questions asked.
				</p>
			</div>
		</Card>
	);
}
