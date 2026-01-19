import Link from "next/link";
import { AsciiLogo } from "@/components/ui/ascii-logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Privacy Policy - OpenTrainer",
	description: "Privacy Policy for OpenTrainer workout tracking application",
};

export default function PrivacyPage() {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
					<AsciiLogo />
				</div>
			</header>

			<main className="flex-1">
				<article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
					<h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
					<p className="text-muted-foreground mb-8">Last updated: January 19, 2026</p>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">Introduction</h2>
						<p className="text-muted-foreground leading-relaxed">
							OpenTrainer (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
							This Privacy Policy explains how we collect, use, and safeguard your information when you use our
							workout tracking application.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">Information We Collect</h2>

						<h3 className="text-lg font-medium mb-2 mt-4">Account Information</h3>
						<p className="text-muted-foreground mb-2">When you create an account, we collect:</p>
						<ul className="list-disc pl-6 text-muted-foreground space-y-1">
							<li>Email address</li>
							<li>Name (if provided)</li>
							<li>Profile picture (if provided via OAuth)</li>
						</ul>

						<h3 className="text-lg font-medium mb-2 mt-4">Workout Data</h3>
						<p className="text-muted-foreground mb-2">When you use OpenTrainer, we collect:</p>
						<ul className="list-disc pl-6 text-muted-foreground space-y-1">
							<li>Workout logs (exercises, sets, reps, weights)</li>
							<li>Cardio activities (duration, distance, intensity)</li>
							<li>Training goals and preferences</li>
							<li>Equipment availability</li>
							<li>Body measurements (if provided)</li>
						</ul>

						<h3 className="text-lg font-medium mb-2 mt-4">Usage Data</h3>
						<p className="text-muted-foreground mb-2">
							We collect anonymous usage analytics through Plausible Analytics, which does not use cookies and does not track individuals. This includes:
						</p>
						<ul className="list-disc pl-6 text-muted-foreground space-y-1">
							<li>Pages visited</li>
							<li>General geographic region (country level)</li>
							<li>Device type and browser</li>
						</ul>
					</section>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
						<p className="text-muted-foreground mb-2">We use your information to:</p>
						<ul className="list-disc pl-6 text-muted-foreground space-y-1">
							<li>Provide and maintain the OpenTrainer service</li>
							<li>Generate personalized AI workout recommendations</li>
							<li>Create performance assessments and insights</li>
							<li>Improve our application and AI features</li>
							<li>Respond to your requests and support inquiries</li>
						</ul>
					</section>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">AI Features and Data Processing</h2>
						<p className="text-muted-foreground leading-relaxed">
							Our AI features (Training Lab, Smart Swap, Routine Generation) process your workout data to provide
							personalized recommendations. This processing is done through Google Gemini via OpenRouter. Your data
							is not used to train AI models and is only used to generate your specific recommendations.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">Data Storage and Security</h2>
						<p className="text-muted-foreground leading-relaxed">
							Your data is stored securely using Convex, a real-time database platform. Authentication is handled
							by Clerk, a trusted authentication provider. We implement industry-standard security measures to
							protect your information.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">Data Sharing</h2>
						<p className="text-muted-foreground mb-2">We do not sell, trade, or rent your personal information. We may share data with:</p>
						<ul className="list-disc pl-6 text-muted-foreground space-y-1">
							<li><span className="font-medium text-foreground">Service Providers:</span> Convex (database), Clerk (authentication), Vercel (hosting), OpenRouter (AI processing)</li>
							<li><span className="font-medium text-foreground">Legal Requirements:</span> When required by law or to protect our rights</li>
						</ul>
					</section>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">Your Rights</h2>
						<p className="text-muted-foreground mb-2">You have the right to:</p>
						<ul className="list-disc pl-6 text-muted-foreground space-y-1">
							<li><span className="font-medium text-foreground">Access:</span> View all data we have about you</li>
							<li><span className="font-medium text-foreground">Export:</span> Download your workout data as JSON</li>
							<li><span className="font-medium text-foreground">Delete:</span> Request deletion of your account and all associated data</li>
							<li><span className="font-medium text-foreground">Correct:</span> Update or correct your personal information</li>
						</ul>
					</section>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">Data Retention</h2>
						<p className="text-muted-foreground leading-relaxed">
							We retain your data for as long as your account is active. If you delete your account, we will
							delete all associated data within 30 days, except where we are required to retain it for legal purposes.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">Children&apos;s Privacy</h2>
						<p className="text-muted-foreground leading-relaxed">
							OpenTrainer is not intended for children under 13. We do not knowingly collect information from
							children under 13. If you believe we have collected such information, please contact us immediately.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
						<p className="text-muted-foreground leading-relaxed">
							We may update this Privacy Policy from time to time. We will notify you of any changes by posting
							the new policy on this page and updating the &quot;Last updated&quot; date.
						</p>
					</section>

					<section className="mb-8">
						<h2 className="text-xl font-semibold mb-3">Contact Us</h2>
						<p className="text-muted-foreground leading-relaxed">
							If you have questions about this Privacy Policy or our data practices, please contact us at:{" "}
							<a href="mailto:support@opentrainer.app" className="text-primary hover:underline">
								support@opentrainer.app
							</a>
						</p>
					</section>
				</article>
			</main>

			<footer className="border-t py-8">
				<div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-8">
					<p className="text-sm text-muted-foreground">
						&copy; 2025 OpenTrainer
					</p>
					<div className="flex gap-6 text-sm text-muted-foreground">
						<Link href="/privacy" className="hover:text-foreground font-medium text-foreground">
							Privacy
						</Link>
						<Link href="/terms" className="hover:text-foreground">
							Terms
						</Link>
						<Link href="mailto:support@opentrainer.app" className="hover:text-foreground">
							Contact
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
