import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getConceptsByEntry = internalQuery({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("concepts")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .take(50);
  },
});

export const getUserChallengeLevel = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    return profile?.challengeLevel ?? "intermediate";
  },
});

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

// One-off cleanup: delete cached challenges that came from the mock/fallback
// generator (cached before fallbacks were excluded from the cache).
// Run with: npx convex run challengeHelpers:clearFallbackChallenges
export const clearFallbackChallenges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const fallbackMarkers = [
      "is a concept you found in your learning journal",
      "was found in your journal entry",
      'We use "was" with "I" in past continuous',
      'we use "doesn\'t" instead of "don\'t"',
    ];
    const cached = await ctx.db.query("challengeCache").take(1000);
    let deleted = 0;
    for (const c of cached) {
      if (fallbackMarkers.some((m) => c.explanation.includes(m))) {
        await ctx.db.delete(c._id);
        deleted++;
      }
    }
    return { deleted };
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
    options: v.optional(v.array(v.string())),
    optionsEs: v.optional(v.array(v.string())),
    correctIndex: v.optional(v.number()),
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
      options: args.options,
      optionsEs: args.optionsEs,
      correctIndex: args.correctIndex,
      questionEs: args.questionEs,
      hintEs: args.hintEs,
      explanationEs: args.explanationEs,
      generatedAt: Date.now(),
    });
  },
});
