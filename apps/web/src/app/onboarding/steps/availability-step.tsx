"use client";

import { Slider } from "@/components/ui/slider";

interface AvailabilityStepProps {
  days: number;
  duration: number;
  onDaysChange: (days: number) => void;
  onDurationChange: (duration: number) => void;
}

export function AvailabilityStep({
  days,
  duration,
  onDaysChange,
  onDurationChange,
}: AvailabilityStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">How often can you train?</h1>
        <p className="mt-2 text-muted-foreground">
          This helps us build programs that fit your schedule.
        </p>
      </div>

      <div className="space-y-10 py-4">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-medium">Days per week</span>
            <span className="text-4xl font-bold tabular-nums text-primary">{days}</span>
          </div>
          <Slider
            value={[days]}
            onValueChange={([value]) => onDaysChange(value)}
            min={1}
            max={7}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>1 day</span>
            <span>7 days</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-medium">Session length</span>
            <span className="text-4xl font-bold tabular-nums text-primary">{duration}<span className="text-lg ml-1">min</span></span>
          </div>
          <Slider
            value={[duration]}
            onValueChange={([value]) => onDurationChange(value)}
            min={30}
            max={120}
            step={15}
            className="py-2"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>30 min</span>
            <span>120 min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
