"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { SEARCH_SYSTEM_PROMPT } from "./lib/prompts";
import { Id } from "./_generated/dataModel";
import { getProvider } from "./lib/aiProvider";

export const semanticSearch = action({
  args: { query: v.string() },
  handler: async (ctx, args): Promise<{
    answer: string;
    entries: Array<{
      _id: Id<"entries">;
      content: string;
      createdAt: number;
      conceptCount: number;
    }>;
  }> => {
    // Get current user
    const userId: Id<"users"> | null = await ctx.runQuery(
      internal.searchHelpers.getCurrentUserId
    );
    if (!userId) throw new Error("Not authenticated");

    const provider = getProvider();

    if (!provider) {
      // Mock mode — just return recent entries that match keywords
      console.log("No AI provider configured — using mock search");
      return {
        answer: `Búsqueda de: "${args.query}"\n\nEn modo de prueba sin API keys. Configura CLOUDFLARE_AI_API_TOKEN o GEMINI_API_KEY para búsqueda semántica completa.`,
        entries: [],
      };
    }

    // 1. Embed query
    const queryEmbedding = await provider.generateEmbedding(args.query);

    // 2. Vector search
    const results = await ctx.vectorSearch("entryEmbeddings", "by_embedding", {
      vector: queryEmbedding,
      limit: 8,
      filter: (q) => q.eq("userId", userId),
    });

    if (results.length === 0) {
      return {
        answer:
          "No encontré entradas relacionadas con tu búsqueda. ¡Intenta escribir sobre este tema en tu diario!",
        entries: [],
      };
    }

    // 3. Load entries
    const entries: Array<{
      _id: Id<"entries">;
      content: string;
      createdAt: number;
      conceptCount: number;
    }> = await ctx.runQuery(internal.searchHelpers.getEntriesByEmbeddings, {
      embeddingIds: results.map((r) => r._id),
    });

    // 4. AI generates conversational answer
    const entryTexts: string = entries
      .map(
        (e, i) =>
          `[Entrada ${i + 1}, ${new Date(e.createdAt).toLocaleDateString()}]:\n${e.content}`
      )
      .join("\n\n---\n\n");

    const answer = await provider.generateText(
      SEARCH_SYSTEM_PROMPT,
      `Query: "${args.query}"\n\nRelevant journal entries:\n\n${entryTexts}`
    );

    return {
      answer,
      entries: entries.map((e) => ({
        _id: e._id,
        content: e.content,
        createdAt: e.createdAt,
        conceptCount: e.conceptCount,
      })),
    };
  },
});
