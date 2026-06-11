import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./lib/utils";

export const createFromExtraction = internalMutation({
  args: {
    userId: v.id("users"),
    entryId: v.optional(v.id("entries")),
    type: v.string(),
    term: v.string(),
    definition: v.string(),
    context: v.string(),
    pattern: v.optional(v.string()),
    examples: v.optional(v.array(v.string())),
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
      pattern: args.pattern,
      examples: args.examples,
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

export const getNextReviewByEntry = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
    const userConcepts = concepts.filter((c) => c.userId === user._id);
    if (userConcepts.length === 0) return null;
    const earliest = Math.min(...userConcepts.map((c) => c.nextReview));
    return earliest;
  },
});

export const createManual = mutation({
  args: {
    term: v.string(),
    definition: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await ctx.db.insert("concepts", {
      userId: user._id,
      entryId: undefined,
      type: "vocabulary",
      term: args.term,
      definition: args.definition ?? "",
      context: "",
      tags: ["manual"],
      difficulty: 3,
      stability: 0,
      fsrsDifficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      nextReview: Date.now(),
      lastReview: undefined,
      createdAt: Date.now(),
    });
  },
});
