"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, Sparkles } from "lucide-react";
import Link from "next/link";

export function TrainingLabCardDemo() {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-purple-500/5" />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-violet-500" />
          <span className="font-semibold">Training Lab</span>
          <span className="ml-auto rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-500">
            DEMO
          </span>
        </div>
        <p className="mb-3 text-sm">Your training analysis is ready to view</p>
        <Button size="sm" className="w-full gap-2" asChild>
          <Link href="/demo/training-lab">
            <Sparkles className="h-4 w-4" />
            View Analysis
          </Link>
        </Button>
      </div>
    </Card>
  );
}
