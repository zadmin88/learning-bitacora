"use node";

import Anthropic from "@anthropic-ai/sdk";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { EXTRACTION_SYSTEM_PROMPT } from "../lib/prompts";

const anthropic = new Anthropic();

export const processEntry = internalAction({
  args: {
    entryId: v.id("entries"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    try {
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

      // Try to parse JSON, handle potential markdown wrapping
      let concepts: Array<{
        type: string;
        term: string;
        definition?: string;
        context?: string;
        tags?: string[];
        difficulty?: number;
      }>;

      try {
        concepts = JSON.parse(text);
      } catch {
        // Try extracting JSON from markdown code block
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          concepts = JSON.parse(jsonMatch[0]);
        } else {
          console.error("Failed to parse extraction response:", text);
          return;
        }
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
