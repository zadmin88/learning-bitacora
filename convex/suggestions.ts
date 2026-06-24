import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getUserTerms = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return concepts.map((c) => c.term);
  },
});

// The learner's most recently studied concepts, used to seed personalized
// discovery suggestions. Returns just the fields the AI needs to find
// connections — not the full FSRS state.
export const getRecentConcepts = internalQuery({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 10);
    return concepts.map((c) => ({
      term: c.term,
      definition: c.definition ?? "",
      type: c.type,
      difficulty: c.difficulty,
      tags: c.tags,
    }));
  },
});
