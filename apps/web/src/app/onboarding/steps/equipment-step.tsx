"use client";

interface EquipmentStepProps {
  description: string;
  onDescriptionChange: (description: string) => void;
}

export function EquipmentStep({ description, onDescriptionChange }: EquipmentStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Where do you work out?</h1>
        <p className="mt-2 text-muted-foreground">
          Describe your gym or home setup. We&apos;ll figure out what equipment you have.
        </p>
      </div>

      <div className="space-y-4">
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g., Planet Fitness, LA Fitness, home gym with power rack and dumbbells..."
          className="w-full min-h-[140px] rounded-xl border-2 border-border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
          autoFocus
        />

        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <p className="text-sm font-medium">Examples:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>&bull; &quot;LA Fitness&quot;</li>
            <li>&bull; &quot;Home gym with power rack, barbell, and dumbbells&quot;</li>
            <li>&bull; &quot;Apartment - just resistance bands and pull-up bar&quot;</li>
            <li>&bull; &quot;CrossFit box&quot;</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
