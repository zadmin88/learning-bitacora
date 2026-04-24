"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { CHALLENGE_SYSTEM_PROMPT } from "../lib/prompts";
import { getProvider } from "../lib/aiProvider";

export const generateChallenge = action({
  args: { conceptId: v.id("concepts") },
  handler: async (ctx, args): Promise<{
    question: string;
    hint?: string;
    answer: string;
    explanation: string;
    challengeType: string;
    conceptId: string;
  }> => {
    // Load concept
    const concept: any = await ctx.runQuery(
      internal.challengeHelpers.getConcept,
      { conceptId: args.conceptId }
    );
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
    const cached: any = await ctx.runQuery(
      internal.challengeHelpers.getCachedChallenge,
      {
        conceptId: args.conceptId,
        challengeType,
      }
    );

    if (cached && Date.now() - cached.generatedAt < 7 * 24 * 60 * 60 * 1000) {
      return {
        question: cached.question,
        hint: cached.hint,
        answer: cached.answer,
        explanation: cached.explanation,
        challengeType,
        conceptId: args.conceptId,
      };
    }

    let challenge: {
      question: string;
      hint?: string;
      answer: string;
      explanation: string;
    };

    const provider = getProvider();
    if (provider) {
      const text = await provider.generateText(
        CHALLENGE_SYSTEM_PROMPT,
        `Generate a "${challengeType}" challenge for this concept:
Term: ${concept.term}
Type: ${concept.type}
Definition: ${concept.definition || "N/A"}
Original context: "${concept.context}"
Difficulty: ${concept.difficulty}/5`
      );

      try {
        challenge = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          challenge = JSON.parse(jsonMatch[0]);
        } else {
          challenge = {
            question: `¿Qué significa "${concept.term}"?`,
            hint: concept.context,
            answer: concept.definition || concept.term,
            explanation: `"${concept.term}" fue encontrado en tu entrada de diario.`,
          };
        }
      }
    } else {
      // Mock mode
      console.log("No AI provider configured — using mock challenge");
      if (challengeType === "fill_gap") {
        challenge = {
          question: `Completa la oración: "I ___ learning about ${concept.term} today."`,
          hint: `Piensa en el contexto: "${concept.context?.substring(0, 60)}"`,
          answer: "was",
          explanation: `Usamos "was" con "I" en pasado continuo para describir acciones en progreso.`,
        };
      } else if (challengeType === "error_correction") {
        challenge = {
          question: `Encuentra el error: "She don't know about ${concept.term}."`,
          hint: "Fíjate en la conjugación del verbo.",
          answer: `She doesn't know about ${concept.term}.`,
          explanation: `Con "she/he/it" usamos "doesn't" en lugar de "don't".`,
        };
      } else {
        challenge = {
          question: `¿Qué significa "${concept.term}" y cómo lo usarías en una oración?`,
          hint: concept.context?.substring(0, 80) || "Piensa en el contexto donde lo aprendiste.",
          answer: concept.definition || concept.term,
          explanation: `"${concept.term}" es un concepto que encontraste en tu diario de aprendizaje.`,
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
