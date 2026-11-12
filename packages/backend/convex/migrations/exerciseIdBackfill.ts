import { v } from "convex/values";
import { findExerciseByName } from "@opentrainer/lib/exercise-deduplication";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction, internalMutation } from "../_generated/server";
import { getSystemExercises, getUserExercises } from "../lib/exerciseIdentity";

// Older entries have only exerciseName. Exercise history now reads by
// exerciseId, so this sets exerciseId on each entry that lacks it, by
// resolving exerciseName for the entry's own user (their custom exercises
// first, then system exercises). Entries whose name resolves to no exercise
// are left as they are; history still finds them by name. Entries that
// already have an exerciseId are never changed, so a second run is a no-op.
//
// Dry run:  npx convex run migrations/exerciseIdBackfill:backfill '{"dryRun": true}' --prod
// Real run: npx convex run migrations/exerciseIdBackfill:backfill '{"dryRun": false}' --prod

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

type BatchResult = {
	scanned: number;
	alreadyLinked: number;
	resolvable: number;
	unresolvable: number;
	changed: number;
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
			.query("entries")
			.paginate({ cursor: args.cursor, numItems: args.batchSize });

		const systemExercises = await getSystemExercises(ctx);
		const userExercises = new Map<Id<"users">, Doc<"exercises">[]>();
		const counts = { alreadyLinked: 0, resolvable: 0, unresolvable: 0, changed: 0 };

		for (const entry of page.page) {
			if (entry.exerciseId) {
				counts.alreadyLinked += 1;
				continue;
			}

			let ownExercises = userExercises.get(entry.userId);
			if (!ownExercises) {
				ownExercises = await getUserExercises(ctx, entry.userId);
				userExercises.set(entry.userId, ownExercises);
			}
			const exercise = findExerciseByName(
				ownExercises,
				systemExercises,
				entry.exerciseName
			);
			if (!exercise) {
				counts.unresolvable += 1;
				continue;
			}

			counts.resolvable += 1;
			if (!args.dryRun) {
				await ctx.db.patch(entry._id, { exerciseId: exercise._id });
				counts.changed += 1;
			}
		}

		return {
			scanned: page.page.length,
			...counts,
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
		const totals = {
			batches: 0,
			scanned: 0,
			alreadyLinked: 0,
			resolvable: 0,
			unresolvable: 0,
			changed: 0,
		};
		let cursor: string | null = null;

		while (true) {
			const batch: BatchResult = await ctx.runMutation(
				internal.migrations.exerciseIdBackfill.backfillBatch,
				{ dryRun: args.dryRun, cursor, batchSize }
			);
			totals.batches += 1;
			totals.scanned += batch.scanned;
			totals.alreadyLinked += batch.alreadyLinked;
			totals.resolvable += batch.resolvable;
			totals.unresolvable += batch.unresolvable;
			totals.changed += batch.changed;
			if (batch.isDone) break;
			cursor = batch.continueCursor;
		}

		const result = { dryRun: args.dryRun, ...totals };
		console.log("exerciseIdBackfill", JSON.stringify(result));
		return result;
	},
});
