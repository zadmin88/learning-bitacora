"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getProvider, EMBEDDING_DIMENSIONS } from "../lib/aiProvider";

const MAX_QUOTA_RETRIES = 3;

// Ms until shortly after the next daily quota reset (00:00 UTC)
function msUntilNextQuotaReset(): number {
  const reset = new Date();
  reset.setUTCHours(24, 5, 0, 0); // next midnight UTC + 5 min margin
  return reset.getTime() - Date.now();
}

export const generateForEntry = internalAction({
  args: {
    entryId: v.id("entries"),
    userId: v.id("users"),
    content: v.string(),
    attempt: v.optional(v.number()),
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

      // Daily quota exhausted — retry after the next reset instead of
      // leaving the entry without an embedding
      const attempt = args.attempt ?? 0;
      if (
        (error as { status?: number })?.status === 429 &&
        attempt < MAX_QUOTA_RETRIES
      ) {
        const delay = msUntilNextQuotaReset();
        console.log(
          `Embedding quota exhausted — retrying entry ${args.entryId} in ${Math.round(delay / 60000)} min (attempt ${attempt + 1}/${MAX_QUOTA_RETRIES})`
        );
        await ctx.scheduler.runAfter(delay, internal.ai.embeddings.generateForEntry, {
          entryId: args.entryId,
          userId: args.userId,
          content: args.content,
          attempt: attempt + 1,
        });
      }
    }
  },
});

// Backfill embeddings for entries that lost them (e.g. dropped during a
// quota outage). On 429 each entry schedules its own retry after the reset.
// Run with: npx convex run ai/embeddings:backfillMissingEmbeddings
export const backfillMissingEmbeddings = internalAction({
  args: {},
  handler: async (ctx) => {
    const entries: Array<{
      _id: string;
      userId: string;
      content: string;
    }> = await ctx.runQuery(internal.searchHelpers.getEntriesMissingEmbeddings);

    console.log(`Backfilling embeddings for ${entries.length} entries...`);
    for (const entry of entries) {
      await ctx.runAction(internal.ai.embeddings.generateForEntry, {
        entryId: entry._id as any,
        userId: entry.userId as any,
        content: entry.content,
      });
    }
    return { backfilled: entries.length };
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
