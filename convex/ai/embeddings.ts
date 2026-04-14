"use node";

import OpenAI from "openai";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const openai = new OpenAI();

export const generateForEntry = internalAction({
  args: {
    entryId: v.id("entries"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: args.content,
      });

      const embedding = response.data[0].embedding;

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
