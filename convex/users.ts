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
