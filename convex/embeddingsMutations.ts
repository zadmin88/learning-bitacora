import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const storeEmbedding = internalMutation({
  args: {
    entryId: v.id("entries"),
    userId: v.id("users"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    // Check if embedding already exists for this entry
    const existing = await ctx.db
      .query("entryEmbeddings")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { embedding: args.embedding });
    } else {
      await ctx.db.insert("entryEmbeddings", {
        entryId: args.entryId,
        userId: args.userId,
        embedding: args.embedding,
      });
    }
  },
});
