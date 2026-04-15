"use node";

import Anthropic from "@anthropic-ai/sdk";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { EXTRACTION_SYSTEM_PROMPT } from "../lib/prompts";

function extractMockConcepts(content: string) {
  const words = content.split(/\s+/).filter((w) => w.length > 4);
  const concepts = [];

  // Extract some "vocabulary" from longer words
  const uniqueWords = [...new Set(words)].slice(0, 3);
  for (const word of uniqueWords) {
    concepts.push({
      type: "vocabulary",
      term: word.toLowerCase().replace(/[^a-záéíóúñ]/gi, ""),
      definition: `Palabra encontrada en tu entrada`,
      context: content.substring(0, 80),
      tags: ["journal"],
      difficulty: 2,
    });
  }

  // Add a grammar concept if entry is long enough
  if (content.length > 50) {
    concepts.push({
      type: "grammar",
      term: "sentence structure",
      definition: "La estructura de oraciones en inglés sigue el orden SVO (Sujeto-Verbo-Objeto)",
      context: content.substring(0, 80),
      tags: ["grammar", "basics"],
      difficulty: 2,
    });
  }

  return concepts.filter((c) => c.term.length > 0);
}

export const processEntry = internalAction({
  args: {
    entryId: v.id("entries"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      let concepts: Array<{
        type: string;
        term: string;
        definition?: string;
        context?: string;
        tags?: string[];
        difficulty?: number;
      }>;

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        const anthropic = new Anthropic();
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Analyze this journal entry:\n\n${args.content}`,
            },
          ],
        });

        const text =
          response.content[0].type === "text" ? response.content[0].text : "";

        try {
          concepts = JSON.parse(text);
        } catch {
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            concepts = JSON.parse(jsonMatch[0]);
          } else {
            console.error("Failed to parse extraction response:", text);
            return;
          }
        }
      } else {
        // Mock mode for testing without API key
        console.log("ANTHROPIC_API_KEY not set — using mock extraction");
        concepts = extractMockConcepts(args.content);
      }

      for (const c of concepts) {
        await ctx.runMutation(internal.concepts.createFromExtraction, {
          userId: args.userId,
          entryId: args.entryId,
          type: c.type,
          term: c.term,
          definition: c.definition ?? "",
          context: c.context ?? "",
          tags: c.tags ?? [],
          difficulty: c.difficulty ?? 3,
        });
      }

      await ctx.runMutation(internal.entries.updateConceptCount, {
        entryId: args.entryId,
        count: concepts.length,
      });
    } catch (error) {
      console.error("Error processing entry:", error);
    }
  },
});
