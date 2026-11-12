import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { buildWorkoutSummary, getWorkoutEntries } from "../workoutSummary";

// Old summaries added kg sets to totalVolume as if they were pounds. This
// recomputes totalVolume (pounds) from each completed workout's entries and
// patches only the workouts where it differs. Other summary fields are kept.
//
// Dry run:  npx convex run migrations/workoutSummaryVolume:backfill '{"dryRun": true}'
// Real run: npx convex run migrations/workoutSummaryVolume:backfill '{"dryRun": false}'

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 200;

type BatchResult = {
	scanned: number;
	changed: number;
	volumeDeltaLb: number;
	isDone: boolean;
	continueCursor: string;
};

export const backfillBatch = internalMutation({
	args: {
		dryRun: v.boolean(),
		cursor: v.union(v.string(), v.null()),
		batchSize: v.number(),
	},
	handler: async (ctx, args): Promise<BatchResult> => {
		const page = await ctx.db
			.query("workouts")
			.withIndex("by_status", (q) => q.eq("status", "completed"))
			.paginate({ cursor: args.cursor, numItems: args.batchSize });

		let changed = 0;
		let volumeDeltaLb = 0;

		for (const workout of page.page) {
			// A completed workout without a summary or end time has nothing to fix.
			if (!workout.summary || workout.completedAt === undefined) continue;

			const entries = await getWorkoutEntries(ctx, workout._id);
			const { totalVolume = 0 } = buildWorkoutSummary(
				entries,
				workout.startedAt,
				workout.completedAt
			);
			const storedVolume = workout.summary.totalVolume ?? 0;
			if (totalVolume === storedVolume) continue;

			changed += 1;
			volumeDeltaLb += totalVolume - storedVolume;
			if (!args.dryRun) {
				await ctx.db.patch(workout._id, {
					summary: { ...workout.summary, totalVolume },
				});
			}
		}

		return {
			scanned: page.page.length,
			changed,
			volumeDeltaLb,
			isDone: page.isDone,
			continueCursor: page.continueCursor,
		};
	},
});

export const backfill = internalAction({
	args: {
		dryRun: v.boolean(),
		batchSize: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const batchSize = Math.min(
			Math.max(1, Math.floor(args.batchSize ?? DEFAULT_BATCH_SIZE)),
			MAX_BATCH_SIZE
		);
		const totals = { batches: 0, scanned: 0, changed: 0, volumeDeltaLb: 0 };
		let cursor: string | null = null;

		while (true) {
			const batch: BatchResult = await ctx.runMutation(
				internal.migrations.workoutSummaryVolume.backfillBatch,
				{ dryRun: args.dryRun, cursor, batchSize }
			);
			totals.batches += 1;
			totals.scanned += batch.scanned;
			totals.changed += batch.changed;
			totals.volumeDeltaLb += batch.volumeDeltaLb;
			if (batch.isDone) break;
			cursor = batch.continueCursor;
		}

		const result = { dryRun: args.dryRun, ...totals };
		console.log("workoutSummaryVolume backfill", JSON.stringify(result));
		return result;
	},
});
