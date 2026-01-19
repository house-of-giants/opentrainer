"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { callGemini } from "./gemini";
import { TRAINING_LAB_FULL_PROMPT, TRAINING_LAB_SNAPSHOT_PROMPT } from "./prompts";
import type { Doc } from "../_generated/dataModel";
import type { AggregatedWorkoutData } from "./aggregators";
import type { TrainingLabReport, TrainingSnapshot } from "./trainingLabTypes";

/* eslint-disable @typescript-eslint/no-explicit-any */

function buildTrainingLabPayload(
  user: Doc<"users">,
  aggregated: AggregatedWorkoutData,
  previousSummary?: string
) {
  const hist = aggregated.historicalContext;
  const cardio = aggregated.cardioSummary;
  const load = aggregated.trainingLoad;
  
  return {
    user: {
      g: user.goals ?? [],
      xp: user.experienceLevel ?? "intermediate",
      eq: user.equipment ?? [],
      days: user.weeklyAvailability ?? 4,
    },
    period: {
      start: aggregated.period.start,
      end: aggregated.period.end,
      n: aggregated.period.workouts,
    },
    load: load ? {
      total: load.totalLoad,
      lifting: load.liftingLoad,
      cardio: load.cardioLoad,
      liftPct: load.liftingPercent,
      cardioPct: load.cardioPercent,
      profile: load.profile,
    } : undefined,
    vol: aggregated.volumeByMuscle.slice(0, 10).map((v) => ({
      m: v.muscle,
      s: v.sets,
      r: v.avgRpe,
    })),
    cardio: cardio ? {
      mins: cardio.totalMinutes,
      dist: cardio.totalDistance,
      load: cardio.totalLoad,
      rpe: cardio.avgRpe,
      byMod: cardio.byModality.slice(0, 5).map((m) => ({
        mod: m.modality,
        mins: m.minutes,
        dist: m.distance,
        sess: m.sessions,
      })),
    } : undefined,
    trends: aggregated.exerciseTrends.slice(0, 8).map((t) => ({
      ex: t.exercise,
      k: t.kind === "lifting" ? "l" : "c",
      n: t.sessions,
      s: t.totalSets,
      w: t.topWeight,
      r: t.avgRpe,
      d: t.trend === "up" ? "u" : t.trend === "down" ? "d" : "f",
    })),
    swaps: aggregated.swapSummary.length > 0
      ? aggregated.swapSummary.map((s) => ({
          ex: s.exercise,
          reason: s.reason,
          n: s.count,
        }))
      : undefined,
    notes: aggregated.exerciseNotes.length > 0
      ? aggregated.exerciseNotes.map((n) => ({
          ex: n.exercise,
          txt: n.note,
          date: n.date,
        }))
      : undefined,
    hist: hist ? {
      age: hist.trainingAgeDays,
      total: hist.totalWorkouts,
      sets: hist.totalSets,
      since: hist.firstWorkoutDate,
      monthly: hist.monthlyFrequency.map((m) => ({
        mo: m.month,
        n: m.workouts,
        avg: m.avgSetsPerWorkout,
      })),
      cons: {
        wpw: hist.consistency.avgWorkoutsPerWeek,
        streak: hist.consistency.currentStreakWeeks,
        best: hist.consistency.longestStreakWeeks,
      },
      prs: hist.personalRecords.map((pr) => ({
        ex: pr.exercise,
        wt: pr.topWeight,
        date: pr.topWeightDate,
        sess: pr.totalSessions,
      })),
      dist: hist.muscleDistribution.map((d) => ({
        m: d.muscle,
        pct: d.percentage,
      })),
    } : undefined,
    prev: previousSummary,
  };
}

export const generateReport = action({
  args: {
    periodDays: v.optional(v.number()),
    reportType: v.union(v.literal("snapshot"), v.literal("full")),
  },
  handler: async (ctx, args): Promise<TrainingLabReport | TrainingSnapshot> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    }) as Doc<"users"> | null;
    if (!user) throw new Error("User not found");
    if (user.tier !== "pro") throw new Error("Pro subscription required");

    const aggregated = (await ctx.runQuery(internal.ai.aggregators.aggregateWorkoutData, {
      userId: user._id,
      days: args.periodDays ?? 7,
      includeHistoricalContext: true,
    })) as AggregatedWorkoutData;

    const workoutCount = aggregated.period.workouts;
    if (workoutCount === 0) {
      throw new Error("No workouts to analyze");
    }

    const systemPrompt =
      args.reportType === "full" ? TRAINING_LAB_FULL_PROMPT : TRAINING_LAB_SNAPSHOT_PROMPT;

    const previousSummary =
      args.reportType === "full"
        ? ((await ctx.runQuery(internal.ai.aggregators.getLastAssessmentSummary, {
            userId: user._id,
          })) as string | undefined) ?? undefined
        : undefined;

    const payload = buildTrainingLabPayload(user, aggregated, previousSummary);

    const startTime = Date.now();
    const response = await callGemini({
      systemPrompt,
      userMessage: JSON.stringify(payload),
      responseFormat: "json",
    });
    const latencyMs = Date.now() - startTime;

    if (args.reportType === "snapshot") {
      const result = JSON.parse(response.text) as {
        summary: string;
        weeklyHighlights: {
          strongestArea: string;
          totalSets: number;
          avgSetsPerWorkout: number;
          standoutExercise: string | null;
        };
        historicalContext: {
          trainingAge: string;
          totalWorkouts: number;
          consistencyRating: "excellent" | "good" | "moderate" | "developing";
          primaryFocus: string;
        };
        progressIndicators: Array<{
          type: "milestone" | "trend" | "streak" | "pr_potential";
          title: string;
          message: string;
        }>;
        recommendations: Array<{
          priority: "high" | "medium" | "low";
          area: string;
          suggestion: string;
        }>;
        lookingAhead: string;
      };

      const snapshot: TrainingSnapshot = {
        type: "snapshot",
        ...result,
        chartData: {
          volumeByMuscle: aggregated.volumeByMuscle.slice(0, 8),
        },
      };

      await ctx.runMutation((internal.ai as any).trainingLabMutations.storeAssessment, {
        userId: user._id,
        subjectType: "weekly_review",
        subjectSubtype: "snapshot",
        model: "google/gemini-3-flash-preview",
        summary: snapshot.summary,
        report: snapshot,
        tokenUsage: {
          input: response.usageMetadata.promptTokenCount,
          output: response.usageMetadata.candidatesTokenCount,
        },
        latencyMs,
      });

      return snapshot;
    }

    const result = JSON.parse(response.text) as {
      summary: string;
      scores: {
        volumeAdherence: number;
        intensityManagement: number;
        muscleBalance: number;
        recoverySignals: number;
      };
      insights: Array<{
        category: "volume" | "intensity" | "balance" | "recovery" | "progression" | "technique";
        observation: string;
        recommendation: string;
        priority: "high" | "medium" | "low";
      }>;
      alerts: Array<{
        type: "plateau" | "overtraining" | "imbalance" | "swap_pattern" | "insufficient_data";
        exercise?: string;
        message: string;
      }>;
    };

    const report: TrainingLabReport = {
      type: "full",
      ...result,
      chartData: {
        volumeByMuscle: aggregated.volumeByMuscleOverTime,
        rpeByWorkout: aggregated.rpeByWorkout,
        exerciseTrends: aggregated.exerciseTrends.slice(0, 6).map((t) => ({
          exercise: t.exercise,
          sessions: t.sessions,
          trend: t.trend,
          topWeight: t.topWeight ?? 0,
          avgRpe: t.avgRpe ?? 0,
        })),
      },
    };

    await ctx.runMutation((internal.ai as any).trainingLabMutations.storeAssessment, {
      userId: user._id,
      subjectType: "weekly_review",
      subjectSubtype: "full",
      model: "google/gemini-3-flash-preview",
      summary: report.summary,
      scores: report.scores,
      insights: report.insights,
      report,
      tokenUsage: {
        input: response.usageMetadata.promptTokenCount,
        output: response.usageMetadata.candidatesTokenCount,
      },
      latencyMs,
    });

    return report;
  },
});
