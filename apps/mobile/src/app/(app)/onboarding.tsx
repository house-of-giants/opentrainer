import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import {
  AvailabilityStep,
  EquipmentConfirmStep,
  EquipmentStep,
  ExperienceStep,
  GoalsStep,
  type ExperienceLevel,
  type Goal,
} from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/onboarding/page.tsx.
const STEPS = [
  "goals",
  "experience",
  "equipment",
  "equipment-confirm",
  "availability",
] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
      router.replace("/(app)/(tabs)");
    }
  }, [user, router]);

  useEffect(() => {
    if (user && !initialized) {
      if (user.goals) setGoals(user.goals as Goal[]);
      if (user.experienceLevel)
        setExperience(user.experienceLevel as ExperienceLevel);
      if (user.equipmentDescription)
        setEquipmentDescription(user.equipmentDescription);
      if (user.equipment) setEquipment(user.equipment);
      if (user.weeklyAvailability) setDays(user.weeklyAvailability);
      if (user.sessionDuration) setDuration(user.sessionDuration);
      setInitialized(true);
    }
  }, [user, initialized]);

  // Web bounces `user === null` to "/"; on native the (app) layout already
  // redirects signed-out users to sign-in, so both pending states are a
  // skeleton.
  if (user === undefined || user === null) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center p-4">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </View>
      </SafeAreaView>
    );
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
        if (user?.clerkId) {
          analytics.identify(user.clerkId, {
            name: user.name,
            email: user.email,
          });
        }
        analytics.capture("onboarding_completed", {
          goals,
          experience_level: experience,
          equipment_count: equipment.length,
          weekly_availability: days,
          session_duration: duration,
        });
        router.replace("/(app)/(tabs)");
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

  const isBusy = isParsingEquipment || isSubmitting;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <Progress
        value={progress}
        className="h-1 rounded-none bg-muted"
        indicatorClassName="rounded-none"
      />

      <View className="h-14 flex-row items-center px-4">
        {stepIndex > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            className="w-16 flex-row items-center gap-1"
            onPress={handleBack}
          >
            <ChevronLeft size={20} color={colors.mutedForeground} />
            <Text className="text-sm text-muted-foreground">Back</Text>
          </Pressable>
        ) : (
          <View className="w-16" />
        )}
        <View className="flex-1 items-center">
          <Text className="text-xs text-muted-foreground">
            Step {stepIndex + 1} of {STEPS.length}
          </Text>
        </View>
        <View className="w-16" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
        >
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
        </ScrollView>

        <View className="border-t border-border bg-background p-4">
          <Button
            size="lg"
            className={cn(
              "h-14 w-full",
              currentStep === "availability" && "bg-green-600",
            )}
            onPress={handleNext}
            disabled={!canProceed() || isBusy}
            loading={isBusy}
          >
            <Text className="text-lg font-semibold text-primary-foreground">
              {getButtonText()}
            </Text>
            {!isBusy && currentStep !== "availability" && (
              <ChevronRight size={20} color={colors.primaryForeground} />
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
