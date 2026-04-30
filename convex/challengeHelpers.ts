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
    challengeLevel: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("challengeCache")
      .withIndex("by_conceptId_and_challengeType_and_challengeLevel", (q) =>
        q
          .eq("conceptId", args.conceptId)
          .eq("challengeType", args.challengeType)
          .eq("challengeLevel", args.challengeLevel)
      )
      .unique();
  },
});

export const getAnyCachedChallenge = internalQuery({
  args: {
    conceptId: v.id("concepts"),
    challengeLevel: v.string(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("challengeCache")
      .withIndex("by_concept", (q) => q.eq("conceptId", args.conceptId))
      .take(10);
    return cached.find((c) => c.challengeLevel === args.challengeLevel) ?? null;
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
    challengeLevel: v.string(),
    question: v.string(),
    hint: v.optional(v.string()),
    answer: v.string(),
    explanation: v.string(),
    questionEs: v.optional(v.string()),
    hintEs: v.optional(v.string()),
    explanationEs: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Remove old cached challenge if exists
    const existing = await ctx.db
      .query("challengeCache")
      .withIndex("by_conceptId_and_challengeType_and_challengeLevel", (q) =>
        q
          .eq("conceptId", args.conceptId)
          .eq("challengeType", args.challengeType)
          .eq("challengeLevel", args.challengeLevel)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("challengeCache", {
      conceptId: args.conceptId,
      challengeType: args.challengeType,
      challengeLevel: args.challengeLevel,
      question: args.question,
      hint: args.hint,
      answer: args.answer,
      explanation: args.explanation,
      questionEs: args.questionEs,
      hintEs: args.hintEs,
      explanationEs: args.explanationEs,
      generatedAt: Date.now(),
    });
  },
});
