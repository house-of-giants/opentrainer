import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./auth";

// ============================================================================
// System Exercises Data
// ============================================================================
// Common exercises organized by muscle group for seeding the database

const SYSTEM_EXERCISES = [
  // --------------------------------------------------------------------------
  // Chest
  // --------------------------------------------------------------------------
  { name: "Bench Press", aliases: ["Flat Bench Press", "Barbell Bench Press"], category: "lifting", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["barbell", "bench"] },
  { name: "Incline Bench Press", aliases: ["Incline Barbell Press"], category: "lifting", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["barbell", "bench"] },
  { name: "Dumbbell Bench Press", aliases: ["DB Bench Press", "Flat Dumbbell Press"], category: "lifting", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["dumbbell", "bench"] },
  { name: "Incline Dumbbell Press", aliases: ["Incline DB Press"], category: "lifting", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["dumbbell", "bench"] },
  { name: "Dumbbell Fly", aliases: ["Chest Fly", "DB Fly"], category: "lifting", muscleGroups: ["chest"], equipment: ["dumbbell", "bench"] },
  { name: "Cable Fly", aliases: ["Cable Crossover"], category: "lifting", muscleGroups: ["chest"], equipment: ["cable"] },
  { name: "Push Up", aliases: ["Pushup", "Press Up"], category: "lifting", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["bodyweight"] },
  { name: "Chest Dip", aliases: ["Dip"], category: "lifting", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["bodyweight", "dip bars"] },
  { name: "Machine Chest Press", aliases: ["Chest Press Machine"], category: "lifting", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["machine"] },
  { name: "Pec Deck", aliases: ["Pec Deck Fly", "Machine Fly"], category: "lifting", muscleGroups: ["chest"], equipment: ["machine"] },

  // --------------------------------------------------------------------------
  // Back
  // --------------------------------------------------------------------------
  { name: "Deadlift", aliases: ["Conventional Deadlift", "Barbell Deadlift"], category: "lifting", muscleGroups: ["back", "glutes", "hamstrings"], equipment: ["barbell"] },
  { name: "Pull Up", aliases: ["Pullup", "Chin Up"], category: "lifting", muscleGroups: ["back", "biceps"], equipment: ["bodyweight", "pull-up bar"] },
  { name: "Lat Pulldown", aliases: ["Cable Pulldown", "Wide Grip Pulldown"], category: "lifting", muscleGroups: ["back", "biceps"], equipment: ["cable"] },
  { name: "Barbell Row", aliases: ["Bent Over Row", "BB Row"], category: "lifting", muscleGroups: ["back", "biceps"], equipment: ["barbell"] },
  { name: "Dumbbell Row", aliases: ["One Arm Row", "DB Row", "Single Arm Row"], category: "lifting", muscleGroups: ["back", "biceps"], equipment: ["dumbbell"] },
  { name: "Cable Row", aliases: ["Seated Cable Row", "Seated Row"], category: "lifting", muscleGroups: ["back", "biceps"], equipment: ["cable"] },
  { name: "T-Bar Row", aliases: ["T Bar Row", "Landmine Row"], category: "lifting", muscleGroups: ["back", "biceps"], equipment: ["barbell", "landmine"] },
  { name: "Face Pull", aliases: ["Cable Face Pull"], category: "lifting", muscleGroups: ["back", "shoulders"], equipment: ["cable"] },

  // --------------------------------------------------------------------------
  // Shoulders
  // --------------------------------------------------------------------------
  { name: "Overhead Press", aliases: ["OHP", "Shoulder Press", "Military Press"], category: "lifting", muscleGroups: ["shoulders", "triceps"], equipment: ["barbell"] },
  { name: "Dumbbell Shoulder Press", aliases: ["DB Shoulder Press", "Seated Dumbbell Press"], category: "lifting", muscleGroups: ["shoulders", "triceps"], equipment: ["dumbbell"] },
  { name: "Lateral Raise", aliases: ["Side Raise", "Dumbbell Lateral Raise"], category: "lifting", muscleGroups: ["shoulders"], equipment: ["dumbbell"] },
  { name: "Front Raise", aliases: ["Dumbbell Front Raise"], category: "lifting", muscleGroups: ["shoulders"], equipment: ["dumbbell"] },
  { name: "Rear Delt Fly", aliases: ["Reverse Fly", "Rear Delt Raise"], category: "lifting", muscleGroups: ["shoulders", "back"], equipment: ["dumbbell"] },
  { name: "Arnold Press", aliases: ["Arnold Dumbbell Press"], category: "lifting", muscleGroups: ["shoulders", "triceps"], equipment: ["dumbbell"] },
  { name: "Upright Row", aliases: ["Barbell Upright Row"], category: "lifting", muscleGroups: ["shoulders", "traps"], equipment: ["barbell"] },
  { name: "Shrug", aliases: ["Barbell Shrug", "Dumbbell Shrug"], category: "lifting", muscleGroups: ["traps"], equipment: ["barbell", "dumbbell"] },

  // --------------------------------------------------------------------------
  // Arms - Biceps
  // --------------------------------------------------------------------------
  { name: "Barbell Curl", aliases: ["BB Curl", "Standing Barbell Curl"], category: "lifting", muscleGroups: ["biceps"], equipment: ["barbell"] },
  { name: "Dumbbell Curl", aliases: ["DB Curl", "Bicep Curl"], category: "lifting", muscleGroups: ["biceps"], equipment: ["dumbbell"] },
  { name: "Hammer Curl", aliases: ["Dumbbell Hammer Curl"], category: "lifting", muscleGroups: ["biceps", "forearms"], equipment: ["dumbbell"] },
  { name: "Preacher Curl", aliases: ["EZ Bar Preacher Curl"], category: "lifting", muscleGroups: ["biceps"], equipment: ["barbell", "bench"] },
  { name: "Incline Dumbbell Curl", aliases: ["Incline Curl"], category: "lifting", muscleGroups: ["biceps"], equipment: ["dumbbell", "bench"] },
  { name: "Cable Curl", aliases: ["Cable Bicep Curl"], category: "lifting", muscleGroups: ["biceps"], equipment: ["cable"] },
  { name: "Concentration Curl", aliases: ["Seated Concentration Curl"], category: "lifting", muscleGroups: ["biceps"], equipment: ["dumbbell"] },

  // --------------------------------------------------------------------------
  // Arms - Triceps
  // --------------------------------------------------------------------------
  { name: "Tricep Pushdown", aliases: ["Cable Pushdown", "Rope Pushdown"], category: "lifting", muscleGroups: ["triceps"], equipment: ["cable"] },
  { name: "Skull Crusher", aliases: ["Lying Tricep Extension", "French Press"], category: "lifting", muscleGroups: ["triceps"], equipment: ["barbell", "dumbbell"] },
  { name: "Overhead Tricep Extension", aliases: ["Tricep Extension", "French Press"], category: "lifting", muscleGroups: ["triceps"], equipment: ["dumbbell", "cable"] },
  { name: "Close Grip Bench Press", aliases: ["CGBP"], category: "lifting", muscleGroups: ["triceps", "chest"], equipment: ["barbell", "bench"] },
  { name: "Tricep Dip", aliases: ["Bench Dip", "Chair Dip"], category: "lifting", muscleGroups: ["triceps"], equipment: ["bodyweight"] },
  { name: "Diamond Push Up", aliases: ["Close Grip Push Up"], category: "lifting", muscleGroups: ["triceps", "chest"], equipment: ["bodyweight"] },

  // --------------------------------------------------------------------------
  // Legs - Quads
  // --------------------------------------------------------------------------
  { name: "Squat", aliases: ["Back Squat", "Barbell Squat", "Air Squat"], category: "lifting", muscleGroups: ["quads", "glutes", "hamstrings"], equipment: ["barbell", "bodyweight"] },
  { name: "Front Squat", aliases: ["Barbell Front Squat"], category: "lifting", muscleGroups: ["quads", "glutes"], equipment: ["barbell"] },
  { name: "Leg Press", aliases: ["Machine Leg Press"], category: "lifting", muscleGroups: ["quads", "glutes"], equipment: ["machine"] },
  { name: "Leg Extension", aliases: ["Machine Leg Extension"], category: "lifting", muscleGroups: ["quads"], equipment: ["machine"] },
  { name: "Hack Squat", aliases: ["Machine Hack Squat"], category: "lifting", muscleGroups: ["quads", "glutes"], equipment: ["machine"] },
  { name: "Goblet Squat", aliases: ["Dumbbell Goblet Squat"], category: "lifting", muscleGroups: ["quads", "glutes"], equipment: ["dumbbell", "bodyweight"] },
  { name: "Bulgarian Split Squat", aliases: ["Rear Foot Elevated Split Squat"], category: "lifting", muscleGroups: ["quads", "glutes"], equipment: ["dumbbell", "bench", "bodyweight"] },
  { name: "Lunge", aliases: ["Walking Lunge", "Dumbbell Lunge"], category: "lifting", muscleGroups: ["quads", "glutes"], equipment: ["dumbbell", "bodyweight"] },

  // --------------------------------------------------------------------------
  // Legs - Hamstrings & Glutes
  // --------------------------------------------------------------------------
  { name: "Romanian Deadlift", aliases: ["RDL", "Stiff Leg Deadlift"], category: "lifting", muscleGroups: ["hamstrings", "glutes"], equipment: ["barbell", "dumbbell"] },
  { name: "Leg Curl", aliases: ["Lying Leg Curl", "Hamstring Curl"], category: "lifting", muscleGroups: ["hamstrings"], equipment: ["machine"] },
  { name: "Seated Leg Curl", aliases: ["Seated Hamstring Curl"], category: "lifting", muscleGroups: ["hamstrings"], equipment: ["machine"] },
  { name: "Hip Thrust", aliases: ["Barbell Hip Thrust", "Glute Bridge"], category: "lifting", muscleGroups: ["glutes", "hamstrings"], equipment: ["barbell", "bench", "bodyweight"] },
  { name: "Glute Bridge", aliases: ["Bodyweight Glute Bridge"], category: "lifting", muscleGroups: ["glutes"], equipment: ["bodyweight"] },
  { name: "Good Morning", aliases: ["Barbell Good Morning"], category: "lifting", muscleGroups: ["hamstrings", "glutes", "back"], equipment: ["barbell"] },
  { name: "Sumo Deadlift", aliases: ["Wide Stance Deadlift"], category: "lifting", muscleGroups: ["glutes", "hamstrings", "quads"], equipment: ["barbell"] },

  // --------------------------------------------------------------------------
  // Legs - Calves
  // --------------------------------------------------------------------------
  { name: "Standing Calf Raise", aliases: ["Calf Raise", "Machine Calf Raise"], category: "lifting", muscleGroups: ["calves"], equipment: ["machine", "bodyweight"] },
  { name: "Seated Calf Raise", aliases: ["Seated Calf Machine"], category: "lifting", muscleGroups: ["calves"], equipment: ["machine"] },

  // --------------------------------------------------------------------------
  // Core
  // --------------------------------------------------------------------------
  { name: "Plank", aliases: ["Front Plank"], category: "lifting", muscleGroups: ["core"], equipment: ["bodyweight"] },
  { name: "Crunch", aliases: ["Ab Crunch"], category: "lifting", muscleGroups: ["core"], equipment: ["bodyweight"] },
  { name: "Leg Raise", aliases: ["Hanging Leg Raise", "Lying Leg Raise"], category: "lifting", muscleGroups: ["core"], equipment: ["bodyweight"] },
  { name: "Russian Twist", aliases: ["Seated Russian Twist"], category: "lifting", muscleGroups: ["core"], equipment: ["bodyweight", "dumbbell"] },
  { name: "Ab Wheel Rollout", aliases: ["Ab Roller"], category: "lifting", muscleGroups: ["core"], equipment: ["ab wheel"] },
  { name: "Cable Crunch", aliases: ["Kneeling Cable Crunch"], category: "lifting", muscleGroups: ["core"], equipment: ["cable"] },
  { name: "Dead Bug", aliases: [], category: "lifting", muscleGroups: ["core"], equipment: ["bodyweight"] },
  { name: "Mountain Climber", aliases: [], category: "lifting", muscleGroups: ["core"], equipment: ["bodyweight"] },

  // --------------------------------------------------------------------------
  // Cardio
  // --------------------------------------------------------------------------
  { name: "Running", aliases: ["Run", "Jogging", "Outdoor Run"], category: "cardio", muscleGroups: [], equipment: [], modality: "run", primaryMetric: "distance" },
  { name: "Treadmill", aliases: ["Treadmill Run", "Indoor Run"], category: "cardio", muscleGroups: [], equipment: [], modality: "treadmill", primaryMetric: "duration" },
  { name: "Cycling", aliases: ["Bike", "Outdoor Bike"], category: "cardio", muscleGroups: [], equipment: [], modality: "bike", primaryMetric: "distance" },
  { name: "Stationary Bike", aliases: ["Indoor Bike", "Spin Bike"], category: "cardio", muscleGroups: [], equipment: [], modality: "stationary_bike", primaryMetric: "duration" },
  { name: "Rowing", aliases: ["Row", "Rowing Machine", "Erg"], category: "cardio", muscleGroups: [], equipment: [], modality: "row", primaryMetric: "distance" },
  { name: "Stair Climber", aliases: ["Stair Stepper", "StairMaster"], category: "cardio", muscleGroups: [], equipment: [], modality: "stairs", primaryMetric: "duration" },
  { name: "Elliptical", aliases: ["Elliptical Trainer"], category: "cardio", muscleGroups: [], equipment: [], modality: "elliptical", primaryMetric: "duration" },
  { name: "Jump Rope", aliases: ["Skipping"], category: "cardio", muscleGroups: [], equipment: [], modality: "jump_rope", primaryMetric: "duration" },
  { name: "Swimming", aliases: ["Swim"], category: "cardio", muscleGroups: [], equipment: [], modality: "swim", primaryMetric: "distance" },
  { name: "Walking", aliases: ["Walk", "Outdoor Walk"], category: "cardio", muscleGroups: [], equipment: [], modality: "walk", primaryMetric: "distance" },
  { name: "Incline Walking", aliases: ["Treadmill Walk", "Indoor Walk"], category: "cardio", muscleGroups: [], equipment: [], modality: "incline_walk", primaryMetric: "duration" },
  { name: "HIIT", aliases: ["High Intensity Interval Training", "Interval Training"], category: "cardio", muscleGroups: [], equipment: [], modality: "hiit", primaryMetric: "duration" },

  // --------------------------------------------------------------------------
  // Mobility
  // --------------------------------------------------------------------------
  { name: "Foam Rolling", aliases: ["Foam Roll"], category: "mobility", muscleGroups: [], equipment: ["foam roller"] },
  { name: "Stretching", aliases: ["Static Stretch"], category: "mobility", muscleGroups: [], equipment: ["bodyweight"] },
] as const;

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all exercises (system + user-created)
 */
export const getExercises = query({
  args: {
    category: v.optional(v.union(
      v.literal("lifting"),
      v.literal("cardio"),
      v.literal("mobility"),
      v.literal("other")
    )),
    muscleGroup: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let exercises = await ctx.db.query("exercises").collect();

    if (args.category) {
      exercises = exercises.filter(e => e.category === args.category);
    }

    if (args.muscleGroup) {
      exercises = exercises.filter(e => 
        e.muscleGroups?.includes(args.muscleGroup!)
      );
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      exercises = exercises.filter(e => 
        e.name.toLowerCase().includes(searchLower) ||
        e.aliases?.some(a => a.toLowerCase().includes(searchLower))
      );
    }

    return exercises.sort((a, b) => {
      if (a.isSystemExercise !== b.isSystemExercise) {
        return a.isSystemExercise ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  },
});

/**
 * Get exercise by ID
 */
export const getExercise = query({
  args: { id: v.id("exercises") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get all unique muscle groups from exercises
 */
export const getMuscleGroups = query({
  args: {},
  handler: async (ctx) => {
    const exercises = await ctx.db.query("exercises").collect();
    const muscleGroups = new Set<string>();
    
    for (const exercise of exercises) {
      for (const group of exercise.muscleGroups ?? []) {
        muscleGroups.add(group);
      }
    }
    
    return Array.from(muscleGroups).sort();
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Seed the database with system exercises
 * Safe to run multiple times - skips existing exercises
 */
export const seedSystemExercises = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("exercises")
      .filter((q) => q.eq(q.field("isSystemExercise"), true))
      .collect();
    
    const existingNames = new Set(existing.map(e => e.name.toLowerCase()));
    
    let added = 0;
    const now = Date.now();

    for (const exercise of SYSTEM_EXERCISES) {
      if (existingNames.has(exercise.name.toLowerCase())) {
        continue;
      }

      await ctx.db.insert("exercises", {
        name: exercise.name,
        aliases: exercise.aliases?.length ? [...exercise.aliases] : undefined,
        category: exercise.category as "lifting" | "cardio" | "mobility" | "other",
        muscleGroups: exercise.muscleGroups?.length ? [...exercise.muscleGroups] : undefined,
        equipment: exercise.equipment?.length ? [...exercise.equipment] : undefined,
        modality: "modality" in exercise ? exercise.modality : undefined,
        primaryMetric: "primaryMetric" in exercise ? (exercise.primaryMetric as "duration" | "distance") : undefined,
        isSystemExercise: true,
        createdAt: now,
      });
      
      added++;
    }

    return { added, total: SYSTEM_EXERCISES.length, skipped: SYSTEM_EXERCISES.length - added };
  },
});

/**
 * Update existing system exercises with latest data from SYSTEM_EXERCISES
 * Use this after modifying equipment, aliases, or other fields in SYSTEM_EXERCISES
 */
export const updateSystemExercises = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("exercises")
      .filter((q) => q.eq(q.field("isSystemExercise"), true))
      .collect();
    
    const existingByName = new Map(
      existing.map(e => [e.name.toLowerCase(), e])
    );
    
    let updated = 0;

    for (const exercise of SYSTEM_EXERCISES) {
      const existingExercise = existingByName.get(exercise.name.toLowerCase());
      if (!existingExercise) continue;

      const needsUpdate = 
        JSON.stringify(existingExercise.aliases ?? []) !== JSON.stringify(exercise.aliases ?? []) ||
        JSON.stringify(existingExercise.equipment ?? []) !== JSON.stringify(exercise.equipment ?? []) ||
        JSON.stringify(existingExercise.muscleGroups ?? []) !== JSON.stringify(exercise.muscleGroups ?? []) ||
        existingExercise.category !== exercise.category;

      if (needsUpdate) {
        await ctx.db.patch(existingExercise._id, {
          aliases: exercise.aliases?.length ? [...exercise.aliases] : undefined,
          equipment: exercise.equipment?.length ? [...exercise.equipment] : undefined,
          muscleGroups: exercise.muscleGroups?.length ? [...exercise.muscleGroups] : undefined,
          category: exercise.category as "lifting" | "cardio" | "mobility" | "other",
        });
        updated++;
      }
    }

    return { updated, total: existing.length };
  },
});

/**
 * Create a custom user exercise
 */
export const createExercise = mutation({
  args: {
    name: v.string(),
    aliases: v.optional(v.array(v.string())),
    category: v.union(
      v.literal("lifting"),
      v.literal("cardio"),
      v.literal("mobility"),
      v.literal("other")
    ),
    muscleGroups: v.optional(v.array(v.string())),
    equipment: v.optional(v.array(v.string())),
    modality: v.optional(v.string()),
    primaryMetric: v.optional(v.union(v.literal("duration"), v.literal("distance"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const id = await ctx.db.insert("exercises", {
      userId: user._id,
      name: args.name,
      aliases: args.aliases,
      category: args.category,
      muscleGroups: args.muscleGroups,
      equipment: args.equipment,
      modality: args.modality,
      primaryMetric: args.primaryMetric,
      isSystemExercise: false,
      createdAt: Date.now(),
    });

    return id;
  },
});
