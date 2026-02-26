"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
import posthog from "posthog-js";

const STEPS = ["goals", "experience", "equipment", "equipment-confirm", "availability"] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const parseEquipment = useAction(api.ai.equipmentParser.parseEquipment);

  const [currentStep, setCurrentStep] = useState<Step>("goals");
  const [initialized, setInitialized] = useState(false);
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [equipmentDescription, setEquipmentDescription] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [equipmentNote, setEquipmentNote] = useState<string | null>(null);
  const [days, setDays] = useState(4);
  const [duration, setDuration] = useState(60);

  const [isParsingEquipment, setIsParsingEquipment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.onboardingCompletedAt) {
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

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canProceed = (): boolean => {
    switch (currentStep) {
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

  const handleNext = async () => {
    if (!canProceed()) return;

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
        await completeOnboarding({
          goals,
          experienceLevel: experience!,
          equipmentDescription,
          equipment,
          weeklyAvailability: days,
          sessionDuration: duration,
        });
        // Identify and track onboarding completion
        if (user?.clerkId) {
          posthog.identify(user.clerkId, {
            name: user.name,
            email: user.email,
          });
        }
        posthog.capture("onboarding_completed", {
          goals,
          experience_level: experience,
          equipment_count: equipment.length,
          weekly_availability: days,
          session_duration: duration,
        });
        router.replace("/dashboard");
      } catch {
        toast.error("Failed to save. Please try again.");
        setIsSubmitting(false);
      }
      return;
    }

    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
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
          <span className="text-xs text-muted-foreground">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
        </div>
        <div className="w-16" />
      </header>

      <main className="flex-1 px-6 pb-32">
        <div className="mx-auto max-w-md pt-4">
          {currentStep === "goals" && (
            <GoalsStep selected={goals} onSelect={setGoals} />
          )}
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
