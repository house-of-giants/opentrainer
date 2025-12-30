"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, History, BarChart3, Check } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Dumbbell,
    name: "Unlimited Workouts",
    description: "Log every set, rep, and PR",
  },
  {
    icon: History,
    name: "Full History",
    description: "Access all your past workouts",
  },
  {
    icon: BarChart3,
    name: "Basic Stats",
    description: "Weekly volume and workout count",
  },
];

export function FreePlanCard() {
  return (
    <Card className="relative w-full max-w-sm overflow-hidden p-6">
      <div className="relative">
        <div className="mb-6 text-center">
          <h3 className="text-2xl font-bold">Free</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you need to start training
          </p>
        </div>

        <div className="mb-6 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-muted-foreground">/forever</span>
          </div>
        </div>

        <ul className="mb-6 space-y-4">
          {features.map((feature) => (
            <li key={feature.name} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <feature.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">{feature.name}</p>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <Button variant="outline" className="w-full" asChild>
          <Link href="/dashboard">
            <Check className="mr-2 h-4 w-4" />
            Current Plan
          </Link>
        </Button>
      </div>
    </Card>
  );
}
