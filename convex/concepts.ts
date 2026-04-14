import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./lib/utils";

export const createFromExtraction = internalMutation({
  args: {
    userId: v.id("users"),
    entryId: v.id("entries"),
    type: v.string(),
    term: v.string(),
    definition: v.string(),
    context: v.string(),
    tags: v.array(v.string()),
    difficulty: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("concepts", {
      userId: args.userId,
      entryId: args.entryId,
      type: args.type,
      term: args.term,
      definition: args.definition,
      context: args.context,
      tags: args.tags,
      difficulty: args.difficulty,
      // Initial FSRS state (new card)
      stability: 0,
      fsrsDifficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0, // New
      nextReview: Date.now(), // Due immediately
      lastReview: undefined,
      createdAt: Date.now(),
    });
  },
});

export const listByEntry = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
    // Ensure user owns these concepts
    return concepts.filter((c) => c.userId === user._id);
  },
});

export const listByUser = query({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (args.type) {
      return await ctx.db
        .query("concepts")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", user._id).eq("type", args.type!)
        )
        .collect();
    }
    return await ctx.db
      .query("concepts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
