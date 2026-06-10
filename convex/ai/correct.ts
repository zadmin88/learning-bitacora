"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { CORRECTION_SYSTEM_PROMPT } from "../lib/prompts";
import { getProvider } from "../lib/aiProvider";

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

      const provider = getProvider();
      if (provider) {
        let text: string;
        try {
          text = await provider.generateText(
            CORRECTION_SYSTEM_PROMPT,
            `Review this journal entry:\n\n${args.content}`
          );
        } catch (aiError: unknown) {
          if ((aiError as { status?: number })?.status === 429) {
            console.warn("AI API quota exceeded (429) — skipping corrections");
            return;
          }
          throw aiError;
        }

        try {
          const sanitized = text.replace(/,\s*([}\]])/g, "$1");
          result = JSON.parse(sanitized);
        } catch {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const cleaned = jsonMatch[0].replace(/,\s*([}\]])/g, "$1");
            result = JSON.parse(cleaned);
          } else {
            console.error("Failed to parse correction response:", text);
            return;
          }
        }
      } else {
        // Mock mode for testing
        console.log("No AI provider configured — using mock corrections");
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
      await ctx.runMutation(internal.entries.setProcessingError, {
        entryId: args.entryId,
      });
    }
  },
});
