"use client";

import { Button } from "@/components/ui/button";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { AsciiLogo } from "@/components/ui/ascii-logo";


export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <AsciiLogo />
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
        {/* Hero Section - Mobile: video background, Desktop: side-by-side */}
        <section className="relative lg:static">
          {/* Mobile video background */}
          <div className="absolute inset-0 overflow-hidden lg:hidden">
            <video
              src="/videos/hero-dashboard.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full scale-150 object-cover opacity-15 blur-[2px]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          </div>

          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 md:py-24 lg:px-8">
            <div className="flex flex-col items-center gap-6 text-center lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:text-left">
              <div className="flex flex-col items-center gap-5 lg:items-start lg:gap-6">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Log workouts in seconds,
                  <br />
                  <span className="text-muted-foreground">not minutes.</span>
                </h1>
                <p className="max-w-md text-lg text-muted-foreground sm:text-xl lg:max-w-xl">
                  Most apps need 5 screens to log one set. We need 2 taps.
                  <span className="mt-2 block text-base">
                    Built for sweaty hands, bad gym WiFi, and the 45 seconds you have before your next set.
                  </span>
                </p>
                <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
                  <SignedOut>
                    <SignUpButton mode="modal">
                      <Button size="lg" className="min-h-12 px-8">
                        Start Free
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
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-6 lg:justify-start">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    No credit card required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    No app install
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Export anytime
                  </span>
                </div>
              </div>
              {/* Desktop video - hidden on mobile */}
              <div className="hidden lg:flex lg:justify-end">
                <video
                  src="/videos/hero-dashboard.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-[550px] w-auto rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="border-y bg-muted/20">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-4 px-4 py-8 sm:flex-row sm:gap-12 sm:px-6 lg:px-8">
            <a
              href="https://github.com/house-of-giants/opentrainer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              100% open source
            </a>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
              Zero tracking pixels
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Full data export
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
              title="2 Taps Per Set"
              description="Finish logging before your rest timer ends. No fumbling through menus while your muscles cool down."
              videoSrc="/videos/feature-log-set.mp4"
            />
            <FeatureCard
              title="AI That Knows Your Gym"
              description="Get programs that actually fit YOUR equipment. No more routines that assume you have a full commercial gym."
              videoSrc="/videos/feature-ai.mp4"
            />
            <FeatureCard
              title="Your Data, Your Rules"
              description="Leave anytime and take everything with you. Full JSON export of every workout, set, and note. No lock-in, ever."
              videoSrc="/videos/feature-export.mp4"
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
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
              <StepCard
                step="1"
                title="Sign up (30 seconds)"
                description="No credit card. No 47-screen onboarding quiz."
              />
              <StepCard
                step="2"
                title="Tell us your gym"
                description={`"Home gym with rack and dumbbells." AI figures out the rest.`}
              />
              <StepCard
                step="3"
                title="Start lifting"
                description="Tap. Log. Done. See your progress build over time."
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
                Alpha: Pro is Free for Everyone
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
                      Go to Dashboard
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
              question="Is my data backed up?"
              answer="Yes. Your workouts are automatically synced to our secure cloud database. Log on any device and your data is always there."
            />
            <FAQItem
              question="Can I export my data?"
              answer="Absolutely. You can export your complete workout history as JSON. No lock-in."
            />
            <FAQItem
              question="What makes the AI different?"
              answer="Our AI generates routines based on your actual goals, experience level, and available equipment. Not generic templates."
            />
            <FAQItem
              question="Is everything really free during alpha?"
              answer="Yes! During our alpha period, all Pro features are completely free. This includes unlimited AI routines, Training Lab insights, and Smart Swap. No credit card required."
            />
            <FAQItem
              question="Does it work offline?"
              answer="The app works best with an internet connection for syncing, but you can continue logging workouts if you lose signal mid-session. Your data syncs automatically when you're back online."
            />
            <FAQItem
              question="Can I import my data from other apps?"
              answer="Not yet, but it's on our roadmap. For now you start fresh. We'll announce import support when it's ready."
            />
            <FAQItem
              question="What happens after alpha ends?"
              answer="We'll introduce paid Pro plans, but alpha users will get special pricing as a thank-you for helping us build. The free tier will always exist with generous limits."
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
            © {new Date().getFullYear()} OpenTrainer. Pro is free during alpha.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
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

function FeatureCard({
  title,
  description,
  videoSrc,
}: {
  title: string;
  description: string;
  videoSrc: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
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
      className="h-5 w-5 shrink-0 text-primary"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
