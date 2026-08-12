import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  RefreshCw,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react-native";
import type {
  GeneratedRoutine,
  RoutineSwapAlternative,
} from "@opentrainer/backend/convex/ai/routineGenerator";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useHaptic } from "@/hooks/use-haptic";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/routines/new/ai/page.tsx. The wizard state machine,
// Convex action/mutation calls, gating and copy are 1:1 with web; the web
// CSS transitions on the reveal stages become plain opacity classes because RN
// has no CSS transitions.

type SwapReason = "equipment" | "discomfort" | "preference";

const SWAP_REASONS: {
  reason: SwapReason;
  label: string;
  icon: (color: string) => ReactNode;
  description: string;
}[] = [
  {
    reason: "discomfort",
    label: "Causes discomfort",
    icon: (color) => <AlertTriangle size={20} color={color} />,
    description: "Pain, injury, or medical condition",
  },
  {
    reason: "equipment",
    label: "Don't have equipment",
    icon: (color) => <Ban size={20} color={color} />,
    description: "Missing required equipment",
  },
  {
    reason: "preference",
    label: "Personal preference",
    icon: (color) => <RefreshCw size={20} color={color} />,
    description: "Just want something different",
  },
];

type SplitType = "ppl" | "upper_lower" | "full_body" | "bro_split" | "ai_decide";
type PrimaryGoal = "strength" | "hypertrophy" | "both";

const SPLIT_OPTIONS: { id: SplitType; label: string; description: string }[] = [
  { id: "ai_decide", label: "Let AI Decide", description: "Best fit for your schedule" },
  { id: "ppl", label: "Push/Pull/Legs", description: "6 days, high frequency" },
  { id: "upper_lower", label: "Upper/Lower", description: "4 days, balanced" },
  { id: "full_body", label: "Full Body", description: "2-3 days, efficient" },
  { id: "bro_split", label: "Bro Split", description: "5 days, bodybuilding style" },
];

const GOAL_OPTIONS: { id: PrimaryGoal; label: string; description: string }[] = [
  { id: "strength", label: "Strength", description: "Low reps, heavy weights" },
  { id: "hypertrophy", label: "Hypertrophy", description: "Moderate reps, muscle growth" },
  { id: "both", label: "Both", description: "Balanced approach" },
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

export default function AIRoutineGeneratorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { vibrate } = useHaptic();
  const user = useQuery(api.users.getCurrentUser);
  const generateRoutine = useAction(api.ai.routineGenerator.generateRoutine);
  const getSwapAlternatives = useAction(
    api.ai.routineGenerator.getRoutineSwapAlternatives,
  );
  const createRoutine = useMutation(api.routines.createRoutine);

  const [step, setStep] = useState<"form" | "generating" | "preview">("form");
  const [generatedRoutine, setGeneratedRoutine] = useState<GeneratedRoutine | null>(
    null,
  );

  const [splitType, setSplitType] = useState<SplitType>("ai_decide");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>("both");
  const [daysPerWeek, setDaysPerWeek] = useState<number>(
    user?.weeklyAvailability ?? 4,
  );
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));
  const [isSaving, setIsSaving] = useState(false);

  const [revealStage, setRevealStage] = useState(0);
  const [typedName, setTypedName] = useState("");

  const [swapSheet, setSwapSheet] = useState<{
    open: boolean;
    dayIndex: number;
    exerciseIndex: number;
    exerciseName: string;
    step: "reason" | "loading" | "alternatives";
    alternatives: RoutineSwapAlternative[];
  }>({
    open: false,
    dayIndex: 0,
    exerciseIndex: 0,
    exerciseName: "",
    step: "reason",
    alternatives: [],
  });

  const isPro = user?.tier === "pro";

  useEffect(() => {
    if (step === "preview" && generatedRoutine) {
      setRevealStage(0);
      setTypedName("");

      const name = generatedRoutine.name;
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex <= name.length) {
          setTypedName(name.slice(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => setRevealStage(1), 200);
        }
      }, 30);

      return () => clearInterval(typeInterval);
    }
  }, [step, generatedRoutine]);

  useEffect(() => {
    if (
      revealStage > 0 &&
      generatedRoutine &&
      revealStage <= generatedRoutine.days.length + 2
    ) {
      const timer = setTimeout(() => {
        setRevealStage((prev) => prev + 1);
        if (revealStage === 1) {
          setExpandedDays(new Set([0]));
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [revealStage, generatedRoutine]);

  const handleGenerate = async () => {
    if (!isPro) {
      toast.error("Pro subscription required");
      return;
    }

    vibrate("medium");
    setStep("generating");

    try {
      const result = await generateRoutine({
        splitType,
        primaryGoal,
        daysPerWeek,
        additionalNotes: additionalNotes.trim() || undefined,
      });

      setGeneratedRoutine(result);
      setExpandedDays(new Set([0]));
      setStep("preview");
      vibrate("success");
      analytics.capture("ai_routine_generated", {
        split_type: splitType,
        primary_goal: primaryGoal,
        days_per_week: daysPerWeek,
        has_additional_notes: additionalNotes.trim().length > 0,
        day_count: result.days.length,
        total_exercises: result.days.reduce((acc, d) => acc + d.exercises.length, 0),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate routine",
      );
      analytics.captureException(error);
      setStep("form");
    }
  };

  const handleSave = async () => {
    if (!generatedRoutine) return;

    setIsSaving(true);
    try {
      await createRoutine({
        name: generatedRoutine.name,
        description: generatedRoutine.description,
        source: "ai_generated",
        days: generatedRoutine.days.map((day) => ({
          name: day.name,
          exercises: day.exercises.map((ex) => ({
            exerciseName: ex.exerciseName,
            kind: ex.kind,
            targetSets: ex.targetSets,
            targetReps: ex.measurementType === "duration" ? undefined : ex.targetReps,
            measurementType: ex.measurementType,
            targetHoldSeconds: ex.targetHoldSeconds,
          })),
        })),
      });

      vibrate("success");
      toast.success("Routine saved!");
      analytics.capture("ai_routine_saved", {
        routine_name: generatedRoutine.name,
        split_type: splitType,
        primary_goal: primaryGoal,
        days_per_week: daysPerWeek,
        day_count: generatedRoutine.days.length,
        total_exercises: generatedRoutine.days.reduce(
          (acc, d) => acc + d.exercises.length,
          0,
        ),
      });
      router.push("/(app)/(tabs)/routines");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save routine");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDayExpanded = (index: number) => {
    vibrate("light");
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const openSwapSheet = (
    dayIndex: number,
    exerciseIndex: number,
    exerciseName: string,
  ) => {
    vibrate("light");
    setSwapSheet({
      open: true,
      dayIndex,
      exerciseIndex,
      exerciseName,
      step: "reason",
      alternatives: [],
    });
  };

  const handleSwapReason = async (reason: SwapReason) => {
    if (!generatedRoutine) return;

    setSwapSheet((prev) => ({ ...prev, step: "loading" }));

    const day = generatedRoutine.days[swapSheet.dayIndex];
    const dayContext = day.exercises.map((e) => e.exerciseName);

    try {
      const result = await getSwapAlternatives({
        exerciseName: swapSheet.exerciseName,
        reason,
        dayContext,
        userNotes: additionalNotes || undefined,
      });

      setSwapSheet((prev) => ({
        ...prev,
        step: "alternatives",
        alternatives: result.alternatives,
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to get alternatives",
      );
      setSwapSheet((prev) => ({ ...prev, step: "reason" }));
    }
  };

  const handleSelectAlternative = (alternative: RoutineSwapAlternative) => {
    if (!generatedRoutine) return;

    vibrate("medium");

    const updatedRoutine = {
      ...generatedRoutine,
      days: generatedRoutine.days.map((day, di) => {
        if (di !== swapSheet.dayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex, ei) => {
            if (ei !== swapSheet.exerciseIndex) return ex;
            return {
              ...ex,
              exerciseName: alternative.exercise,
              measurementType: alternative.measurementType,
              targetHoldSeconds: alternative.targetHoldSeconds,
              targetReps:
                alternative.measurementType === "duration"
                  ? ""
                  : ex.measurementType === "duration"
                    ? "8-12"
                    : ex.targetReps,
            };
          }),
        };
      }),
    };

    setGeneratedRoutine(updatedRoutine);
    toast.success(`Swapped to ${alternative.exercise}`);
    setSwapSheet((prev) => ({ ...prev, open: false }));
  };

  const closeSwapSheet = () => {
    setSwapSheet((prev) => ({
      ...prev,
      open: false,
      step: "reason",
      alternatives: [],
    }));
  };

  if (user === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="border-b border-border bg-background">
          <View className="h-14 flex-row items-center gap-4 px-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-40" />
          </View>
        </View>
        <View className="flex-1 gap-4 p-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isPro) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="border-b border-border bg-background">
          <View className="h-14 flex-row items-center gap-4 px-4">
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="Back"
              onPress={() => router.push("/(app)/routines/new")}
            >
              <ArrowLeft size={20} color={colors.foreground} />
            </Button>
            <Text className="flex-1 text-lg font-semibold text-foreground">
              AI Routine Generator
            </Text>
          </View>
        </View>
        <View className="flex-1 items-center justify-center p-4">
          <Card className="max-w-sm items-center p-8">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
              <Sparkles size={32} color="#8b5cf6" />
            </View>
            <Badge className="mb-3 bg-violet-500/10" textClassName="text-violet-600">
              Free During Alpha
            </Badge>
            <Text className="mb-2 text-lg font-semibold text-foreground">
              AI Routine Generator
            </Text>
            <Text className="mb-6 text-center text-sm text-muted-foreground">
              Get a personalized workout routine based on your goals, equipment, and
              schedule.
            </Text>
            {/* integration: web links to /dashboard; the dashboard is the (tabs) index route. */}
            <Button onPress={() => router.push("/(app)/(tabs)")}>
              <Sparkles size={16} color={colors.primaryForeground} />
              <Text className="text-sm font-medium text-primary-foreground">
                Get Started Free
              </Text>
            </Button>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="border-b border-border bg-background">
        <View className="h-14 flex-row items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel="Back"
            onPress={() => {
              if (step === "preview") {
                setStep("form");
                return;
              }
              router.push("/(app)/routines/new");
            }}
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </Button>
          <Text className="flex-1 text-lg font-semibold text-foreground">
            {step === "preview" ? "Review Routine" : "AI Routine Generator"}
          </Text>
          {step === "preview" && (
            <Button size="sm" onPress={handleSave} disabled={isSaving}>
              <Save size={16} color={colors.primaryForeground} />
              <Text className="text-sm font-medium text-primary-foreground">
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </Button>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-24">
        {step === "form" && (
          <View className="gap-6">
            <View className="mb-2 items-center">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
                <Wand2 size={24} color="#8b5cf6" />
              </View>
              <Text className="text-lg font-semibold text-foreground">
                Build Your Routine
              </Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                We&apos;ll use your profile data to create a personalized program.
              </Text>
            </View>

            <View className="gap-2">
              <Label>Days per week</Label>
              <View className="flex-row gap-2">
                {DAYS_OPTIONS.map((days) => (
                  <Button
                    key={days}
                    variant={daysPerWeek === days ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onPress={() => {
                      vibrate("light");
                      setDaysPerWeek(days);
                    }}
                  >
                    {String(days)}
                  </Button>
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Label>Split type</Label>
              <RadioGroup
                value={splitType}
                onValueChange={(value) => {
                  vibrate("light");
                  setSplitType(value as SplitType);
                }}
              >
                {SPLIT_OPTIONS.map((option) => (
                  <FieldLabel
                    key={option.id}
                    selected={splitType === option.id}
                    onPress={() => {
                      vibrate("light");
                      setSplitType(option.id);
                    }}
                  >
                    <Field orientation="horizontal">
                      <RadioGroupItem value={option.id} />
                      <FieldContent>
                        <FieldTitle>{option.label}</FieldTitle>
                        <FieldDescription>{option.description}</FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            </View>

            <View className="gap-2">
              <Label>Primary goal</Label>
              {/* Web renders a 3-column radio grid with sr-only inputs; RN puts the
                  radio semantics on the pressable card itself. */}
              <View accessibilityRole="radiogroup" className="flex-row gap-2">
                {GOAL_OPTIONS.map((option) => (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: primaryGoal === option.id }}
                    onPress={() => {
                      vibrate("light");
                      setPrimaryGoal(option.id);
                    }}
                    className={cn(
                      "flex-1 items-center gap-1 rounded-lg border p-3",
                      primaryGoal === option.id
                        ? "border-primary bg-primary/5"
                        : "border-border",
                    )}
                  >
                    <Text className="text-center text-sm font-medium text-foreground">
                      {option.label}
                    </Text>
                    <Text className="text-center text-xs text-muted-foreground">
                      {option.description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Label>
                Additional notes{" "}
                <Text className="text-muted-foreground">(optional)</Text>
              </Label>
              <Input
                value={additionalNotes}
                onChangeText={(value) => setAdditionalNotes(value.slice(0, 200))}
                placeholder="e.g., bad shoulder, want extra back work, prefer dumbbells..."
                multiline
                textAlignVertical="top"
                className="h-auto min-h-[80px] py-2 text-sm"
              />
              <Text className="text-right text-xs text-muted-foreground">
                {`${additionalNotes.length}/200`}
              </Text>
            </View>

            {user.equipment && user.equipment.length > 0 && (
              <Card className="bg-muted/50 p-3">
                <Text className="mb-2 text-xs font-medium text-muted-foreground">
                  Your equipment
                </Text>
                <View className="flex-row flex-wrap gap-1">
                  {user.equipment.slice(0, 8).map((eq) => (
                    <Badge key={eq} variant="secondary">
                      {eq.replace(/_/g, " ")}
                    </Badge>
                  ))}
                  {user.equipment.length > 8 && (
                    <Badge variant="outline">
                      {`+${user.equipment.length - 8} more`}
                    </Badge>
                  )}
                </View>
              </Card>
            )}

            <Button size="lg" className="h-14 w-full" onPress={handleGenerate}>
              <Sparkles size={20} color={colors.primaryForeground} />
              <Text className="text-lg font-semibold text-primary-foreground">
                Generate Routine
              </Text>
            </Button>
          </View>
        )}

        {step === "generating" && (
          <View className="flex-1 items-center justify-center py-24">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
              <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
            <Text className="mb-2 text-lg font-semibold text-foreground">
              Creating your routine...
            </Text>
            <Text className="max-w-xs text-center text-sm text-muted-foreground">
              Analyzing your profile, goals, and equipment to build the perfect
              program.
            </Text>
          </View>
        )}

        {step === "preview" && generatedRoutine && (
          <View className="gap-4">
            <View className="mb-2 items-center">
              <View className="min-h-[28px] flex-row items-center">
                <Text className="text-xl font-bold text-foreground">{typedName}</Text>
                {typedName.length < generatedRoutine.name.length && (
                  <View className="ml-0.5 h-5 w-0.5 bg-primary" />
                )}
              </View>
              <Text
                className={cn(
                  "mt-1 text-center text-sm text-muted-foreground",
                  revealStage >= 1 ? "opacity-100" : "opacity-0",
                )}
              >
                {generatedRoutine.description}
              </Text>
            </View>

            {generatedRoutine.rationale ? (
              <Card
                className={cn(
                  "border-violet-500/20 bg-violet-500/5 p-3",
                  revealStage >= 1 ? "opacity-100" : "opacity-0",
                )}
              >
                <View className="flex-row items-start gap-1.5">
                  <Sparkles size={16} color="#8b5cf6" />
                  <Text className="flex-1 text-sm text-violet-700 dark:text-violet-300">
                    {generatedRoutine.rationale}
                  </Text>
                </View>
              </Card>
            ) : null}

            <View className="gap-3">
              {generatedRoutine.days.map((day, dayIndex) => {
                const isRevealed = revealStage >= dayIndex + 2;
                return (
                  <Card
                    key={dayIndex}
                    className={cn(
                      "overflow-hidden",
                      isRevealed ? "opacity-100" : "opacity-0",
                    )}
                  >
                    <Pressable
                      accessibilityRole="button"
                      className="flex-row items-center justify-between p-3"
                      onPress={() => toggleDayExpanded(dayIndex)}
                    >
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-semibold text-foreground">
                          {day.name}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {day.focus}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Text className="font-mono text-xs text-muted-foreground">
                          {`${day.exercises.length} exercises`}
                        </Text>
                        {expandedDays.has(dayIndex) ? (
                          <ChevronUp size={16} color={colors.mutedForeground} />
                        ) : (
                          <ChevronDown size={16} color={colors.mutedForeground} />
                        )}
                      </View>
                    </Pressable>

                    {expandedDays.has(dayIndex) && (
                      <View className="gap-2 border-t border-border p-3">
                        {day.exercises.map((exercise, exIndex) => (
                          <Pressable
                            key={exIndex}
                            accessibilityRole="button"
                            className={cn(
                              "flex-row items-center justify-between rounded-md bg-muted/50 px-2 py-2 active:bg-muted",
                              isRevealed ? "opacity-100" : "opacity-0",
                            )}
                            onPress={() =>
                              openSwapSheet(dayIndex, exIndex, exercise.exerciseName)
                            }
                          >
                            <View className="min-w-0 flex-1 flex-row items-center gap-2">
                              <Dumbbell size={16} color={colors.mutedForeground} />
                              <Text
                                numberOfLines={1}
                                className="min-w-0 shrink text-sm font-medium text-foreground"
                              >
                                {exercise.exerciseName}
                              </Text>
                            </View>
                            <View className="shrink-0 flex-row items-center gap-2">
                              <Badge variant="outline" textClassName="font-mono">
                                {`${exercise.targetSets} × ${
                                  exercise.measurementType === "duration"
                                    ? `${exercise.targetHoldSeconds ?? 30}s`
                                    : exercise.targetReps
                                }`}
                              </Badge>
                              <RefreshCw size={14} color={colors.mutedForeground} />
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>

            {generatedRoutine.weeklyStructure ? (
              <Card
                className={cn(
                  "bg-muted/50 p-3",
                  revealStage >= generatedRoutine.days.length + 2
                    ? "opacity-100"
                    : "opacity-0",
                )}
              >
                <Text className="mb-1 text-xs font-medium text-muted-foreground">
                  Weekly structure
                </Text>
                <Text className="text-sm text-foreground">
                  {generatedRoutine.weeklyStructure}
                </Text>
              </Card>
            ) : null}

            <View
              className={cn(
                "flex-row gap-2 pt-4",
                revealStage >= generatedRoutine.days.length + 2
                  ? "opacity-100"
                  : "opacity-0",
              )}
            >
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setStep("form")}
              >
                Regenerate
              </Button>
              <Button
                className="flex-1"
                onPress={handleSave}
                disabled={isSaving}
                loading={isSaving}
              >
                {isSaving ? (
                  <Text className="text-sm font-medium text-primary-foreground">
                    Saving...
                  </Text>
                ) : (
                  <>
                    <Save size={16} color={colors.primaryForeground} />
                    <Text className="text-sm font-medium text-primary-foreground">
                      Save Routine
                    </Text>
                  </>
                )}
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      <Sheet
        open={swapSheet.open}
        onOpenChange={(open) => {
          if (!open) closeSwapSheet();
        }}
        snapPoints={["85%"]}
        scrollable
      >
        <SheetHeader>
          <SheetTitle>
            {swapSheet.step === "reason" && "Swap Exercise"}
            {swapSheet.step === "loading" && "Finding alternatives..."}
            {swapSheet.step === "alternatives" && "Choose Alternative"}
          </SheetTitle>
          {swapSheet.step === "reason" && (
            <SheetDescription>
              {`Why do you want to swap ${swapSheet.exerciseName}?`}
            </SheetDescription>
          )}
          {swapSheet.step === "alternatives" && (
            <SheetDescription>
              {`Select a replacement for ${swapSheet.exerciseName}`}
            </SheetDescription>
          )}
        </SheetHeader>

        <View className="gap-3 pb-8 pt-2">
          {swapSheet.step === "reason" && (
            <>
              {SWAP_REASONS.map(({ reason, label, icon, description }) => (
                <Pressable
                  key={reason}
                  accessibilityRole="button"
                  onPress={() => handleSwapReason(reason)}
                >
                  <Card className="p-4 active:bg-muted/50">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {icon(colors.foreground)}
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="font-medium text-foreground">{label}</Text>
                        <Text className="text-sm text-muted-foreground">
                          {description}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </>
          )}

          {swapSheet.step === "loading" && (
            <View className="gap-3 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </View>
          )}

          {swapSheet.step === "alternatives" && (
            <>
              {swapSheet.alternatives.map((alt, i) => (
                <Card key={i} className="p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <View className="mb-1 flex-row items-center gap-2">
                        <Dumbbell size={16} color={colors.mutedForeground} />
                        <Text
                          numberOfLines={1}
                          className="min-w-0 shrink font-medium text-foreground"
                        >
                          {alt.exercise}
                        </Text>
                        {i === 0 && (
                          <Badge variant="secondary" className="shrink-0">
                            Recommended
                          </Badge>
                        )}
                      </View>
                      <Text className="mb-2 text-sm text-muted-foreground">
                        {alt.reasoning}
                      </Text>
                      <View className="flex-row flex-wrap gap-1.5">
                        {alt.equipmentNeeded.map((eq) => (
                          <Badge key={eq} variant="outline">
                            {eq}
                          </Badge>
                        ))}
                        {alt.difficultyAdjustment &&
                          alt.difficultyAdjustment !== "similar" && (
                            <Badge
                              variant="outline"
                              className={cn(
                                alt.difficultyAdjustment === "easier"
                                  ? "border-green-500/30"
                                  : "border-red-500/30",
                              )}
                              textClassName={cn(
                                alt.difficultyAdjustment === "easier"
                                  ? "text-green-600"
                                  : "text-red-600",
                              )}
                            >
                              {alt.difficultyAdjustment === "easier"
                                ? "Easier"
                                : "Harder"}
                            </Badge>
                          )}
                      </View>
                    </View>
                    <Button size="sm" onPress={() => handleSelectAlternative(alt)}>
                      <Check size={16} color={colors.primaryForeground} />
                      <Text className="text-sm font-medium text-primary-foreground">
                        Use
                      </Text>
                    </Button>
                  </View>
                </Card>
              ))}

              <Button variant="outline" className="w-full" onPress={closeSwapSheet}>
                Cancel
              </Button>
            </>
          )}
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
