"use node";

import Anthropic from "@anthropic-ai/sdk";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { CORRECTION_SYSTEM_PROMPT } from "../lib/prompts";

export const checkEntry = internalAction({
  args: {
    entryId: v.id("entries"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      let result: {
        corrections: Array<{
          original: string;
          corrected: string;
          explanation: string;
          severity: string;
        }>;
        praise: string;
        overallLevel: string;
      };

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        const anthropic = new Anthropic();
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: CORRECTION_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Review this journal entry:\n\n${args.content}`,
            },
          ],
        });

        const text =
          response.content[0].type === "text" ? response.content[0].text : "";

        try {
          result = JSON.parse(text);
        } catch {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            console.error("Failed to parse correction response:", text);
            return;
          }
        }
      } else {
        // Mock mode for testing
        console.log("ANTHROPIC_API_KEY not set — using mock corrections");
        result = {
          corrections: [],
          praise: "¡Buen trabajo escribiendo en inglés! Sigue practicando todos los días.",
          overallLevel: "intermediate",
        };
      }

      await ctx.runMutation(internal.entries.updateCorrections, {
        entryId: args.entryId,
        corrections: result.corrections,
        praise: result.praise,
        overallLevel: result.overallLevel,
      });
    } catch (error) {
      console.error("Error checking entry:", error);
    }
  },
});
