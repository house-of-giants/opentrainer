"use client";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  sublabel?: string;
  showValue?: boolean;
  color?: "primary" | "success" | "warning" | "danger";
}

const sizeConfig = {
  sm: { size: 48, strokeWidth: 4, fontSize: "text-sm", radius: 20 },
  md: { size: 80, strokeWidth: 6, fontSize: "text-xl", radius: 34 },
  lg: { size: 120, strokeWidth: 8, fontSize: "text-3xl", radius: 52 },
};

const colorConfig = {
  primary: "text-primary",
  success: "text-green-500",
  warning: "text-yellow-500",
  danger: "text-red-500",
};

export function ProgressRing({
  value,
  max,
  size = "md",
  label,
  sublabel,
  showValue = true,
  color = "primary",
}: ProgressRingProps) {
  const config = sizeConfig[size];
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * config.radius;
  const progress = (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: config.size, height: config.size }}>
        <svg
          className="-rotate-90"
          width={config.size}
          height={config.size}
          viewBox={`0 0 ${config.size} ${config.size}`}
        >
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-muted/30"
          />
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className={`${colorConfig[color]} transition-all duration-500 ease-out`}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-bold font-mono ${config.fontSize} ${colorConfig[color]}`}>
              {value}
            </span>
          </div>
        )}
      </div>
      {(label || sublabel) && (
        <div className="text-center">
          {label && <div className="text-sm font-medium">{label}</div>}
          {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
        </div>
      )}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  color?: "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md";
}

const barColorConfig = {
  primary: "bg-primary",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
};

export function ProgressBar({
  value,
  max,
  label,
  showValue = true,
  color = "primary",
  size = "md",
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && (
            <span className="font-mono text-xs">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-muted/30 ${height}`}>
        <div
          className={`${height} rounded-full ${barColorConfig[color]} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
