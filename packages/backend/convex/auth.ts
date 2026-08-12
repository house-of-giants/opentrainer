import { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/**
 * Get the current authenticated user from the context.
 * 
 * @param ctx - The Convex context (mutation or query)
 * @param options - Options for user retrieval
 * @param options.requireAuth - If true, throws error when not authenticated (default: true)
 * @param options.requireUser - If true, throws error when user not found (default: true)
 * @returns The user object, or null if requireAuth/requireUser are false and user is not found
 * @throws Error if requireAuth is true and user is not authenticated
 * @throws Error if requireUser is true and user is not found in database
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
  options: {
    requireAuth?: boolean;
    requireUser?: boolean;
  } = {}
): Promise<Doc<"users"> | null> {
  const { requireAuth = true, requireUser = true } = options;

  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    if (requireAuth) {
      throw new Error("Not authenticated");
    }
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    if (requireUser) {
      throw new Error("User not found");
    }
    return null;
  }

  return user;
}

