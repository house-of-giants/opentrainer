"use client";

import { Button } from "@/components/ui/button";
import {
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton,
} from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

export default function Home() {
	const user = useQuery(api.users.getCurrentUser);
	const isPro = user?.tier === "pro";

	return (
		<div className="flex min-h-screen flex-col">
			{/* Header */}
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
					<Link href="/" className="flex items-center space-x-2">
						<span className="font-bold text-xl">OpenTrainer</span>
					</Link>
					<nav className="flex items-center gap-2">
						<SignedOut>
							<SignInButton mode="modal">
								<Button variant="ghost" size="sm">
									Sign In
								</Button>
							</SignInButton>
							<SignUpButton mode="modal">
								<Button size="sm">Get Started</Button>
							</SignUpButton>
						</SignedOut>
						<SignedIn>
							<Link href="/dashboard">
								<Button variant="ghost" size="sm">
									Dashboard
								</Button>
							</Link>
							<UserButton afterSignOutUrl="/" />
						</SignedIn>
					</nav>
				</div>
			</header>

			<main className="flex-1">
				{/* Hero Section */}
				<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
					<div className="grid items-center gap-12 lg:grid-cols-2">
						<div className="flex flex-col gap-6">
							<h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
								Log workouts in seconds,
								<br />
								<span className="text-muted-foreground">not minutes.</span>
							</h1>
							<p className="max-w-xl text-lg text-muted-foreground">
								A minimal workout tracker built for the gym floor. Big buttons,
								fast logging, AI that actually helps. No bloat.
							</p>
							<div className="flex flex-wrap gap-4">
								<SignedOut>
									<SignUpButton mode="modal">
										<Button size="lg" className="min-h-12 px-8">
											Start Logging — Free
										</Button>
									</SignUpButton>
								</SignedOut>
								<SignedIn>
									<Link href="/dashboard">
										<Button size="lg" className="min-h-12 px-8">
											Go to Dashboard
										</Button>
									</Link>
								</SignedIn>
							</div>
							<p className="text-sm text-muted-foreground">
								Works on any device. No app install required.
							</p>
						</div>
						{/* Device Mockup */}
						<div className="flex justify-center lg:justify-end">
							<div className="relative">
								<div className="rounded-[2.5rem] border-8 border-foreground/10 bg-background p-2 shadow-2xl">
									{/* Phone frame */}
									<div className="h-[500px] w-[250px] overflow-hidden rounded-[2rem] bg-muted sm:h-[600px] sm:w-[300px]">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src="/images/app/dashboard.webp"
								alt="OpenTrainer app screenshot"
								className="h-full w-full object-cover"
							/>
								</div>
							</div>
						</div>
						</div>
					</div>
				</section>

				{/* Trust Bar */}
				<section className="border-y bg-muted/20">
					<div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-4 px-4 py-8 sm:flex-row sm:gap-12 sm:px-6 lg:px-8">
						<p className="text-sm text-muted-foreground">
							Built by lifters, for lifters
						</p>
						<p className="text-sm text-muted-foreground">Works offline</p>
						<p className="text-sm text-muted-foreground">
							Export your data anytime
						</p>
					</div>
				</section>

				{/* Features with Screenshots */}
				<section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
					<div className="mb-12 text-center">
						<h2 className="text-3xl font-bold tracking-tight">
							Everything you need. Nothing you don&apos;t.
						</h2>
						<p className="mt-2 text-muted-foreground">
							Most apps make you tap through 5 screens to log a set. We made it
							2.
						</p>
					</div>
					<div className="grid gap-8 md:grid-cols-3">
						<FeatureCard
							title="Gym-Floor Fast"
							description="Log sets between reps, not after your session. Works with sweaty hands, bad signal, and zero patience."
							imageSrc="/images/app/active-workout.webp"
						/>
						<FeatureCard
							title="AI That Helps"
							description="Generate routines based on your goals and equipment. Not AI that makes you watch ads."
							imageSrc="/images/app/routine-create.webp"
						/>
						<FeatureCard
							title="Your Data, Always"
							description="Export everything as JSON. No lock-in, no hostage data. Switch anytime."
							imageSrc="/images/app/export.webp"
						/>
					</div>
				</section>

				{/* How It Works */}
				<section className="border-y bg-muted/20">
					<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<div className="mb-12 text-center">
							<h2 className="text-3xl font-bold tracking-tight">
								How it works
							</h2>
							<p className="mt-2 text-muted-foreground">
								From zero to lifting in under a minute.
							</p>
						</div>
						<div className="grid gap-8 md:grid-cols-3">
							<StepCard
								step="1"
								title="Sign up"
								description="Create an account in seconds. No credit card, no commitment."
							/>
							<StepCard
								step="2"
								title="Start a workout"
								description="Tap an exercise, set your weight and reps, start logging."
							/>
							<StepCard
								step="3"
								title="Track progress"
								description="See your history, PRs, and trends. Export anytime."
							/>
						</div>
					</div>
				</section>

				{/* Why OpenTrainer */}
				<section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
					<div className="mb-12 text-center">
						<h2 className="text-3xl font-bold tracking-tight">
							Why we built this
						</h2>
					</div>
					<div className="mx-auto max-w-2xl space-y-6 text-center">
						<p className="text-lg text-muted-foreground">
							We got tired of workout apps that felt like tax software. Five
							taps to log a set. Subscriptions for basic features. Data locked
							behind paywalls.
						</p>
						<p className="text-lg text-muted-foreground">
							OpenTrainer is the app we wanted to use. Fast, focused, and
							respectful of your time and data.
						</p>
					</div>
				</section>

				{/* Pricing */}
				<section className="border-y bg-muted/20">
					<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<div className="mx-auto max-w-2xl text-center">
							<span className="mb-4 inline-block rounded-full bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-violet-600">
								Alpha — Pro is Free for Everyone
							</span>
							<h2 className="text-3xl font-bold tracking-tight">
								Simple pricing
							</h2>
							<p className="mt-2 text-muted-foreground">
								Everything is free while we&apos;re in alpha. Help us build the best workout tracker.
							</p>
						</div>
						<div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-2">
							{/* Free Tier */}
							<div className="flex flex-col rounded-lg border bg-card p-8">
								<h3 className="text-xl font-semibold">Free</h3>
								<div className="mt-4 text-4xl font-bold">$0</div>
								<p className="mt-1 text-sm text-muted-foreground">
									Forever free
								</p>
								<ul className="mt-8 flex-1 space-y-4 text-sm">
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>Unlimited workout logging</span>
									</li>
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>Exercise library</span>
									</li>
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>Workout history</span>
									</li>
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>Rest timer with haptics</span>
									</li>
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>1 AI-generated routine</span>
									</li>
								</ul>
								<SignedOut>
									<SignUpButton mode="modal">
										<Button variant="outline" className="mt-8 w-full" size="lg">
											Get Started
										</Button>
									</SignUpButton>
								</SignedOut>
							<SignedIn>
								<Link href="/dashboard" className="mt-8">
									<Button variant="outline" className="w-full" size="lg">
										{isPro ? "Go to Dashboard" : "Current Plan"}
									</Button>
								</Link>
							</SignedIn>
						</div>
						{/* Pro Tier */}
							<div className="flex flex-col rounded-lg border-2 border-primary bg-card p-8">
								<div className="flex items-center justify-between">
									<h3 className="text-xl font-semibold">Pro</h3>
									<span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600">
										Free in Alpha
									</span>
								</div>
								<div className="mt-4 flex items-baseline gap-2">
									<span className="text-4xl font-bold">$0</span>
									<span className="text-muted-foreground line-through">$8/mo</span>
								</div>
								<p className="mt-1 text-sm text-muted-foreground">
									Free while we&apos;re in alpha
								</p>
								<ul className="mt-8 flex-1 space-y-4 text-sm">
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>Everything in Free</span>
									</li>
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>Unlimited AI routines</span>
									</li>
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>Weekly performance assessments</span>
									</li>
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>Training Lab insights</span>
									</li>
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>Full JSON export</span>
									</li>
									<li className="flex items-start gap-3">
										<CheckIcon />
										<span>Priority sync</span>
									</li>
								</ul>
								<SignedOut>
									<SignUpButton mode="modal">
										<Button className="mt-8 w-full" size="lg">
											Get Started Free
										</Button>
									</SignUpButton>
								</SignedOut>
								<SignedIn>
									<Link href="/dashboard" className="mt-8">
										<Button className="w-full" size="lg">
											Go to Dashboard
										</Button>
									</Link>
								</SignedIn>
							</div>
						</div>
					</div>
				</section>

				{/* FAQ */}
				<section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
					<div className="mb-12 text-center">
						<h2 className="text-3xl font-bold tracking-tight">
							Frequently asked questions
						</h2>
					</div>
					<div className="space-y-4">
						<FAQItem
							question="Is my workout data private?"
							answer="Yes. We don't sell your data, ever. Your workouts are synced securely and you can export or delete everything at any time."
						/>
						<FAQItem
							question="Does it work offline?"
							answer="Yes. The app works offline and syncs your data when you're back online. Perfect for gyms with bad signal."
						/>
						<FAQItem
							question="Can I export my data?"
							answer="Absolutely. You can export your complete workout history as JSON. We believe in data portability—no lock-in."
						/>
						<FAQItem
							question="What makes the AI different?"
							answer="Our AI generates routines based on your actual goals, experience level, and available equipment. Not generic templates—personalized programs."
						/>
						<FAQItem
							question="Is everything really free during alpha?"
							answer="Yes! During our alpha period, all Pro features are completely free. This includes unlimited AI routines, Training Lab insights, and Smart Swap. No credit card required."
						/>
					</div>
				</section>

				{/* Final CTA */}
				<section className="border-t bg-muted/20">
					<div className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
						<h2 className="text-3xl font-bold tracking-tight">
							Ready to simplify your training?
						</h2>
						<p className="mx-auto mt-4 max-w-xl text-muted-foreground">
							No tracking pixels. No selling your data. Just a workout log that
							works.
						</p>
						<div className="mt-8">
							<SignedOut>
								<SignUpButton mode="modal">
									<Button size="lg" className="min-h-12 px-8">
										Start Logging — Free
									</Button>
								</SignUpButton>
							</SignedOut>
							<SignedIn>
								<Link href="/dashboard">
									<Button size="lg" className="min-h-12 px-8">
										Go to Dashboard
									</Button>
								</Link>
							</SignedIn>
						</div>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="border-t py-8">
				<div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-8">
					<p className="text-sm text-muted-foreground">
						© 2025 OpenTrainer. Pro is free during alpha.
					</p>
					<div className="flex gap-6 text-sm text-muted-foreground">
						<Link href="#" className="hover:text-foreground">
							Privacy
						</Link>
						<Link href="#" className="hover:text-foreground">
							Terms
						</Link>
						<Link href="#" className="hover:text-foreground">
							Contact
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}

function FeatureCard({
	title,
	description,
	imageSrc,
}: {
	title: string;
	description: string;
	imageSrc: string;
}) {
	return (
		<div className="overflow-hidden rounded-lg border bg-card">
			<div className="aspect-[4/3] w-full overflow-hidden bg-muted">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={imageSrc}
					alt={title}
					className="h-full w-full object-cover"
				/>
			</div>
			<div className="p-6">
				<h3 className="mb-2 font-semibold">{title}</h3>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}

function StepCard({
	step,
	title,
	description,
}: {
	step: string;
	title: string;
	description: string;
}) {
	return (
		<div className="flex flex-col items-center text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
				{step}
			</div>
			<h3 className="mt-4 font-semibold">{title}</h3>
			<p className="mt-2 text-sm text-muted-foreground">{description}</p>
		</div>
	);
}

function TestimonialCard({
	quote,
	name,
	role,
	avatarSrc,
}: {
	quote: string;
	name: string;
	role: string;
	avatarSrc: string;
}) {
	return (
		<div className="flex flex-col rounded-lg border bg-card p-6">
			<p className="flex-1 text-sm italic text-muted-foreground">
				&ldquo;{quote}&rdquo;
			</p>
			<div className="mt-6 flex items-center gap-3">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={avatarSrc}
					alt={name}
					className="h-10 w-10 rounded-full bg-muted"
				/>
				<div>
					<p className="text-sm font-medium">{name}</p>
					<p className="text-xs text-muted-foreground">{role}</p>
				</div>
			</div>
		</div>
	);
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="rounded-lg border bg-card">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex w-full items-center justify-between p-4 text-left"
			>
				<span className="font-medium">{question}</span>
				<span className="ml-4 text-xl text-muted-foreground">
					{isOpen ? "−" : "+"}
				</span>
			</button>
			{isOpen && (
				<div className="border-t px-4 py-3">
					<p className="text-sm text-muted-foreground">{answer}</p>
				</div>
			)}
		</div>
	);
}

function CheckIcon() {
	return (
		<svg
			className="h-5 w-5 flex-shrink-0 text-primary"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2}
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
		</svg>
	);
}
