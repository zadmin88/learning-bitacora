"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
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

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const embeddingModel = genAI.getGenerativeModel(
          { model: "gemini-embedding-001" }
        );
        const result = await embeddingModel.embedContent(args.content);
        embedding = result.embedding.values;
      } else {
        // Mock mode — generate a deterministic fake embedding from content hash
        console.log("GEMINI_API_KEY not set — using mock embedding");
        embedding = Array.from({ length: 3072 }, (_, i) => {
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
