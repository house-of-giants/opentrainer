import { useEffect, useRef, useState } from "react";
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
import { getLocales } from "expo-localization";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import { defaultUnitForRegion, type WeightUnit } from "@opentrainer/lib/units";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import {
  AvailabilityStep,
  EquipmentConfirmStep,
  EquipmentStep,
  ExperienceStep,
  GoalsStep,
  PathStep,
  UnitsPicker,
  type ExperienceLevel,
  type Goal,
  type OnboardingPath,
} from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { internalAccountProperties } from "@opentrainer/lib/analytics";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/onboarding/page.tsx.
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

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useQuery(api.users.getCurrentUser);

  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const parseEquipment = useAction(api.ai.equipmentParser.parseEquipment);

  const [currentStep, setCurrentStep] = useState<Step>("path");
  const [initialized, setInitialized] = useState(false);
  const [path, setPath] = useState<OnboardingPath | null>(null);
  // Set once this screen hands off to the routine builder, so the finished
  // user doc does not also redirect home over the builder.
  const handingOff = useRef(false);

  const [goals, setGoals] = useState<Goal[]>([]);
  // New accounts get "lb" from the backend, so default from the device region.
  const [units, setUnits] = useState<WeightUnit>(() =>
    defaultUnitForRegion(getLocales()[0]?.regionCode),
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

  const stepIndex = GENERATE_STEPS.indexOf(currentStep);
  const isGenerating = path === "generate";
  const progress = isGenerating
    ? ((stepIndex + 1) / GENERATE_STEPS.length) * 100
    : 0;

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
      analytics.identify(user.clerkId, {
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
      analytics.capture("onboarding_completed", {
        path: chosen,
        preferred_units: units,
      });
      router.replace({
        pathname: "/(app)/routines/new",
        params: { onboarding: chosen },
      });
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
        analytics.capture("onboarding_completed", {
          path: "generate",
          goals,
          experience_level: experience,
          equipment_count: equipment.length,
          weekly_availability: days,
          session_duration: duration,
          preferred_units: units,
        });
        router.replace("/(app)/(tabs)");
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
          {isGenerating && (
            <Text className="text-xs text-muted-foreground">
              Step {stepIndex + 1} of {GENERATE_STEPS.length}
            </Text>
          )}
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
          {currentStep === "path" && (
            <View className="gap-8">
              <PathStep selected={path} onSelect={setPath} />
              <UnitsPicker value={units} onChange={setUnits} />
            </View>
          )}
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
