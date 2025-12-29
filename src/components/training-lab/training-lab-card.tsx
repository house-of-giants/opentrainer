"use client";

import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, Lock, Sparkles } from "lucide-react";
import Link from "next/link";

export function TrainingLabCard() {
  const { has } = useAuth();
  const ctaState = useQuery(api.ai.trainingLabMutations.getCtaState);

  const hasAiCoach = has?.({ feature: "ai_coach" });

  if (ctaState === undefined) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }

  if (ctaState === null || !ctaState.show) {
    return null;
  }

  if (!hasAiCoach) {
    return (
      <Card className="relative overflow-hidden p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/10" />
        <div className="relative">
          <div className="mb-2 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-violet-500" />
            <span className="font-semibold">Training Lab</span>
            <Lock className="ml-auto h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mb-3 space-y-1 text-sm text-muted-foreground">
            <div className="h-3 w-full rounded bg-muted/50" />
            <div className="h-3 w-3/4 rounded bg-muted/50" />
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            AI-powered training insights
          </p>
          <Button size="sm" variant="outline" className="w-full" asChild>
            <Link href="/pricing">Unlock with Pro</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (ctaState.reportType === "none") {
    const progress = (ctaState.workoutsSinceLastReport / 3) * 100;
    return (
      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-violet-500" />
          <span className="font-semibold">Training Lab</span>
          <span className="ml-auto rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-500">
            PRO
          </span>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">{ctaState.message}</p>
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-2" />
          <span className="text-xs font-mono text-muted-foreground">
            {ctaState.workoutsSinceLastReport}/3
          </span>
        </div>
      </Card>
    );
  }

  const isSnapshot = ctaState.reportType === "snapshot";
  
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5" />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-violet-500" />
          <span className="font-semibold">Training Lab</span>
          <span className="ml-auto rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-500">
            PRO
          </span>
        </div>
        <p className="mb-3 text-sm">{ctaState.message}</p>
        {isSnapshot && (
          <div className="mb-3 flex items-center gap-2">
            <Progress
              value={(ctaState.workoutsSinceLastReport / 5) * 100}
              className="h-2"
            />
            <span className="text-xs font-mono text-muted-foreground">
              {ctaState.workoutsSinceLastReport}/5
            </span>
          </div>
        )}
        <Button size="sm" className="w-full gap-2" asChild>
          <Link href="/training-lab">
            <Sparkles className="h-4 w-4" />
            {isSnapshot ? "Generate Snapshot" : "Generate Full Report"}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
