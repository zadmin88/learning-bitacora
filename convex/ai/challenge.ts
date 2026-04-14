"use node";

import Anthropic from "@anthropic-ai/sdk";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { CHALLENGE_SYSTEM_PROMPT } from "../lib/prompts";

const anthropic = new Anthropic();

export const generateChallenge = action({
  args: { conceptId: v.id("concepts") },
  handler: async (ctx, args) => {
    // Load concept
    const concept = await ctx.runQuery(internal.challengeHelpers.getConcept, {
      conceptId: args.conceptId,
    });
    if (!concept) throw new Error("Concept not found");

    // Determine challenge type based on concept type
    let challengeType: string;
    if (concept.type === "error") {
      challengeType = "error_correction";
    } else if (concept.type === "grammar") {
      challengeType = "free_recall";
    } else {
      challengeType = Math.random() > 0.5 ? "fill_gap" : "free_recall";
    }

    // Check cache first
    const cached = await ctx.runQuery(
      internal.challengeHelpers.getCachedChallenge,
      {
        conceptId: args.conceptId,
        challengeType,
      }
    );

    if (cached && Date.now() - cached.generatedAt < 7 * 24 * 60 * 60 * 1000) {
      return {
        ...cached,
        challengeType,
      };
    }

    // Generate with Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: CHALLENGE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a "${challengeType}" challenge for this concept:
Term: ${concept.term}
Type: ${concept.type}
Definition: ${concept.definition || "N/A"}
Original context: "${concept.context}"
Difficulty: ${concept.difficulty}/5`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    let challenge: {
      question: string;
      hint?: string;
      answer: string;
      explanation: string;
    };

    try {
      challenge = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        challenge = JSON.parse(jsonMatch[0]);
      } else {
        challenge = {
          question: `What does "${concept.term}" mean?`,
          hint: concept.context,
          answer: concept.definition || concept.term,
          explanation: `"${concept.term}" was found in your journal entry.`,
        };
      }
    }

    // Cache the result
    await ctx.runMutation(internal.challengeHelpers.cacheChallenge, {
      conceptId: args.conceptId,
      challengeType,
      question: challenge.question,
      hint: challenge.hint,
      answer: challenge.answer,
      explanation: challenge.explanation,
    });

    return {
      ...challenge,
      challengeType,
      conceptId: args.conceptId,
    };
  },
});
