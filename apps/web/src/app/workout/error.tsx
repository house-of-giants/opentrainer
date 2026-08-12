"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function WorkoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workout error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="font-semibold text-lg">Workout</h1>
        </div>
      </header>

      <main className="flex-1 p-4">
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold">Workout error</h2>
              <p className="text-sm text-muted-foreground">
                Something went wrong. Your logged sets are safe.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={reset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
              <Link href="/dashboard">
                <Button variant="outline" className="gap-2">
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
