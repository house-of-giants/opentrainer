import { Button } from "@/components/ui/button";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">OpenFit</span>
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
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-24 text-center sm:px-6 md:py-32 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Track Workouts.
            <br />
            <span className="text-muted-foreground">Get AI Coaching.</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Minimalist workout logging designed for the gym floor. Large tap
            targets, instant sync, and AI-powered routine suggestions.
          </p>
          <div className="flex gap-4">
            <SignedOut>
              <SignUpButton mode="modal">
                <Button size="lg" className="min-h-12 px-8">
                  Start Free
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/workout/new">
                <Button size="lg" className="min-h-12 px-8">
                  Start Workout
                </Button>
              </Link>
            </SignedIn>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              title="Gym-Floor Ready"
              description="48px+ tap targets, one-handed operation, works offline. Designed for sweaty hands and bad signal."
            />
            <FeatureCard
              title="AI Coach"
              description="Get personalized routine suggestions and weekly performance assessments powered by Claude."
            />
            <FeatureCard
              title="Import Anywhere"
              description="Paste your ChatGPT routine as JSON. We'll parse it and create your program instantly."
            />
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-8">
          <p className="text-sm text-muted-foreground">
            Built with Convex, Clerk, and OpenRouter.
          </p>
          <p className="text-sm text-muted-foreground">
            $5/mo for Pro. No tracking. No BS.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
