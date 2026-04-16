"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { SEARCH_SYSTEM_PROMPT } from "./lib/prompts";
import { Id } from "./_generated/dataModel";

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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Mock mode — just return recent entries that match keywords
      console.log("GEMINI_API_KEY not set — using mock search");
      return {
        answer: `Búsqueda de: "${args.query}"\n\nEn modo de prueba sin API keys. Configura GEMINI_API_KEY para búsqueda semántica completa.`,
        entries: [],
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 1. Embed query
    const embeddingModel = genAI.getGenerativeModel(
      { model: "gemini-embedding-001" }
    );
    const embeddingResult = await embeddingModel.embedContent(args.query);
    const queryEmbedding = embeddingResult.embedding.values;

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

    // 4. Gemini generates conversational answer
    let answer: string;

    const chatModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SEARCH_SYSTEM_PROMPT,
    });
    const entryTexts: string = entries
      .map(
        (e, i) =>
          `[Entrada ${i + 1}, ${new Date(e.createdAt).toLocaleDateString()}]:\n${e.content}`
      )
      .join("\n\n---\n\n");

    const chatResult = await chatModel.generateContent(
      `Query: "${args.query}"\n\nRelevant journal entries:\n\n${entryTexts}`
    );
    answer = chatResult.response.text();

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
