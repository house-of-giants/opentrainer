"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@opentrainer/backend";
import { defaultUnitForLocale, type WeightUnit } from "@opentrainer/lib/units";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { GoalsStep, type Goal } from "./steps/goals-step";
import { ExperienceStep, type ExperienceLevel } from "./steps/experience-step";
import { EquipmentStep } from "./steps/equipment-step";
import { EquipmentConfirmStep } from "./steps/equipment-confirm-step";
import { AvailabilityStep } from "./steps/availability-step";
import { UnitsPicker } from "./steps/units-picker";
import { PathStep, type OnboardingPath } from "./steps/path-step";
import posthog from "posthog-js";
import { internalAccountProperties } from "@opentrainer/lib/analytics";

// The first step picks a path and units. Only "Generate one" goes on to the
// profile questions; the other two paths finish here and open the routine
// builder, which ends on day 1 of the saved routine.
const GENERATE_STEPS = [
  "path",
  "goals",
  "experience",
  "equipment",
  "equipment-confirm",
  "availability",
] as const;
type Step = (typeof GENERATE_STEPS)[number];

export default function OnboardingPage() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const parseEquipment = useAction(api.ai.equipmentParser.parseEquipment);

  const [currentStep, setCurrentStep] = useState<Step>("path");
  const [initialized, setInitialized] = useState(false);
  const [path, setPath] = useState<OnboardingPath | null>(null);
  // Set once this page hands off to the routine builder, so the finished
  // user doc does not also redirect to the dashboard over the builder.
  const handingOff = useRef(false);
  
  const [goals, setGoals] = useState<Goal[]>([]);
  // New accounts get "lb" from the backend, so default from the browser locale.
  // The server render shows a skeleton, so its fallback is never displayed.
  const [units, setUnits] = useState<WeightUnit>(() =>
    defaultUnitForLocale(typeof navigator === "undefined" ? undefined : navigator.language)
  );
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [equipmentDescription, setEquipmentDescription] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [equipmentNote, setEquipmentNote] = useState<string | null>(null);
  const [days, setDays] = useState(4);
  const [duration, setDuration] = useState(60);

  const [isParsingEquipment, setIsParsingEquipment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.onboardingCompletedAt && !handingOff.current) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    if (user && !initialized) {
      if (user.goals) setGoals(user.goals as Goal[]);
      if (user.experienceLevel) setExperience(user.experienceLevel as ExperienceLevel);
      if (user.equipmentDescription) setEquipmentDescription(user.equipmentDescription);
      if (user.equipment) setEquipment(user.equipment);
      if (user.weeklyAvailability) setDays(user.weeklyAvailability);
      if (user.sessionDuration) setDuration(user.sessionDuration);
      setInitialized(true);
    }
  }, [user, initialized]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (user === null) {
    router.replace("/");
    return null;
  }

  const stepIndex = GENERATE_STEPS.indexOf(currentStep);
  const isGenerating = path === "generate";
  const progress = isGenerating ? ((stepIndex + 1) / GENERATE_STEPS.length) * 100 : 0;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "path":
        return path !== null;
      case "goals":
        return goals.length > 0;
      case "experience":
        return experience !== null;
      case "equipment":
        return equipmentDescription.trim().length > 0;
      case "equipment-confirm":
        return equipment.length > 0;
      case "availability":
        return true;
      default:
        return false;
    }
  };

  const identify = () => {
    if (user?.clerkId) {
      posthog.identify(user.clerkId, {
        name: user.name,
        email: user.email,
        ...internalAccountProperties(user.email),
      });
    }
  };

  // "Bring my program" and "Start from scratch" skip every profile question.
  const finishIntoBuilder = async (chosen: Exclude<OnboardingPath, "generate">) => {
    setIsSubmitting(true);
    handingOff.current = true;
    try {
      await updatePreferences({ preferredUnits: units });
      await completeOnboarding({});
      identify();
      posthog.capture("onboarding_completed", {
        path: chosen,
        preferred_units: units,
      });
      router.replace(`/routines/new?onboarding=${chosen}`);
    } catch {
      handingOff.current = false;
      toast.error("Failed to save. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!canProceed()) return;

    if (currentStep === "path" && path && path !== "generate") {
      await finishIntoBuilder(path);
      return;
    }

    if (currentStep === "equipment") {
      setCurrentStep("equipment-confirm");
      
      if (equipment.length > 0) {
        return;
      }

      setIsParsingEquipment(true);
      try {
        const result = await parseEquipment({ description: equipmentDescription });
        setEquipment(result.equipment);
        setEquipmentNote(result.note ?? null);
      } catch {
        toast.error("Failed to analyze equipment. Please select manually.");
        setEquipment([]);
      } finally {
        setIsParsingEquipment(false);
      }
      return;
    }

    if (currentStep === "availability") {
      setIsSubmitting(true);
      try {
        await updatePreferences({ preferredUnits: units });
        await completeOnboarding({
          goals,
          experienceLevel: experience!,
          equipmentDescription,
          equipment,
          weeklyAvailability: days,
          sessionDuration: duration,
        });
        identify();
        posthog.capture("onboarding_completed", {
          path: "generate",
          goals,
          experience_level: experience,
          equipment_count: equipment.length,
          weekly_availability: days,
          session_duration: duration,
          preferred_units: units,
        });
        router.replace("/dashboard");
      } catch {
        toast.error("Failed to save. Please try again.");
        setIsSubmitting(false);
      }
      return;
    }

    const nextIndex = stepIndex + 1;
    if (nextIndex < GENERATE_STEPS.length) {
      setCurrentStep(GENERATE_STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(GENERATE_STEPS[prevIndex]);
    }
  };

  const getButtonText = (): string => {
    if (currentStep === "availability") {
      return isSubmitting ? "Setting up..." : "Get Started";
    }
    if (currentStep === "equipment") {
      return "Analyze Equipment";
    }
    return "Continue";
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sticky top-0 z-40 bg-background">
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <header className="flex h-14 items-center px-4">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">Back</span>
          </button>
        ) : (
          <div />
        )}
        <div className="flex-1 text-center">
          {isGenerating && (
            <span className="text-xs text-muted-foreground">
              Step {stepIndex + 1} of {GENERATE_STEPS.length}
            </span>
          )}
        </div>
        <div className="w-16" />
      </header>

      <main className="flex-1 px-6 pb-32">
        <div className="mx-auto max-w-md pt-4">
          {currentStep === "path" && (
            <div className="space-y-8">
              <PathStep selected={path} onSelect={setPath} />
              <UnitsPicker value={units} onChange={setUnits} />
            </div>
          )}
          {currentStep === "goals" && <GoalsStep selected={goals} onSelect={setGoals} />}
          {currentStep === "experience" && (
            <ExperienceStep selected={experience} onSelect={setExperience} />
          )}
          {currentStep === "equipment" && (
            <EquipmentStep
              description={equipmentDescription}
              onDescriptionChange={setEquipmentDescription}
            />
          )}
          {currentStep === "equipment-confirm" && (
            <EquipmentConfirmStep
              equipment={equipment}
              onEquipmentChange={setEquipment}
              note={equipmentNote}
              isLoading={isParsingEquipment}
            />
          )}
          {currentStep === "availability" && (
            <AvailabilityStep
              days={days}
              duration={duration}
              onDaysChange={setDays}
              onDurationChange={setDuration}
            />
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 pb-8">
        <div className="mx-auto max-w-md">
          <Button
            size="lg"
            className={cn(
              "w-full h-14 text-lg font-semibold",
              currentStep === "availability" && "bg-green-600 hover:bg-green-700"
            )}
            onClick={handleNext}
            disabled={!canProceed() || isParsingEquipment || isSubmitting}
          >
            {(isParsingEquipment || isSubmitting) && (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            )}
            {getButtonText()}
            {!isParsingEquipment && !isSubmitting && currentStep !== "availability" && (
              <ChevronRight className="ml-2 h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
