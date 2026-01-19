"use client";

import { Trophy, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PrBadgeProps {
  type?: "inline" | "card";
}

export function PrBadge({ type = "inline" }: PrBadgeProps) {
  if (type === "card") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
        <Trophy className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-semibold text-amber-500">PR</span>
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1"
    >
      <Trophy className="h-3 w-3" />
      PR
    </Badge>
  );
}

interface RecentPrCardProps {
  prs: Array<{
    exercise: string;
    weight: number;
    date: string;
  }>;
}

export function RecentPrCard({ prs }: RecentPrCardProps) {
  if (prs.length === 0) return null;

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-amber-500">Recent PRs</h3>
      </div>
      <div className="space-y-2">
        {prs.map((pr, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="truncate flex-1">{pr.exercise}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-semibold">{pr.weight} lb</span>
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
