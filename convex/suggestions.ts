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
