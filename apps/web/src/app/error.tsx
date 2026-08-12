"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Don&apos;t worry, your workout data is safe.
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2 w-full">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          If this keeps happening, please{" "}
          <a
            href="mailto:support@opentrainer.app"
            className="underline hover:text-foreground"
          >
            contact support
          </a>
          .
        </p>
      </div>
    </div>
  );
}
