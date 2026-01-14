"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProPlanCard, FreePlanCard } from "@/components/pricing";

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="mb-10 max-w-xl text-center">
          <span className="mb-4 inline-block rounded-full bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-violet-600">
            Alpha — Pro is Free for Everyone
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Train smarter, not harder
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            All Pro features are free while we&apos;re in alpha. Help us build the best workout tracker.
          </p>
        </div>

        <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
          <FreePlanCard />
          <ProPlanCard />
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Questions? Reach out at{" "}
          <a href="mailto:support@opentrainer.app" className="underline underline-offset-4 hover:text-foreground">
            support@opentrainer.app
          </a>
        </p>
      </main>
    </div>
  );
}
