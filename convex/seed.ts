import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

type WorkoutProfile = "strength_focused" | "cardio_focused" | "hybrid";

interface LiftingExercise {
  name: string;
  sets: Array<{ reps: number; weight: number; rpe: number }>;
}

interface CardioExercise {
  name: string;
  cardio: {
    durationSeconds: number;
    distance?: number;
    distanceUnit?: "km" | "mi";
    rpe: number;
  };
}

type WorkoutExercise = LiftingExercise | CardioExercise;

interface WorkoutTemplate {
  title: string;
  exercises: WorkoutExercise[];
}

const STRENGTH_WORKOUTS: Record<string, WorkoutTemplate> = {
  push: {
    title: "Push Day",
    exercises: [
      { name: "Bench Press", sets: [
        { reps: 8, weight: 185, rpe: 7 },
        { reps: 8, weight: 185, rpe: 7.5 },
        { reps: 6, weight: 195, rpe: 8 },
        { reps: 6, weight: 195, rpe: 8.5 },
      ]},
      { name: "Incline Dumbbell Press", sets: [
        { reps: 10, weight: 65, rpe: 7 },
        { reps: 10, weight: 65, rpe: 7.5 },
        { reps: 8, weight: 70, rpe: 8 },
      ]},
      { name: "Overhead Press", sets: [
        { reps: 8, weight: 95, rpe: 7 },
        { reps: 8, weight: 95, rpe: 7.5 },
        { reps: 6, weight: 105, rpe: 8 },
      ]},
      { name: "Lateral Raise", sets: [
        { reps: 12, weight: 20, rpe: 7 },
        { reps: 12, weight: 20, rpe: 7.5 },
        { reps: 12, weight: 20, rpe: 8 },
      ]},
      { name: "Tricep Pushdown", sets: [
        { reps: 12, weight: 50, rpe: 7 },
        { reps: 12, weight: 50, rpe: 7.5 },
        { reps: 10, weight: 55, rpe: 8 },
      ]},
    ],
  },
  pull: {
    title: "Pull Day",
    exercises: [
      { name: "Deadlift", sets: [
        { reps: 5, weight: 275, rpe: 7 },
        { reps: 5, weight: 285, rpe: 7.5 },
        { reps: 3, weight: 305, rpe: 8 },
      ]},
      { name: "Barbell Row", sets: [
        { reps: 8, weight: 155, rpe: 7 },
        { reps: 8, weight: 155, rpe: 7.5 },
        { reps: 8, weight: 165, rpe: 8 },
      ]},
      { name: "Lat Pulldown", sets: [
        { reps: 10, weight: 130, rpe: 7 },
        { reps: 10, weight: 130, rpe: 7.5 },
        { reps: 10, weight: 140, rpe: 8 },
      ]},
      { name: "Face Pull", sets: [
        { reps: 15, weight: 40, rpe: 6 },
        { reps: 15, weight: 40, rpe: 6.5 },
        { reps: 15, weight: 45, rpe: 7 },
      ]},
      { name: "Barbell Curl", sets: [
        { reps: 10, weight: 65, rpe: 7 },
        { reps: 10, weight: 65, rpe: 7.5 },
        { reps: 8, weight: 70, rpe: 8 },
      ]},
    ],
  },
  legs: {
    title: "Leg Day",
    exercises: [
      { name: "Squat", sets: [
        { reps: 6, weight: 225, rpe: 7 },
        { reps: 6, weight: 235, rpe: 7.5 },
        { reps: 4, weight: 255, rpe: 8 },
        { reps: 4, weight: 255, rpe: 8.5 },
      ]},
      { name: "Romanian Deadlift", sets: [
        { reps: 10, weight: 185, rpe: 7 },
        { reps: 10, weight: 185, rpe: 7.5 },
        { reps: 8, weight: 205, rpe: 8 },
      ]},
      { name: "Leg Press", sets: [
        { reps: 12, weight: 360, rpe: 7 },
        { reps: 12, weight: 380, rpe: 7.5 },
        { reps: 10, weight: 400, rpe: 8 },
      ]},
      { name: "Leg Curl", sets: [
        { reps: 12, weight: 80, rpe: 7 },
        { reps: 12, weight: 80, rpe: 7.5 },
        { reps: 10, weight: 90, rpe: 8 },
      ]},
      { name: "Standing Calf Raise", sets: [
        { reps: 15, weight: 180, rpe: 7 },
        { reps: 15, weight: 180, rpe: 7.5 },
        { reps: 12, weight: 200, rpe: 8 },
      ]},
    ],
  },
  upperA: {
    title: "Upper Body A",
    exercises: [
      { name: "Bench Press", sets: [
        { reps: 6, weight: 195, rpe: 7 },
        { reps: 6, weight: 195, rpe: 7.5 },
        { reps: 4, weight: 205, rpe: 8 },
      ]},
      { name: "Barbell Row", sets: [
        { reps: 8, weight: 165, rpe: 7 },
        { reps: 8, weight: 165, rpe: 7.5 },
        { reps: 6, weight: 175, rpe: 8 },
      ]},
      { name: "Dumbbell Shoulder Press", sets: [
        { reps: 10, weight: 55, rpe: 7 },
        { reps: 10, weight: 55, rpe: 7.5 },
        { reps: 8, weight: 60, rpe: 8 },
      ]},
      { name: "Dumbbell Curl", sets: [
        { reps: 12, weight: 30, rpe: 7 },
        { reps: 12, weight: 30, rpe: 7.5 },
      ]},
      { name: "Skull Crusher", sets: [
        { reps: 12, weight: 55, rpe: 7 },
        { reps: 12, weight: 55, rpe: 7.5 },
      ]},
    ],
  },
};

const CARDIO_WORKOUTS: Record<string, WorkoutTemplate> = {
  run: {
    title: "Morning Run",
    exercises: [
      { name: "Running", cardio: { durationSeconds: 30 * 60, distance: 5, distanceUnit: "km", rpe: 6 } },
    ],
  },
  longRun: {
    title: "Long Run",
    exercises: [
      { name: "Running", cardio: { durationSeconds: 60 * 60, distance: 10, distanceUnit: "km", rpe: 5 } },
    ],
  },
  bike: {
    title: "Cycling Session",
    exercises: [
      { name: "Cycling", cardio: { durationSeconds: 45 * 60, distance: 20, distanceUnit: "km", rpe: 6 } },
    ],
  },
  hiit: {
    title: "HIIT Session",
    exercises: [
      { name: "HIIT", cardio: { durationSeconds: 25 * 60, rpe: 9 } },
    ],
  },
  rowing: {
    title: "Rowing Session",
    exercises: [
      { name: "Rowing", cardio: { durationSeconds: 20 * 60, distance: 4, distanceUnit: "km", rpe: 7 } },
    ],
  },
  stairClimber: {
    title: "Stair Climber",
    exercises: [
      { name: "Stair Climber", cardio: { durationSeconds: 30 * 60, rpe: 7 } },
    ],
  },
};

const WORKOUT_SCHEDULES: Record<WorkoutProfile, string[][]> = {
  strength_focused: [
    ["push", "pull", "legs", "upperA", "legs"],
    ["push", "pull", "legs", "push", "pull"],
    ["legs", "upperA", "push", "pull", "legs"],
  ],
  cardio_focused: [
    ["run", "bike", "longRun", "hiit", "rowing"],
    ["run", "stairClimber", "bike", "run", "hiit"],
    ["longRun", "rowing", "run", "bike", "stairClimber"],
  ],
  hybrid: [
    ["push", "run", "pull", "bike", "legs"],
    ["upperA", "stairClimber", "push", "run", "pull"],
    ["legs", "bike", "upperA", "hiit", "push"],
  ],
};

function isLiftingExercise(ex: WorkoutExercise): ex is LiftingExercise {
  return "sets" in ex;
}

function isCardioExercise(ex: WorkoutExercise): ex is CardioExercise {
  return "cardio" in ex;
}

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const seedTestWorkouts = mutation({
  args: {
    clerkId: v.string(),
    profile: v.union(
      v.literal("strength_focused"),
      v.literal("cardio_focused"),
      v.literal("hybrid")
    ),
    weeksBack: v.optional(v.number()),
    clearExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    if (!user) {
      throw new Error(`User not found with Clerk ID: ${args.clerkId}`);
    }

    const userId = user._id;
    const weeksBack = args.weeksBack ?? 3;
    const profile = args.profile;

    if (args.clearExisting) {
      const existingWorkouts = await ctx.db
        .query("workouts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      for (const workout of existingWorkouts) {
        const entries = await ctx.db
          .query("entries")
          .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
          .collect();
        
        for (const entry of entries) {
          await ctx.db.delete(entry._id);
        }
        await ctx.db.delete(workout._id);
      }
    }

    const exercises = await ctx.db.query("exercises").collect();
    const exerciseByName = new Map(exercises.map((e) => [e.name, e._id]));

    const schedule = WORKOUT_SCHEDULES[profile];
    const now = Date.now();
    let workoutsCreated = 0;
    let entriesCreated = 0;

    for (let week = weeksBack - 1; week >= 0; week--) {
      const weekSchedule = schedule[week % schedule.length];
      
      for (let day = 0; day < weekSchedule.length; day++) {
        const workoutKey = weekSchedule[day];
        const template = CARDIO_WORKOUTS[workoutKey] ?? STRENGTH_WORKOUTS[workoutKey];
        const isCardio = workoutKey in CARDIO_WORKOUTS;

        const daysAgo = week * 7 + (weekSchedule.length - 1 - day);
        const workoutDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        workoutDate.setHours(7 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);
        
        const startedAt = workoutDate.getTime();
        const durationMinutes = isCardio ? 30 + Math.floor(Math.random() * 30) : 45 + Math.floor(Math.random() * 30);
        const completedAt = startedAt + durationMinutes * 60 * 1000;

        let totalVolume = 0;
        let totalSets = 0;
        const exerciseCount = template.exercises.length;
        let totalCardioDurationSeconds = 0;
        let totalDistanceKm = 0;
        let hasCardio = false;

        for (const exercise of template.exercises) {
          if (isLiftingExercise(exercise)) {
            totalSets += exercise.sets.length;
            for (const set of exercise.sets) {
              totalVolume += set.weight * set.reps;
            }
          }
          if (isCardioExercise(exercise)) {
            hasCardio = true;
            totalCardioDurationSeconds += exercise.cardio.durationSeconds;
            if (exercise.cardio.distance) {
              totalDistanceKm += exercise.cardio.distanceUnit === "mi"
                ? exercise.cardio.distance * 1.60934
                : exercise.cardio.distance;
            }
          }
        }

        const workoutId = await ctx.db.insert("workouts", {
          userId,
          title: template.title,
          status: "completed",
          startedAt,
          completedAt,
          summary: {
            totalVolume: totalVolume > 0 ? totalVolume : undefined,
            totalSets: totalSets > 0 ? totalSets : undefined,
            totalDurationMinutes: durationMinutes,
            exerciseCount,
            totalCardioDurationSeconds: totalCardioDurationSeconds > 0 ? totalCardioDurationSeconds : undefined,
            totalDistanceKm: totalDistanceKm > 0 ? totalDistanceKm : undefined,
            hasCardio,
          },
        });
        workoutsCreated++;

        let entryTime = startedAt;
        for (const exercise of template.exercises) {
          const exerciseId = exerciseByName.get(exercise.name);

          if (isLiftingExercise(exercise)) {
            for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
              const set = exercise.sets[setIndex];
              const weightVariation = Math.floor(Math.random() * 10) - 5;
              const actualWeight = Math.max(0, set.weight + weightVariation);
              const rpeVariation = (Math.random() * 0.5) - 0.25;
              const actualRpe = Math.min(10, Math.max(1, set.rpe + rpeVariation));

              await ctx.db.insert("entries", {
                workoutId,
                userId,
                exerciseId,
                exerciseName: exercise.name,
                kind: "lifting",
                lifting: {
                  setNumber: setIndex + 1,
                  reps: set.reps,
                  weight: actualWeight,
                  unit: "lb",
                  rpe: Math.round(actualRpe * 10) / 10,
                },
                createdAt: entryTime,
              });
              entriesCreated++;
              entryTime += 90 * 1000;
            }
          }

          if (isCardioExercise(exercise)) {
            const { cardio } = exercise;
            await ctx.db.insert("entries", {
              workoutId,
              userId,
              exerciseId,
              exerciseName: exercise.name,
              kind: "cardio",
              cardio: {
                mode: "steady",
                durationSeconds: cardio.durationSeconds,
                distance: cardio.distance,
                distanceUnit: cardio.distanceUnit,
                rpe: cardio.rpe,
              },
              createdAt: entryTime,
            });
            entriesCreated++;
            entryTime += cardio.durationSeconds * 1000;
          }

          entryTime += 2 * 60 * 1000;
        }
      }
    }

    return {
      success: true,
      userId: userId.toString(),
      profile,
      workoutsCreated,
      entriesCreated,
      weeksOfData: weeksBack,
    };
  },
});

export const clearUserWorkouts = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    if (!user) {
      throw new Error(`User not found with Clerk ID: ${args.clerkId}`);
    }

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    let deletedWorkouts = 0;
    let deletedEntries = 0;

    for (const workout of workouts) {
      const entries = await ctx.db
        .query("entries")
        .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
        .collect();
      
      for (const entry of entries) {
        await ctx.db.delete(entry._id);
        deletedEntries++;
      }
      
      await ctx.db.delete(workout._id);
      deletedWorkouts++;
    }

    return {
      success: true,
      deletedWorkouts,
      deletedEntries,
    };
  },
});

export const clearUserAssessments = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    if (!user) {
      throw new Error(`User not found with Clerk ID: ${args.clerkId}`);
    }

    const assessments = await ctx.db
      .query("assessments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    let deletedAssessments = 0;
    let deletedDetails = 0;

    for (const assessment of assessments) {
      const details = await ctx.db
        .query("assessmentDetails")
        .withIndex("by_assessment", (q) => q.eq("assessmentId", assessment._id))
        .collect();
      
      for (const detail of details) {
        await ctx.db.delete(detail._id);
        deletedDetails++;
      }
      
      await ctx.db.delete(assessment._id);
      deletedAssessments++;
    }

    return {
      success: true,
      deletedAssessments,
      deletedDetails,
    };
  },
});
