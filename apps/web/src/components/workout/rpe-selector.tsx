"use client";

import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/use-haptic";

interface RpeSelectorProps {
	value: number | null;
	onChange: (value: number | null) => void;
}

const EFFORT_OPTIONS = [
	{ rpe: 6, label: "Easy", subtitle: "4+ left", color: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" },
	{ rpe: 8, label: "Mod", subtitle: "2-3 left", color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30" },
	{ rpe: 9, label: "Hard", subtitle: "1 left", color: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30" },
	{ rpe: 10, label: "Failure", subtitle: "0 left", color: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30" },
] as const;

export function RpeSelector({ value, onChange }: RpeSelectorProps) {
	const { vibrate } = useHaptic();

	const handleSelect = (rpe: number) => {
		vibrate("light");
		onChange(value === rpe ? null : rpe);
	};

	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-xs font-medium text-muted-foreground text-center">
				Effort <span className="opacity-60">(optional)</span>
			</span>
			<div className="grid grid-cols-4 gap-1.5">
				{EFFORT_OPTIONS.map((option) => (
					<button
						key={option.rpe}
						type="button"
						onClick={() => handleSelect(option.rpe)}
						className={cn(
							"flex flex-col items-center justify-center rounded-md border py-1.5 transition-all",
							value === option.rpe
								? option.color
								: "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40"
						)}
					>
						<span className="text-[11px] font-semibold leading-tight">{option.label}</span>
						<span className="text-[9px] opacity-70 leading-tight">{option.subtitle}</span>
					</button>
				))}
			</div>
		</div>
	);
}
