import type {
  GeneratedRoutine,
  RoutineSwapAlternative,
} from "@opentrainer/backend/convex/ai/routineGenerator";

// Shape mirrors what api.ai.routineGenerator.generateRoutine returns. Tests use
// this instead of the real action: generation costs OpenRouter credits and is
// capped at 10 requests/day per user.
export const generatedRoutine: GeneratedRoutine = {
  name: "Upper/Lower Power",
  description: "A four-day upper/lower split built around your equipment.",
  weeklyStructure: "Mon Upper · Tue Lower · Thu Upper · Fri Lower",
  rationale: "Four sessions fit your availability and hit each muscle twice a week.",
  days: [
    {
      name: "Upper A",
      focus: "Chest, back, shoulders",
      exercises: [
        {
          exerciseName: "Bench Press",
          kind: "lifting",
          targetSets: 4,
          targetReps: "6-8",
          measurementType: "reps",
        },
        {
          exerciseName: "Barbell Row",
          kind: "lifting",
          targetSets: 4,
          targetReps: "8-10",
        },
        {
          exerciseName: "Plank",
          kind: "mobility",
          targetSets: 3,
          targetReps: "",
          measurementType: "duration",
          targetHoldSeconds: 45,
        },
      ],
    },
    {
      name: "Lower A",
      focus: "Quads, hamstrings, glutes",
      exercises: [
        {
          exerciseName: "Back Squat",
          kind: "lifting",
          targetSets: 5,
          targetReps: "5",
        },
      ],
    },
  ],
};

export const swapAlternatives: RoutineSwapAlternative[] = [
  {
    exercise: "Incline Dumbbell Press",
    reasoning: "Same push pattern with a shoulder-friendly path.",
    equipmentNeeded: ["dumbbells", "bench"],
    difficultyAdjustment: "easier",
    measurementType: "reps",
  },
  {
    exercise: "Machine Chest Press",
    reasoning: "Fixed path removes stabiliser demand.",
    equipmentNeeded: ["machine"],
    difficultyAdjustment: "similar",
  },
];
