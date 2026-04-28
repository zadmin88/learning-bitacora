import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getConcept = internalQuery({
  args: { conceptId: v.id("concepts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conceptId);
  },
});

export const getCachedChallenge = internalQuery({
  args: {
    conceptId: v.id("concepts"),
    challengeType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("challengeCache")
      .withIndex("by_concept_type", (q) =>
        q.eq("conceptId", args.conceptId).eq("challengeType", args.challengeType)
      )
      .unique();
  },
});

export const getAnyCachedChallenge = internalQuery({
  args: { conceptId: v.id("concepts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("challengeCache")
      .withIndex("by_concept", (q) => q.eq("conceptId", args.conceptId))
      .first();
  },
});

export const invalidateCachedChallenge = internalMutation({
  args: { conceptId: v.id("concepts") },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("challengeCache")
      .withIndex("by_concept", (q) => q.eq("conceptId", args.conceptId))
      .collect();
    for (const entry of cached) {
      await ctx.db.delete(entry._id);
    }
  },
});

export const cacheChallenge = internalMutation({
  args: {
    conceptId: v.id("concepts"),
    challengeType: v.string(),
    question: v.string(),
    hint: v.optional(v.string()),
    answer: v.string(),
    explanation: v.string(),
  },
  handler: async (ctx, args) => {
    // Remove old cached challenge if exists
    const existing = await ctx.db
      .query("challengeCache")
      .withIndex("by_concept_type", (q) =>
        q.eq("conceptId", args.conceptId).eq("challengeType", args.challengeType)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("challengeCache", {
      conceptId: args.conceptId,
      challengeType: args.challengeType,
      question: args.question,
      hint: args.hint,
      answer: args.answer,
      explanation: args.explanation,
      generatedAt: Date.now(),
    });
  },
});
