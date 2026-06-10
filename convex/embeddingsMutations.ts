import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// One-off migration helper: deletes all stored embeddings so they can be
// regenerated with a different model/dimension count.
// Run with: npx convex run embeddingsMutations:clearAll
export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("entryEmbeddings").collect();
    for (const e of all) {
      await ctx.db.delete(e._id);
    }
    return { deleted: all.length };
  },
});

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
