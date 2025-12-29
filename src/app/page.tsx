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
            A workout tracker
            <br />
            <span className="text-muted-foreground">that gets out of your way.</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
            A minimal workout tracker built for lifters who care about the
            numbers. Big buttons, fast logging, no nonsense.
          </p>
          <div className="flex gap-4">
            <SignedOut>
              <SignUpButton mode="modal">
                <Button size="lg" className="min-h-12 px-8">
                  Start Logging
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
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              title="Log in Seconds"
              description="Tap weight, tap reps, done. No menus to dig through, no animations to wait for. Just log your sets and move on."
            />
            <FeatureCard
              title="Built for the Gym Floor"
              description="Log sets between reps, not after your session. Works with sweaty hands, bad signal, and zero patience for loading screens."
            />
            <FeatureCard
              title="Your Data, Your Way"
              description="Export everything as JSON. No lock-in, no hostage data. Works alongside whatever else you use."
            />
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                OpenFit Pro
              </h2>
              <p className="mt-2 text-muted-foreground">
                For lifters who want an edge.
              </p>
            </div>
            <div className="mx-auto mt-8 grid max-w-4xl gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold">What you get</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-foreground">-</span>
                    <span>
                      <strong className="text-foreground">AI Routines</strong>{" "}
                      — Generate training programs tailored to your goals and
                      equipment
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-foreground">-</span>
                    <span>
                      <strong className="text-foreground">
                        Weekly Assessments
                      </strong>{" "}
                      — Get performance insights based on your actual training
                      data
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-foreground">-</span>
                    <span>
                      <strong className="text-foreground">Data Export</strong>{" "}
                      — Full JSON export of your workout history
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-foreground">-</span>
                    <span>
                      <strong className="text-foreground">Priority Sync</strong>{" "}
                      — Your data syncs first when servers are busy
                    </span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-6 text-center">
                <div className="text-3xl font-bold">$8</div>
                <div className="text-sm text-muted-foreground">per month</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  or $72/year (save $24)
                </div>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button className="mt-6 w-full" size="lg">
                      Get Started
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard" className="mt-6 w-full">
                    <Button className="w-full" size="lg">
                      Upgrade to Pro
                    </Button>
                  </Link>
                </SignedIn>
                <p className="mt-3 text-xs text-muted-foreground">
                  Free tier includes core logging forever.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="text-muted-foreground">
            No tracking pixels. No selling your data.
            <br />
            Just a workout log that works.
          </p>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-8">
          <p className="text-sm text-muted-foreground">OpenFit</p>
          <p className="text-sm text-muted-foreground">
            Free forever. Pro at $8/mo.
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
