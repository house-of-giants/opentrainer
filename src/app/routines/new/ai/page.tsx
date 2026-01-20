"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import Link from "next/link";
import { toast } from "sonner";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";
import type { GeneratedRoutine, RoutineSwapAlternative } from "../../../../../convex/ai/routineGenerator";

type SwapReason = "equipment" | "discomfort" | "preference";

const SWAP_REASONS: Array<{ reason: SwapReason; label: string; icon: React.ReactNode; description: string }> = [
  { reason: "discomfort", label: "Causes discomfort", icon: <AlertTriangle className="h-5 w-5" />, description: "Pain, injury, or medical condition" },
  { reason: "equipment", label: "Don't have equipment", icon: <Ban className="h-5 w-5" />, description: "Missing required equipment" },
  { reason: "preference", label: "Personal preference", icon: <RefreshCw className="h-5 w-5" />, description: "Just want something different" },
];

type SplitType = "ppl" | "upper_lower" | "full_body" | "bro_split" | "ai_decide";
type PrimaryGoal = "strength" | "hypertrophy" | "both";

const SPLIT_OPTIONS: Array<{ id: SplitType; label: string; description: string }> = [
  { id: "ai_decide", label: "Let AI Decide", description: "Best fit for your schedule" },
  { id: "ppl", label: "Push/Pull/Legs", description: "6 days, high frequency" },
  { id: "upper_lower", label: "Upper/Lower", description: "4 days, balanced" },
  { id: "full_body", label: "Full Body", description: "2-3 days, efficient" },
  { id: "bro_split", label: "Bro Split", description: "5 days, bodybuilding style" },
];

const GOAL_OPTIONS: Array<{ id: PrimaryGoal; label: string; description: string }> = [
  { id: "strength", label: "Strength", description: "Low reps, heavy weights" },
  { id: "hypertrophy", label: "Hypertrophy", description: "Moderate reps, muscle growth" },
  { id: "both", label: "Both", description: "Balanced approach" },
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

export default function AIRoutineGeneratorPage() {
  const router = useRouter();
  const { vibrate } = useHaptic();
  const user = useQuery(api.users.getCurrentUser);
  const generateRoutine = useAction(api.ai.routineGenerator.generateRoutine);
  const getSwapAlternatives = useAction(api.ai.routineGenerator.getRoutineSwapAlternatives);
  const createRoutine = useMutation(api.routines.createRoutine);

  const [step, setStep] = useState<"form" | "generating" | "preview">("form");
  const [generatedRoutine, setGeneratedRoutine] = useState<GeneratedRoutine | null>(null);

  const [splitType, setSplitType] = useState<SplitType>("ai_decide");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>("both");
  const [daysPerWeek, setDaysPerWeek] = useState<number>(user?.weeklyAvailability ?? 4);
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
    if (revealStage > 0 && generatedRoutine && revealStage <= generatedRoutine.days.length + 2) {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate routine");
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
            targetReps: ex.targetReps,
          })),
        })),
      });

      vibrate("success");
      toast.success("Routine saved!");
      router.push("/routines");
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
  
  const openSwapSheet = (dayIndex: number, exerciseIndex: number, exerciseName: string) => {
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
      toast.error(error instanceof Error ? error.message : "Failed to get alternatives");
      setSwapSheet((prev) => ({ ...prev, step: "reason" }));
    }
  };
  
  const handleSelectAlternative = (newExerciseName: string) => {
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
            return { ...ex, exerciseName: newExerciseName };
          }),
        };
      }),
    };
    
    setGeneratedRoutine(updatedRoutine);
    toast.success(`Swapped to ${newExerciseName}`);
    setSwapSheet((prev) => ({ ...prev, open: false }));
  };
  
  const closeSwapSheet = () => {
    setSwapSheet((prev) => ({ ...prev, open: false, step: "reason", alternatives: [] }));
  };

  if (user === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center gap-4 px-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-40" />
          </div>
        </header>
        <main className="flex-1 p-4">
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center gap-4 px-4">
            <Link href="/routines/new">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="flex-1 font-semibold text-lg">AI Routine Generator</h1>
          </div>
        </header>
        <main className="flex-1 p-4 flex items-center justify-center">
          <Card className="p-8 text-center max-w-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10 mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-violet-500" />
            </div>
            <Badge className="mb-3 bg-violet-500/10 text-violet-600 hover:bg-violet-500/10">
              Free During Alpha
            </Badge>
            <h2 className="text-lg font-semibold mb-2">AI Routine Generator</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Get a personalized workout routine based on your goals, equipment, and schedule.
            </p>
            <Button className="gap-2" asChild>
              <Link href="/dashboard">
                <Sparkles className="h-4 w-4" />
                Get Started Free
              </Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href={step === "preview" ? "#" : "/routines/new"}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                if (step === "preview") {
                  e.preventDefault();
                  setStep("form");
                }
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="flex-1 font-semibold text-lg">
            {step === "preview" ? "Review Routine" : "AI Routine Generator"}
          </h1>
          {step === "preview" && (
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              <Save className="mr-1 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        {step === "form" && (
          <div className="space-y-6 max-w-lg mx-auto">
            <div className="text-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 mx-auto mb-3">
                <Wand2 className="h-6 w-6 text-violet-500" />
              </div>
              <h2 className="text-lg font-semibold">Build Your Routine</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We&apos;ll use your profile data to create a personalized program.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Days per week</Label>
              <div className="flex gap-2">
                {DAYS_OPTIONS.map((days) => (
                  <Button
                    key={days}
                    variant={daysPerWeek === days ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      vibrate("light");
                      setDaysPerWeek(days);
                    }}
                  >
                    {days}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Split type</Label>
              <div className="grid grid-cols-1 gap-2">
                {SPLIT_OPTIONS.map((option) => (
                  <Card
                    key={option.id}
                    className={cn(
                      "p-3 cursor-pointer transition-all",
                      splitType === option.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => {
                      vibrate("light");
                      setSplitType(option.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                      {splitType === option.id && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Primary goal</Label>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_OPTIONS.map((option) => (
                  <Card
                    key={option.id}
                    className={cn(
                      "p-3 cursor-pointer transition-all text-center",
                      primaryGoal === option.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => {
                      vibrate("light");
                      setPrimaryGoal(option.id);
                    }}
                  >
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Additional notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value.slice(0, 200))}
                placeholder="e.g., bad shoulder, want extra back work, prefer dumbbells..."
                className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {additionalNotes.length}/200
              </p>
            </div>

            {user.equipment && user.equipment.length > 0 && (
              <Card className="p-3 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Your equipment
                </p>
                <div className="flex flex-wrap gap-1">
                  {user.equipment.slice(0, 8).map((eq) => (
                    <Badge key={eq} variant="secondary" className="text-xs">
                      {eq.replace(/_/g, " ")}
                    </Badge>
                  ))}
                  {user.equipment.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{user.equipment.length - 8} more
                    </Badge>
                  )}
                </div>
              </Card>
            )}

            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold gap-2"
              onClick={handleGenerate}
            >
              <Sparkles className="h-5 w-5" />
              Generate Routine
            </Button>
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10 mb-4">
              <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Creating your routine...</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Analyzing your profile, goals, and equipment to build the perfect program.
            </p>
          </div>
        )}

        {step === "preview" && generatedRoutine && (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold min-h-[1.75rem]">
                {typedName}
                {typedName.length < generatedRoutine.name.length && (
                  <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-pulse" />
                )}
              </h2>
              <p 
                className={cn(
                  "text-sm text-muted-foreground mt-1 transition-opacity duration-300",
                  revealStage >= 1 ? "opacity-100" : "opacity-0"
                )}
              >
                {generatedRoutine.description}
              </p>
            </div>

            {generatedRoutine.rationale && (
              <Card 
                className={cn(
                  "p-3 bg-violet-500/5 border-violet-500/20 transition-all duration-500",
                  revealStage >= 1 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-2"
                )}
              >
                <p className="text-sm text-violet-700 dark:text-violet-300">
                  <Sparkles className="h-4 w-4 inline mr-1.5" />
                  {generatedRoutine.rationale}
                </p>
              </Card>
            )}

            <div className="space-y-3">
              {generatedRoutine.days.map((day, dayIndex) => {
                const isRevealed = revealStage >= dayIndex + 2;
                return (
                  <Card 
                    key={dayIndex} 
                    className={cn(
                      "overflow-hidden transition-all duration-300",
                      isRevealed 
                        ? "opacity-100 translate-y-0" 
                        : "opacity-0 translate-y-4"
                    )}
                    style={{ transitionDelay: isRevealed ? "0ms" : `${dayIndex * 50}ms` }}
                  >
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer"
                      onClick={() => toggleDayExpanded(dayIndex)}
                    >
                      <div>
                        <p className="font-semibold text-sm">{day.name}</p>
                        <p className="text-xs text-muted-foreground">{day.focus}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {day.exercises.length} exercises
                        </span>
                        {expandedDays.has(dayIndex) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {expandedDays.has(dayIndex) && (
                      <div className="border-t p-3 space-y-2">
                        {day.exercises.map((exercise, exIndex) => (
                          <div
                            key={exIndex}
                            className={cn(
                              "flex items-center justify-between py-2 px-2 rounded-md bg-muted/50",
                              "transition-all duration-200 cursor-pointer hover:bg-muted/70 active:bg-muted",
                              isRevealed ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                            )}
                            style={{ transitionDelay: `${exIndex * 30}ms` }}
                            onClick={() => openSwapSheet(dayIndex, exIndex, exercise.exerciseName)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium truncate">
                                {exercise.exerciseName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-xs font-mono">
                                {exercise.targetSets} × {exercise.targetReps}
                              </Badge>
                              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {generatedRoutine.weeklyStructure && (
              <Card 
                className={cn(
                  "p-3 bg-muted/50 transition-all duration-500",
                  revealStage >= generatedRoutine.days.length + 2
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2"
                )}
              >
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Weekly structure
                </p>
                <p className="text-sm">{generatedRoutine.weeklyStructure}</p>
              </Card>
            )}

            <div 
              className={cn(
                "flex gap-2 pt-4 transition-all duration-500",
                revealStage >= generatedRoutine.days.length + 2
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              )}
            >
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("form")}
              >
                Regenerate
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Routine
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
      
      <Drawer open={swapSheet.open} onOpenChange={(open) => !open && closeSwapSheet()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>
              {swapSheet.step === "reason" && "Swap Exercise"}
              {swapSheet.step === "loading" && "Finding alternatives..."}
              {swapSheet.step === "alternatives" && "Choose Alternative"}
            </DrawerTitle>
            <DrawerDescription>
              {swapSheet.step === "reason" && `Why do you want to swap ${swapSheet.exerciseName}?`}
              {swapSheet.step === "alternatives" && `Select a replacement for ${swapSheet.exerciseName}`}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3">
            {swapSheet.step === "reason" && (
              <>
                {SWAP_REASONS.map(({ reason, label, icon, description }) => (
                  <Card
                    key={reason}
                    className="cursor-pointer p-4 transition-colors hover:bg-muted/50 active:bg-muted/70"
                    onClick={() => handleSwapReason(reason)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {icon}
                      </div>
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
            
            {swapSheet.step === "loading" && (
              <div className="space-y-3 py-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}
            
            {swapSheet.step === "alternatives" && (
              <>
                {swapSheet.alternatives.map((alt, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{alt.exercise}</span>
                          {i === 0 && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alt.reasoning}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {alt.equipmentNeeded.map((eq) => (
                            <Badge key={eq} variant="outline" className="text-xs">
                              {eq}
                            </Badge>
                          ))}
                          {alt.difficultyAdjustment && alt.difficultyAdjustment !== "similar" && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                alt.difficultyAdjustment === "easier"
                                  ? "border-green-500/30 text-green-600"
                                  : "border-red-500/30 text-red-600"
                              )}
                            >
                              {alt.difficultyAdjustment === "easier" ? "Easier" : "Harder"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleSelectAlternative(alt.exercise)}>
                        <Check className="h-4 w-4 mr-1.5" />
                        Use
                      </Button>
                    </div>
                  </Card>
                ))}
                
                <Button variant="outline" className="w-full" onClick={closeSwapSheet}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
