"use client";

interface WeeklyVolumeRingProps {
  current: number;
  target: number;
  label?: string;
}

export function WeeklyVolumeRing({ current, target, label = "Weekly Sets" }: WeeklyVolumeRingProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;

  const ringColor = isComplete
    ? "text-green-500"
    : percentage >= 75
      ? "text-primary"
      : percentage >= 50
        ? "text-yellow-500"
        : "text-muted-foreground";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="-rotate-90 w-28 h-28" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/20"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className={`${ringColor} transition-all duration-700 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold font-mono ${ringColor}`}>{current}</span>
          <span className="text-xs text-muted-foreground">/{target}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

interface MultiRingProps {
  workouts: { current: number; target: number };
  sets: { current: number; target: number };
}

export function WorkoutProgressRings({ workouts, sets }: MultiRingProps) {
  return (
    <div className="flex items-center justify-around py-4">
      <WeeklyVolumeRing
        current={workouts.current}
        target={workouts.target}
        label="Workouts"
      />
      <WeeklyVolumeRing
        current={sets.current}
        target={sets.target}
        label="Sets"
      />
    </div>
  );
}
