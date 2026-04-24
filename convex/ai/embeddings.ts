"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getProvider, EMBEDDING_DIMENSIONS } from "../lib/aiProvider";

export const generateForEntry = internalAction({
  args: {
    entryId: v.id("entries"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      let embedding: number[];

      const provider = getProvider();
      if (provider) {
        embedding = await provider.generateEmbedding(args.content);
      } else {
        // Mock mode — generate a deterministic fake embedding from content hash
        console.log("No AI provider configured — using mock embedding");
        embedding = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => {
          const charCode = args.content.charCodeAt(i % args.content.length) || 0;
          return Math.sin(charCode * (i + 1)) * 0.1;
        });
      }

      await ctx.runMutation(internal.embeddingsMutations.storeEmbedding, {
        entryId: args.entryId,
        userId: args.userId,
        embedding,
      });
    } catch (error) {
      console.error("Error generating embedding:", error);
    }
  },
});

export const regenerateAllEmbeddings = internalAction({
  args: {},
  handler: async (ctx) => {
    const entries: Array<{
      _id: string;
      userId: string;
      content: string;
    }> = await ctx.runQuery(internal.searchHelpers.getAllEntries);

    console.log(`Regenerating embeddings for ${entries.length} entries...`);

    let count = 0;
    for (const entry of entries) {
      await ctx.runAction(internal.ai.embeddings.generateForEntry, {
        entryId: entry._id as any,
        userId: entry.userId as any,
        content: entry.content,
      });
      count++;
    }

    console.log(`Regenerated ${count} embeddings`);
    return { regenerated: count };
  },
});
