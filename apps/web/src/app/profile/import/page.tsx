"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HistoryImportFlow } from "@/components/import/history-import-flow";

export default function ImportHistoryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="-ml-2 rounded-md p-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-semibold text-lg">Import History</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-16">
        <HistoryImportFlow />
      </main>
    </div>
  );
}
