import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getCurrentUser as getAuthUser } from "./auth";

export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      if (
        args.email !== existingUser.email ||
        args.name !== existingUser.name ||
        args.imageUrl !== existingUser.imageUrl
      ) {
        await ctx.db.patch(existingUser._id, {
          email: args.email,
          name: args.name,
          imageUrl: args.imageUrl,
          updatedAt: Date.now(),
        });
      }
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      tier: "pro",
      isAlphaUser: true,
      preferredUnits: "lb",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUser(ctx, { requireAuth: false, requireUser: false });
  },
});

export const updateOnboarding = mutation({
  args: {
    goals: v.optional(
      v.array(
        v.union(
          v.literal("strength"),
          v.literal("hypertrophy"),
          v.literal("endurance"),
          v.literal("weight_loss"),
          v.literal("general_fitness")
        )
      )
    ),
    experienceLevel: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      )
    ),
    equipmentDescription: v.optional(v.string()),
    equipment: v.optional(v.array(v.string())),
    weeklyAvailability: v.optional(v.number()),
    sessionDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      ...args,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

export const completeOnboarding = mutation({
  args: {
    goals: v.array(
      v.union(
        v.literal("strength"),
        v.literal("hypertrophy"),
        v.literal("endurance"),
        v.literal("weight_loss"),
        v.literal("general_fitness")
      )
    ),
    experienceLevel: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    equipmentDescription: v.string(),
    equipment: v.array(v.string()),
    weeklyAvailability: v.number(),
    sessionDuration: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      ...args,
      onboardingCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

export const updatePreferences = mutation({
  args: {
    preferredUnits: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
    bodyweight: v.optional(v.number()),
    bodyweightUnit: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      ...args,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

export const getByClerkId = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const exportAllData = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const workoutsWithEntries = await Promise.all(
      workouts.map(async (workout) => {
        const entries = await ctx.db
          .query("entries")
          .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
          .collect();

        return {
          id: workout._id,
          title: workout.title,
          status: workout.status,
          startedAt: new Date(workout.startedAt).toISOString(),
          completedAt: workout.completedAt
            ? new Date(workout.completedAt).toISOString()
            : null,
          summary: workout.summary,
          notes: workout.notes,
          exerciseNotes: workout.exerciseNotes,
          entries: entries.map((entry) => ({
            exerciseName: entry.exerciseName,
            kind: entry.kind,
            lifting: entry.lifting,
            cardio: entry.cardio,
            mobility: entry.mobility,
            notes: entry.notes,
            createdAt: new Date(entry.createdAt).toISOString(),
          })),
        };
      })
    );

    const routines = await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const routinesExport = routines.map((routine) => ({
      id: routine._id,
      name: routine.name,
      description: routine.description,
      source: routine.source,
      days: routine.days,
      tags: routine.tags,
      isActive: routine.isActive,
      createdAt: new Date(routine.createdAt).toISOString(),
      updatedAt: new Date(routine.updatedAt).toISOString(),
    }));

    const assessments = await ctx.db
      .query("assessments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const assessmentsWithDetails = await Promise.all(
      assessments.map(async (assessment) => {
        const details = await ctx.db
          .query("assessmentDetails")
          .withIndex("by_assessment", (q) => q.eq("assessmentId", assessment._id))
          .first();

        return {
          id: assessment._id,
          subjectType: assessment.subjectType,
          summary: assessment.summary,
          scores: assessment.scores,
          insights: assessment.insights,
          createdAt: new Date(assessment.createdAt).toISOString(),
          content: details?.contentMarkdown,
        };
      })
    );

    const exerciseSwaps = await ctx.db
      .query("exerciseSwaps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const swapsExport = exerciseSwaps.map((swap) => ({
      originalExercise: swap.originalExercise,
      substitutedExercise: swap.substitutedExercise,
      reason: swap.reason,
      createdAt: new Date(swap.createdAt).toISOString(),
    }));

    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const feedbackExport = feedback.map((fb) => ({
      type: fb.type,
      message: fb.message,
      context: fb.context,
      createdAt: new Date(fb.createdAt).toISOString(),
    }));

    return {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      user: {
        name: user.name,
        email: user.email,
        goals: user.goals,
        experienceLevel: user.experienceLevel,
        equipment: user.equipment,
        equipmentDescription: user.equipmentDescription,
        preferredUnits: user.preferredUnits,
        weeklyAvailability: user.weeklyAvailability,
        sessionDuration: user.sessionDuration,
        bodyweight: user.bodyweight,
        bodyweightUnit: user.bodyweightUnit,
        tier: user.tier,
        onboardingCompletedAt: user.onboardingCompletedAt
          ? new Date(user.onboardingCompletedAt).toISOString()
          : null,
        createdAt: new Date(user.createdAt).toISOString(),
      },
      workouts: workoutsWithEntries,
      routines: routinesExport,
      assessments: assessmentsWithDetails,
      exerciseSwaps: swapsExport,
      feedback: feedbackExport,
    };
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("User not found");

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const workout of workouts) {
      const entries = await ctx.db
        .query("entries")
        .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
        .collect();

      for (const entry of entries) {
        await ctx.db.delete(entry._id);
      }
      await ctx.db.delete(workout._id);
    }

    const routines = await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const routine of routines) {
      await ctx.db.delete(routine._id);
    }

    const assessments = await ctx.db
      .query("assessments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const assessment of assessments) {
      const details = await ctx.db
        .query("assessmentDetails")
        .withIndex("by_assessment", (q) => q.eq("assessmentId", assessment._id))
        .collect();

      for (const detail of details) {
        await ctx.db.delete(detail._id);
      }
      await ctx.db.delete(assessment._id);
    }

    const swaps = await ctx.db
      .query("exerciseSwaps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const swap of swaps) {
      await ctx.db.delete(swap._id);
    }

    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const fb of feedback) {
      await ctx.db.delete(fb._id);
    }

    await ctx.db.delete(user._id);

    return { success: true };
  },
});
