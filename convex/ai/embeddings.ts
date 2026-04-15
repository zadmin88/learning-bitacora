"use node";

import OpenAI from "openai";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const generateForEntry = internalAction({
  args: {
    entryId: v.id("entries"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      let embedding: number[];

      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        const openai = new OpenAI();
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: args.content,
        });
        embedding = response.data[0].embedding;
      } else {
        // Mock mode — generate a deterministic fake embedding from content hash
        console.log("OPENAI_API_KEY not set — using mock embedding");
        embedding = Array.from({ length: 1536 }, (_, i) => {
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
