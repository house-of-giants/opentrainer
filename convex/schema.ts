import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// OpenTrainer Convex Schema
// ============================================================================
// This schema defines the data model for OpenTrainer, a minimalist AI-first
// workout tracking application. It supports both lifting and cardio workouts
// with a discriminated union pattern for flexibility.
// ============================================================================

export default defineSchema({
  // --------------------------------------------------------------------------
  // Users Table
  // Extended profile data synced from Clerk + onboarding information
  // --------------------------------------------------------------------------
  users: defineTable({
    // Clerk user ID (subject from JWT)
    clerkId: v.string(),
    
    // Basic profile
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    
    // Onboarding data for AI personalization
    goals: v.optional(v.array(v.union(
      v.literal("strength"),
      v.literal("hypertrophy"),
      v.literal("endurance"),
      v.literal("weight_loss"),
      v.literal("general_fitness")
    ))),
    
    experienceLevel: v.optional(v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    )),
    
    // Equipment - dual storage for AI routine generation
    equipmentDescription: v.optional(v.string()),  // Raw: "Planet Fitness"
    equipment: v.optional(v.array(v.string())),    // Parsed: ["smith_machine", "cables"]
    
    // Preferences
    preferredUnits: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
    weeklyAvailability: v.optional(v.number()), // days per week
    sessionDuration: v.optional(v.number()), // minutes
    
    // Bodyweight for training load calculations and "bodyweight" exercises
    bodyweight: v.optional(v.number()),
    bodyweightUnit: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
    
    // Subscription tier
    tier: v.optional(v.union(v.literal("free"), v.literal("pro"))),
    
    // Onboarding tracking
    onboardingCompletedAt: v.optional(v.number()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // --------------------------------------------------------------------------
  // Exercises Table
  // Canonical exercise definitions (system + user-created)
  // --------------------------------------------------------------------------
  exercises: defineTable({
    // Owner (null for system exercises)
    userId: v.optional(v.id("users")),
    
    name: v.string(),
    aliases: v.optional(v.array(v.string())),
    
    category: v.union(
      v.literal("lifting"),
      v.literal("cardio"),
      v.literal("mobility"),
      v.literal("other")
    ),
    
    // For lifting exercises
    muscleGroups: v.optional(v.array(v.string())),
    equipment: v.optional(v.array(v.string())),
    
    // For cardio exercises
    modality: v.optional(v.string()), // run, bike, row, stairstepper, etc.
    primaryMetric: v.optional(v.union(v.literal("duration"), v.literal("distance"))),
    
    isSystemExercise: v.boolean(),
    
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category"])
    .index("by_name", ["name"]),

  // --------------------------------------------------------------------------
  // Workouts Table
  // Individual workout sessions
  // --------------------------------------------------------------------------
  workouts: defineTable({
    userId: v.id("users"),
    
    // Optional link to routine template
    routineId: v.optional(v.id("routines")),
    routineDayIndex: v.optional(v.number()),
    
    title: v.optional(v.string()),
    
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    
    // Cached summary for quick display
    summary: v.optional(v.object({
      totalVolume: v.optional(v.number()), // total weight lifted
      totalSets: v.optional(v.number()),
      totalDurationMinutes: v.optional(v.number()),
      exerciseCount: v.optional(v.number()),
    })),
    
    // Per-exercise notes within this workout
    exerciseNotes: v.optional(v.array(v.object({
      exerciseName: v.string(),
      note: v.string(),
    }))),
    
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_started", ["userId", "startedAt"])
    .index("by_status", ["status"]),

  // --------------------------------------------------------------------------
  // Workout Entries Table
  // Individual exercise logs within a workout (lifting sets, cardio intervals)
  // Uses discriminated union pattern via 'kind' field
  // --------------------------------------------------------------------------
  entries: defineTable({
    workoutId: v.id("workouts"),
    userId: v.id("users"), // Denormalized for auth + indexing
    
    // Client-generated ID for optimistic updates / deduplication
    clientId: v.optional(v.string()),
    
    exerciseId: v.optional(v.id("exercises")),
    exerciseName: v.string(), // Denormalized for display
    
    kind: v.union(v.literal("lifting"), v.literal("cardio")),
    
    // Lifting-specific data
    lifting: v.optional(v.object({
      setNumber: v.number(),
      reps: v.optional(v.number()),
      weight: v.optional(v.number()),
      unit: v.union(v.literal("kg"), v.literal("lb")),
      rpe: v.optional(v.number()), // 1-10 scale
      rir: v.optional(v.number()), // Reps in reserve
      isWarmup: v.optional(v.boolean()),
      isBodyweight: v.optional(v.boolean()), // True for bodyweight exercises (with or without added weight)
      tempo: v.optional(v.string()), // e.g., "3-1-1-0"
      restSeconds: v.optional(v.number()),
    })),
    
    // Cardio-specific data
    cardio: v.optional(v.object({
      mode: v.union(v.literal("steady"), v.literal("intervals")),
      durationSeconds: v.number(),
      distance: v.optional(v.number()),
      distanceUnit: v.optional(v.union(v.literal("m"), v.literal("km"), v.literal("mi"))),
      avgHeartRate: v.optional(v.number()),
      calories: v.optional(v.number()),
      intensity: v.optional(v.number()), // 1-10 scale or machine level
      incline: v.optional(v.number()),
      // For interval training (legacy structure)
      intervals: v.optional(v.array(v.object({
        workSeconds: v.number(),
        restSeconds: v.number(),
        rounds: v.number(),
      }))),
      
      // NEW: Enhanced cardio tracking
      // Primary metric indicator (modality-driven default)
      primaryMetric: v.optional(v.union(v.literal("duration"), v.literal("distance"))),
      
      // Weighted vest support
      vestWeight: v.optional(v.number()),
      vestWeightUnit: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
      
      // RPE for training load calculation (1-10 Borg scale)
      rpe: v.optional(v.number()),
      
      // Interval structure for HIIT (treats intervals as "sets")
      intervalType: v.optional(v.union(
        v.literal("steady"),
        v.literal("hiit"),
        v.literal("tabata"),
        v.literal("emom"),
        v.literal("custom")
      )),
      sets: v.optional(v.array(v.object({
        type: v.union(
          v.literal("warmup"),
          v.literal("work"),
          v.literal("rest"),
          v.literal("cooldown")
        ),
        durationSeconds: v.number(),
        distance: v.optional(v.number()),
        intensity: v.optional(v.number()), // 1-10 or machine level for this set
        avgHeartRate: v.optional(v.number()),
      }))),
    })),
    
    notes: v.optional(v.string()),
    
    createdAt: v.number(),
  })
    .index("by_workout", ["workoutId"])
    .index("by_workout_created", ["workoutId", "createdAt"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_client_id", ["workoutId", "clientId"]),

  // --------------------------------------------------------------------------
  // Routines Table
  // Workout templates for repeatable programs
  // --------------------------------------------------------------------------
  routines: defineTable({
    userId: v.id("users"),
    
    name: v.string(),
    description: v.optional(v.string()),
    
    // Source of the routine
    source: v.union(
      v.literal("manual"),
      v.literal("ai_generated"),
      v.literal("imported")
    ),
    
    // Structure: array of workout day templates
    days: v.array(v.object({
      name: v.string(), // e.g., "Push Day A"
      exercises: v.array(v.object({
        exerciseId: v.optional(v.id("exercises")),
        exerciseName: v.string(),
        kind: v.union(v.literal("lifting"), v.literal("cardio")),
        // Target for lifting
        targetSets: v.optional(v.number()),
        targetReps: v.optional(v.string()), // e.g., "8-12"
        targetRpe: v.optional(v.number()),
        // Target for cardio
        targetDuration: v.optional(v.number()), // minutes
        targetIntensity: v.optional(v.number()),
        notes: v.optional(v.string()),
      })),
    })),
    
    tags: v.optional(v.array(v.string())),
    
    isActive: v.boolean(),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"]),

  // --------------------------------------------------------------------------
  // Assessments Table
  // AI-generated performance feedback and recommendations
  // --------------------------------------------------------------------------
  assessments: defineTable({
    userId: v.id("users"),
    
    // What was assessed
    subjectType: v.union(
      v.literal("weekly_review"),
      v.literal("routine"),
      v.literal("workout")
    ),
    subjectId: v.optional(v.union(v.id("routines"), v.id("workouts"))),
    
    // AI metadata
    model: v.string(), // e.g., "openrouter/anthropic/claude-3.5-sonnet"
    promptVersion: v.string(), // For tracking prompt iterations
    
    status: v.union(v.literal("success"), v.literal("error")),
    
    // Assessment content
    summary: v.string(), // Short, UI-friendly summary
    
    // Structured feedback
    insights: v.optional(v.array(v.object({
      category: v.string(), // e.g., "volume", "frequency", "intensity"
      observation: v.string(),
      recommendation: v.optional(v.string()),
      priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    }))),
    
    // Optional scores
    scores: v.optional(v.object({
      overallProgress: v.optional(v.number()),
      volumeAdherence: v.optional(v.number()),
      intensityManagement: v.optional(v.number()),
      recoveryBalance: v.optional(v.number()),
    })),
    
    // For errors
    error: v.optional(v.object({
      message: v.string(),
      code: v.optional(v.string()),
    })),
    
    // Token usage tracking for cost management
    tokenUsage: v.optional(v.object({
      input: v.number(),
      output: v.number(),
      costUsd: v.optional(v.number()),
    })),
    
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_subject", ["subjectType", "subjectId"]),

  // --------------------------------------------------------------------------
  // Assessment Details Table
  // Stores longer AI content separately to keep assessments table lean
  // --------------------------------------------------------------------------
  assessmentDetails: defineTable({
    assessmentId: v.id("assessments"),
    userId: v.id("users"),
    
    // Full markdown content
    contentMarkdown: v.string(),
    
    // Raw API response (optional, for debugging)
    rawResponse: v.optional(v.string()),
    
    createdAt: v.number(),
  })
    .index("by_assessment", ["assessmentId"]),

  // --------------------------------------------------------------------------
  // Exercise Swaps Table
  // Track swap events for Training Lab analysis and follow-up prompts
  // --------------------------------------------------------------------------
  exerciseSwaps: defineTable({
    userId: v.id("users"),
    workoutId: v.id("workouts"),
    
    // What was swapped
    originalExercise: v.string(),
    substitutedExercise: v.optional(v.string()), // Set when user selects alternative
    
    // Why
    reason: v.union(
      v.literal("equipment_busy"),
      v.literal("equipment_unavailable"),
      v.literal("discomfort"),
      v.literal("variety")
    ),
    
    // Context for AI
    originalMuscleGroups: v.optional(v.array(v.string())),
    originalEquipment: v.optional(v.string()),
    
    // Follow-up tracking
    permanentSwapPromptShown: v.optional(v.boolean()),
    permanentSwapAccepted: v.optional(v.boolean()),
    
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_exercise", ["userId", "originalExercise"])
    .index("by_workout", ["workoutId"])
    .index("by_user_reason", ["userId", "reason"]),
});
