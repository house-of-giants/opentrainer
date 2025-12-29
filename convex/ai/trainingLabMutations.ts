import { v } from "convex/values";
import { query, internalMutation } from "../_generated/server";
import { getCurrentUser } from "../auth";
import type { TrainingLabReport, TrainingSnapshot, TrainingLabCTAState } from "./trainingLabTypes";

export const storeAssessment = internalMutation({
  args: {
    userId: v.id("users"),
    subjectType: v.literal("weekly_review"),
    subjectSubtype: v.union(v.literal("snapshot"), v.literal("full")),
    model: v.string(),
    summary: v.string(),
    scores: v.optional(
      v.object({
        volumeAdherence: v.number(),
        intensityManagement: v.number(),
        muscleBalance: v.number(),
        recoverySignals: v.number(),
      })
    ),
    insights: v.optional(
      v.array(
        v.object({
          category: v.string(),
          observation: v.string(),
          recommendation: v.optional(v.string()),
          priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
        })
      )
    ),
    report: v.any(),
    tokenUsage: v.object({
      input: v.number(),
      output: v.number(),
    }),
    latencyMs: v.number(),
  },
  handler: async (ctx, args) => {
    const assessmentId = await ctx.db.insert("assessments", {
      userId: args.userId,
      subjectType: args.subjectType,
      model: args.model,
      promptVersion: "1.0",
      status: "success",
      summary: args.summary,
      scores: args.scores
        ? {
            volumeAdherence: args.scores.volumeAdherence,
            intensityManagement: args.scores.intensityManagement,
            recoveryBalance: args.scores.recoverySignals,
          }
        : undefined,
      insights: args.insights,
      tokenUsage: {
        input: args.tokenUsage.input,
        output: args.tokenUsage.output,
      },
      createdAt: Date.now(),
    });

    await ctx.db.insert("assessmentDetails", {
      assessmentId,
      userId: args.userId,
      contentMarkdown: JSON.stringify(args.report),
      createdAt: Date.now(),
    });

    return assessmentId;
  },
});

export const getCtaState = query({
  args: {},
  handler: async (ctx): Promise<TrainingLabCTAState | null> => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) return null;

    if (user.tier !== "pro") {
      return {
        show: true,
        isPro: false,
        workoutsSinceLastReport: 0,
        reportType: "none",
        message: "Unlock AI-powered training insights",
      };
    }

    const lastAssessment = await ctx.db
      .query("assessments")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("subjectType"), "weekly_review"))
      .order("desc")
      .first();

    const lastAssessmentDate = lastAssessment?.createdAt ?? 0;

    const workoutsSince = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.gt(q.field("startedAt"), lastAssessmentDate),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    const count = workoutsSince.length;

    if (count < 3) {
      return {
        show: true,
        isPro: true,
        workoutsSinceLastReport: count,
        reportType: "none",
        message: `Log ${3 - count} more workout${3 - count > 1 ? "s" : ""} to unlock your training snapshot`,
      };
    }

    if (count < 5) {
      return {
        show: true,
        isPro: true,
        workoutsSinceLastReport: count,
        reportType: "snapshot",
        message: "Your training snapshot is ready",
      };
    }

    const message =
      count >= 7
        ? `Big week! ${count} workouts logged. Your full report is ready.`
        : `${count} workouts logged. Your Training Lab report is ready.`;

    return {
      show: true,
      isPro: true,
      workoutsSinceLastReport: count,
      reportType: "full",
      message,
    };
  },
});

export const getLatestReport = query({
  args: {},
  handler: async (ctx): Promise<TrainingLabReport | TrainingSnapshot | null> => {
    const user = await getCurrentUser(ctx, { requireAuth: false, requireUser: false });
    if (!user) return null;

    const latestAssessment = await ctx.db
      .query("assessments")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("subjectType"), "weekly_review"))
      .order("desc")
      .first();

    if (!latestAssessment) return null;

    const details = await ctx.db
      .query("assessmentDetails")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", latestAssessment._id))
      .first();

    if (!details) return null;

    try {
      return JSON.parse(details.contentMarkdown);
    } catch {
      return null;
    }
  },
});
