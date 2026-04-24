import { internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getCurrentUserId = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});

export const getAllEntries = internalQuery({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("entries").take(500);
    return entries.map((e) => ({
      _id: e._id,
      userId: e.userId,
      content: e.content,
    }));
  },
});

export const getEntriesByEmbeddings = internalQuery({
  args: { embeddingIds: v.array(v.id("entryEmbeddings")) },
  handler: async (ctx, args) => {
    const entries = [];
    for (const embId of args.embeddingIds) {
      const embedding = await ctx.db.get(embId);
      if (embedding) {
        const entry = await ctx.db.get(embedding.entryId);
        if (entry) {
          entries.push(entry);
        }
      }
    }
    return entries;
  },
});
