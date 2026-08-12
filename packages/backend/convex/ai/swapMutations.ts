import { v } from "convex/values";
import { mutation, internalMutation, query } from "../_generated/server";
import { getCurrentUser } from "../auth";

const swapReasonValidator = v.union(
  v.literal("equipment_busy"),
  v.literal("equipment_unavailable"),
  v.literal("discomfort"),
  v.literal("variety")
);

export const recordSwap = internalMutation({
  args: {
    userId: v.id("users"),
    workoutId: v.id("workouts"),
    originalExercise: v.string(),
    reason: swapReasonValidator,
    originalMuscleGroups: v.optional(v.array(v.string())),
    originalEquipment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const swapId = await ctx.db.insert("exerciseSwaps", {
      userId: args.userId,
      workoutId: args.workoutId,
      originalExercise: args.originalExercise,
      reason: args.reason,
      originalMuscleGroups: args.originalMuscleGroups,
      originalEquipment: args.originalEquipment,
      createdAt: Date.now(),
    });

    return swapId;
  },
});

export const confirmSwap = mutation({
  args: {
    swapId: v.id("exerciseSwaps"),
    selectedExercise: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const swap = await ctx.db.get(args.swapId);
    if (!swap) throw new Error("Swap not found");
    if (swap.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.swapId, {
      substitutedExercise: args.selectedExercise,
    });

    return args.swapId;
  },
});

export const markPermanentSwapPromptShown = mutation({
  args: {
    swapId: v.id("exerciseSwaps"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const swap = await ctx.db.get(args.swapId);
    if (!swap) throw new Error("Swap not found");
    if (swap.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.swapId, {
      permanentSwapPromptShown: true,
    });
  },
});

export const acceptPermanentSwap = mutation({
  args: {
    swapId: v.id("exerciseSwaps"),
    accepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    const swap = await ctx.db.get(args.swapId);
    if (!swap) throw new Error("Swap not found");
    if (swap.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.swapId, {
      permanentSwapAccepted: args.accepted,
    });
  },
});

export const getSwapsForWorkout = query({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) return [];

    const swaps = await ctx.db
      .query("exerciseSwaps")
      .withIndex("by_workout", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    return swaps.filter(
      (s) =>
        s.userId === user._id &&
        (s.reason === "discomfort" || s.reason === "equipment_unavailable") &&
        s.substitutedExercise &&
        !s.permanentSwapPromptShown
    );
  },
});
