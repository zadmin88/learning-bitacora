"use node";

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
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

    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

    if (!hasOpenAI) {
      // Mock mode — just return recent entries that match keywords
      console.log("OPENAI_API_KEY not set — using mock search");
      return {
        answer: `Búsqueda de: "${args.query}"\n\nEn modo de prueba sin API keys. Configura OPENAI_API_KEY y ANTHROPIC_API_KEY para búsqueda semántica completa.`,
        entries: [],
      };
    }

    const openai = new OpenAI();

    // 1. Embed query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: args.query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

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

    // 4. Claude generates conversational answer (or fallback)
    let answer: string;

    if (hasAnthropic) {
      const anthropic = new Anthropic();
      const entryTexts: string = entries
        .map(
          (e, i) =>
            `[Entrada ${i + 1}, ${new Date(e.createdAt).toLocaleDateString()}]:\n${e.content}`
        )
        .join("\n\n---\n\n");

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SEARCH_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Query: "${args.query}"\n\nRelevant journal entries:\n\n${entryTexts}`,
          },
        ],
      });

      answer =
        response.content[0].type === "text"
          ? response.content[0].text
          : "No se pudo generar una respuesta.";
    } else {
      answer = `Encontré ${entries.length} entrada(s) relacionada(s) con "${args.query}". Configura ANTHROPIC_API_KEY para obtener respuestas con IA.`;
    }

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
