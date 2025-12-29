"use client";

import { PricingTable } from "@clerk/nextjs";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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

      <main className="flex flex-1 flex-col items-center px-4 py-8">
        <div className="max-w-2xl text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Unlock Your Full Potential
          </h1>
          <p className="text-muted-foreground text-lg">
            Get AI-powered training insights, smart exercise swaps, and personalized recommendations.
          </p>
        </div>

        <div className="w-full max-w-md mb-8">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">✓</span>
              <span>Training Lab — weekly AI analysis of your workouts</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">✓</span>
              <span>Smart Swap — context-aware exercise substitutions</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">✓</span>
              <span>Personalized insights based on your goals</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">✓</span>
              <span>Early access to new AI features</span>
            </li>
          </ul>
        </div>

        <div className="w-full flex justify-center">
          <PricingTable />
        </div>
      </main>
    </div>
  );
}
