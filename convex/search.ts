"use node";

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { SEARCH_SYSTEM_PROMPT } from "./lib/prompts";

const openai = new OpenAI();
const anthropic = new Anthropic();

export const semanticSearch = action({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    // Get current user
    const userId = await ctx.runQuery(internal.searchHelpers.getCurrentUserId);
    if (!userId) throw new Error("Not authenticated");

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
      filter: (q: any) => q.eq("userId", userId),
    });

    if (results.length === 0) {
      return {
        answer:
          "I couldn't find any entries related to your query. Try writing about this topic in your journal!",
        entries: [],
      };
    }

    // 3. Load entries
    const entries = await ctx.runQuery(
      internal.searchHelpers.getEntriesByEmbeddings,
      { embeddingIds: results.map((r: any) => r._id) }
    );

    // 4. Claude generates conversational answer
    const entryTexts = entries
      .map(
        (e: any, i: number) =>
          `[Entry ${i + 1}, ${new Date(e.createdAt).toLocaleDateString()}]:\n${e.content}`
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

    const answer =
      response.content[0].type === "text"
        ? response.content[0].text
        : "Unable to generate answer.";

    return {
      answer,
      entries: entries.map((e: any) => ({
        _id: e._id,
        content: e.content,
        createdAt: e.createdAt,
        conceptCount: e.conceptCount,
      })),
    };
  },
});
