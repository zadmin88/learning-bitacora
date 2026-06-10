"use node";

import { ActionCtx } from "../_generated/server";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { CHALLENGE_SYSTEM_PROMPT } from "../lib/prompts";
import { getProvider } from "../lib/aiProvider";
import { Id } from "../_generated/dataModel";

type ChallengeResult = {
  question: string;
  hint?: string;
  answer: string;
  explanation: string;
  challengeType: string;
  conceptId: string;
  questionEs?: string;
  hintEs?: string;
  explanationEs?: string;
};

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const LEVEL_INSTRUCTIONS: Record<string, string> = {
  beginner:
    "Use short, simple sentences with common vocabulary. Keep the challenge straightforward and suitable for beginners (difficulty 1-2).",
  intermediate: "",
  advanced:
    "Use complex sentences, nuanced vocabulary, and sophisticated grammar. Make it challenging for advanced learners (difficulty 4-5).",
};

async function doGenerateChallenge(
  ctx: ActionCtx,
  conceptId: Id<"concepts">,
  challengeLevel: string
): Promise<ChallengeResult> {
  type ConceptDoc = { _id: Id<"concepts">; type: string; term: string; definition?: string; context?: string; difficulty?: number };
  type CachedDoc = { generatedAt: number; challengeType: string; question: string; hint?: string; answer: string; explanation: string; questionEs?: string; hintEs?: string; explanationEs?: string } | null;

  // Load concept
  const concept = await ctx.runQuery(
    internal.challengeHelpers.getConcept,
    { conceptId }
  ) as ConceptDoc | null;
  if (!concept) throw new Error("Concept not found");

  // Determine challenge type and check cache
  let challengeType: string;
  let cached: CachedDoc = null;

  if (concept.type === "error") {
    challengeType = "error_correction";
    cached = await ctx.runQuery(
      internal.challengeHelpers.getCachedChallenge,
      { conceptId, challengeType, challengeLevel }
    );
  } else if (concept.type === "grammar") {
    challengeType = "free_recall";
    cached = await ctx.runQuery(
      internal.challengeHelpers.getCachedChallenge,
      { conceptId, challengeType, challengeLevel }
    );
  } else {
    // Vocabulary: check for ANY cached challenge first (regardless of type)
    cached = await ctx.runQuery(
      internal.challengeHelpers.getAnyCachedChallenge,
      { conceptId, challengeLevel }
    );
    if (cached && Date.now() - cached.generatedAt < CACHE_TTL) {
      challengeType = cached.challengeType;
    } else {
      cached = null;
      challengeType = Math.random() > 0.5 ? "fill_gap" : "free_recall";
    }
  }

  // Return cached if valid
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL) {
    return {
      question: cached.question,
      hint: cached.hint,
      answer: cached.answer,
      explanation: cached.explanation,
      challengeType: cached.challengeType,
      conceptId,
      questionEs: cached.questionEs,
      hintEs: cached.hintEs,
      explanationEs: cached.explanationEs,
    };
  }

  // Generate new challenge
  let challenge: {
    question: string;
    hint?: string;
    answer: string;
    explanation: string;
    questionEs?: string;
    hintEs?: string;
    explanationEs?: string;
  } | undefined = undefined;

  const provider = getProvider();
  if (provider) {
    const levelInstruction = LEVEL_INSTRUCTIONS[challengeLevel] || "";

    // Build user prompt — vocabulary free_recall needs special instructions
    let userPrompt: string;
    if (challengeType === "free_recall" && concept.type !== "grammar") {
      userPrompt = `Generate a "free_recall" challenge for this VOCABULARY concept.
The learner must recall the EXACT term from its definition/description.

Term (this is the correct answer — do NOT include it in the question): ${concept.term}
Type: ${concept.type}
Definition: ${concept.definition || "N/A"}
Original context (for reference only — create a NEW description): "${concept.context}"
Difficulty: ${concept.difficulty}/5

Remember: Describe the meaning or a scenario, then ask "What is the English word/phrase for this?" The answer MUST be "${concept.term}".`;
    } else {
      userPrompt = `Generate a "${challengeType}" challenge for this concept:
Term: ${concept.term}
Type: ${concept.type}
Definition: ${concept.definition || "N/A"}
Original context: "${concept.context}"
Difficulty: ${concept.difficulty}/5`;
    }

    if (levelInstruction) {
      userPrompt += `\n\n${levelInstruction}`;
    }

    let text = "";
    try {
      text = await provider.generateText(CHALLENGE_SYSTEM_PROMPT, userPrompt);
    } catch (aiError: unknown) {
      if ((aiError as { status?: number })?.status === 429) {
        console.warn("AI API quota exceeded (429) — using mock challenge");
        text = "";
      } else {
        throw aiError;
      }
    }

    if (text) {
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
            questionEs: `¿Qué significa "${concept.term}"?`,
            hintEs: concept.context,
            explanationEs: `"${concept.term}" fue encontrado en tu entrada de diario.`,
          };
        }
      }
    }
  }

  if (!challenge) {
    // Mock mode
    console.log("No AI provider configured — using mock challenge");
    if (challengeType === "fill_gap") {
      challenge = {
        question: `Complete the sentence: "I ___ learning about ${concept.term} today."`,
        hint: `Think about the context: "${concept.context?.substring(0, 60)}"`,
        answer: "was",
        explanation: `We use "was" with "I" in past continuous to describe ongoing actions.`,
        questionEs: `Completa la oración: "I ___ learning about ${concept.term} today."`,
        hintEs: `Piensa en el contexto: "${concept.context?.substring(0, 60)}"`,
        explanationEs: `Usamos "was" con "I" en pasado continuo para describir acciones en progreso.`,
      };
    } else if (challengeType === "error_correction") {
      challenge = {
        question: `Find the error: "She don't know about ${concept.term}."`,
        hint: "Look at the verb conjugation.",
        answer: `She doesn't know about ${concept.term}.`,
        explanation: `With "she/he/it" we use "doesn't" instead of "don't".`,
        questionEs: `Encuentra el error: "She don't know about ${concept.term}."`,
        hintEs: "Fíjate en la conjugación del verbo.",
        explanationEs: `Con "she/he/it" usamos "doesn't" en lugar de "don't".`,
      };
    } else {
      challenge = {
        question: `What does "${concept.term}" mean and how would you use it in a sentence?`,
        hint: concept.context?.substring(0, 80) || "Think about the context where you learned it.",
        answer: concept.definition || concept.term,
        explanation: `"${concept.term}" is a concept you found in your learning journal.`,
        questionEs: `¿Qué significa "${concept.term}" y cómo lo usarías en una oración?`,
        hintEs: concept.context?.substring(0, 80) || "Piensa en el contexto donde lo aprendiste.",
        explanationEs: `"${concept.term}" es un concepto que encontraste en tu diario de aprendizaje.`,
      };
    }
  }

  if (!challenge) throw new Error("Challenge generation failed");

  // Cache the result
  await ctx.runMutation(internal.challengeHelpers.cacheChallenge, {
    conceptId,
    challengeType,
    challengeLevel,
    question: challenge.question,
    hint: challenge.hint,
    answer: challenge.answer,
    explanation: challenge.explanation,
    questionEs: challenge.questionEs,
    hintEs: challenge.hintEs,
    explanationEs: challenge.explanationEs,
  });

  return {
    ...challenge,
    challengeType,
    conceptId,
  };
}

export const generateChallenge = action({
  args: {
    conceptId: v.id("concepts"),
    challengeLevel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ChallengeResult> => {
    const level = args.challengeLevel ?? "intermediate";
    return doGenerateChallenge(ctx, args.conceptId, level);
  },
});

export const preGenerateForEntry = internalAction({
  args: {
    entryId: v.id("entries"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const challengeLevel: string = await ctx.runQuery(
      internal.challengeHelpers.getUserChallengeLevel,
      { userId: args.userId }
    );
    const concepts = await ctx.runQuery(
      internal.challengeHelpers.getConceptsByEntry,
      { entryId: args.entryId }
    );

    for (const concept of concepts) {
      try {
        await doGenerateChallenge(ctx, concept._id, challengeLevel);
      } catch (error) {
        console.error(
          `Pre-generation failed for concept ${concept._id}:`,
          error
        );
      }
    }
  },
});

export const regenerateChallenge = action({
  args: {
    conceptId: v.id("concepts"),
    challengeLevel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ChallengeResult> => {
    const level = args.challengeLevel ?? "intermediate";
    // Invalidate all cached challenges for this concept
    await ctx.runMutation(internal.challengeHelpers.invalidateCachedChallenge, {
      conceptId: args.conceptId,
    });
    // Generate a fresh challenge (will miss cache)
    return doGenerateChallenge(ctx, args.conceptId, level);
  },
});
