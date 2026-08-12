"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignUpButton } from "@clerk/nextjs";
import { Dumbbell, Lock } from "lucide-react";

export default function DemoRoutinesPage() {
  return (
    <div className="flex min-h-screen flex-col p-4 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Routines</h1>
        <p className="text-sm text-muted-foreground">
          Save and reuse your favorite workouts
        </p>
      </header>

      <div className="flex flex-1 items-center justify-center">
        <Card className="max-w-md p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Dumbbell className="h-12 w-12 text-muted-foreground" />
              <Lock className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Routines in Full Version</h2>
            <p className="text-sm text-muted-foreground">
              Save custom routines, track your progress over time, and quickly start your favorite workouts.
            </p>
          </div>
          <SignUpButton mode="modal">
            <Button size="lg" className="w-full">
              Sign Up to Access
            </Button>
          </SignUpButton>
        </Card>
      </div>
    </div>
  );
}
