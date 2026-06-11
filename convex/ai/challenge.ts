"use node";

import { ActionCtx } from "../_generated/server";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import {
  CHALLENGE_SYSTEM_PROMPT,
  GRAMMAR_CHALLENGE_SYSTEM_PROMPT,
} from "../lib/prompts";
import { getProvider } from "../lib/aiProvider";
import { Id } from "../_generated/dataModel";

type ChallengeResult = {
  question: string;
  hint?: string;
  answer: string;
  explanation: string;
  challengeType: string;
  conceptId: string;
  options?: string[];
  optionsEs?: string[];
  correctIndex?: number;
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
  challengeLevel: string,
): Promise<ChallengeResult> {
  type ConceptDoc = {
    _id: Id<"concepts">;
    type: string;
    term: string;
    definition?: string;
    context?: string;
    pattern?: string;
    examples?: string[];
    difficulty?: number;
  };
  type CachedDoc = {
    generatedAt: number;
    challengeType: string;
    question: string;
    hint?: string;
    answer: string;
    explanation: string;
    options?: string[];
    optionsEs?: string[];
    correctIndex?: number;
    questionEs?: string;
    hintEs?: string;
    explanationEs?: string;
  } | null;

  // Load concept
  const concept = (await ctx.runQuery(internal.challengeHelpers.getConcept, {
    conceptId,
  })) as ConceptDoc | null;
  if (!concept) throw new Error("Concept not found");

  // Determine challenge type and check cache
  let challengeType: string;
  let cached: CachedDoc = null;

  if (concept.type === "error") {
    challengeType = "error_correction";
    cached = await ctx.runQuery(internal.challengeHelpers.getCachedChallenge, {
      conceptId,
      challengeType,
      challengeLevel,
    });
  } else if (concept.type === "grammar") {
    // Reuse ANY cached grammar challenge (transform/contrast — or a legacy
    // free_recall) so we don't regenerate a different drill on every visit.
    cached = await ctx.runQuery(
      internal.challengeHelpers.getAnyCachedChallenge,
      { conceptId, challengeLevel },
    );
    if (cached && Date.now() - cached.generatedAt < CACHE_TTL) {
      challengeType = cached.challengeType;
    } else {
      cached = null;
      const grammarTypes = ["transform", "contrast"];
      challengeType =
        grammarTypes[Math.floor(Math.random() * grammarTypes.length)];
    }
  } else {
    // Vocabulary: check for ANY cached challenge first (regardless of type)
    cached = await ctx.runQuery(
      internal.challengeHelpers.getAnyCachedChallenge,
      { conceptId, challengeLevel },
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
      options: cached.options,
      optionsEs: cached.optionsEs,
      correctIndex: cached.correctIndex,
      questionEs: cached.questionEs,
      hintEs: cached.hintEs,
      explanationEs: cached.explanationEs,
    };
  }

  // Generate new challenge
  let challenge:
    | {
        question: string;
        hint?: string;
        answer: string;
        explanation: string;
        options?: string[];
        optionsEs?: string[];
        correctIndex?: number;
        questionEs?: string;
        hintEs?: string;
        explanationEs?: string;
      }
    | undefined = undefined;

  const isGrammarDrill =
    concept.type === "grammar" &&
    (challengeType === "transform" || challengeType === "contrast");

  const provider = getProvider();
  if (provider) {
    const levelInstruction = LEVEL_INSTRUCTIONS[challengeLevel] || "";

    // Grammar transform/contrast drills use a dedicated system prompt that
    // knows about patterns, examples, and the MCQ options shape.
    const systemPrompt = isGrammarDrill
      ? GRAMMAR_CHALLENGE_SYSTEM_PROMPT
      : CHALLENGE_SYSTEM_PROMPT;

    // Build user prompt — vocabulary free_recall and grammar drills need
    // special instructions.
    let userPrompt: string;
    if (isGrammarDrill) {
      userPrompt = `Generate a "${challengeType}" challenge for this GRAMMAR/STRUCTURE concept:
Name/Rule: ${concept.term}
Explanation: ${concept.definition || "N/A"}
Pattern: ${concept.pattern || "N/A"}
Examples: ${concept.examples?.length ? concept.examples.join(" | ") : "N/A"}
Original context: "${concept.context}"
Difficulty: ${concept.difficulty}/5`;
    } else if (challengeType === "free_recall" && concept.type !== "grammar") {
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
      text = await provider.generateText(systemPrompt, userPrompt);
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
          try {
            challenge = JSON.parse(jsonMatch[0]);
          } catch {}
        }
      }
    }

    // Validate a "contrast" MCQ: it needs at least two string options and a
    // correctIndex pointing at one of them. If the model returned something
    // malformed, strip the options so it renders as a plain text drill rather
    // than a broken multiple-choice card.
    if (challenge && challengeType === "contrast") {
      const opts = challenge.options;
      const idx = challenge.correctIndex;
      const valid =
        Array.isArray(opts) &&
        opts.length >= 2 &&
        opts.every((o) => typeof o === "string" && o.trim().length > 0) &&
        typeof idx === "number" &&
        idx >= 0 &&
        idx < opts.length;
      if (valid) {
        // Keep the answer in sync with the correct option text.
        challenge.answer = opts![idx!];
        // Drop a mismatched-length Spanish options array.
        if (
          !Array.isArray(challenge.optionsEs) ||
          challenge.optionsEs.length !== opts!.length
        ) {
          challenge.optionsEs = undefined;
        }
      } else {
        challenge.options = undefined;
        challenge.optionsEs = undefined;
        challenge.correctIndex = undefined;
      }
    }
  }

  // Fallback challenges (quota exceeded, parse failure, or no provider).
  // These are placeholders — never cache them, so a real challenge is
  // generated on the next attempt once the AI is available again.
  let isFallback = false;
  if (!challenge) {
    isFallback = true;
    console.log("AI challenge unavailable — using fallback challenge");
    if (concept.type === "grammar") {
      // No MCQ options in the fallback — the learner explains/produces and
      // self-assesses, so it renders through the standard text flow.
      const example = concept.examples?.[0];
      challenge = {
        question: `Apply the structure "${concept.term}" — write your own correct example sentence using it.`,
        hint: concept.pattern
          ? `Follow the pattern: ${concept.pattern}`
          : "Think about when and how this structure is used.",
        answer: example || concept.definition || concept.term,
        explanation: `${concept.term}: ${concept.definition || ""}`.trim(),
        questionEs: `Aplica la estructura "${concept.term}" — escribe tu propia oración de ejemplo usándola.`,
        hintEs: concept.pattern
          ? `Sigue la estructura: ${concept.pattern}`
          : "Piensa en cuándo y cómo se usa esta estructura.",
        explanationEs: `${concept.term}: ${concept.definition || ""}`.trim(),
      };
    } else if (challengeType === "fill_gap") {
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
    } else if (concept.definition && concept.definition !== concept.term) {
      // free_recall: give the definition, ask for the term — without
      // revealing the answer in the question or hint
      const letterHint = `It starts with "${concept.term[0]}" and has ${concept.term.length} letters.`;
      challenge = {
        question: `"${concept.definition}" — What is the English word or phrase for this?`,
        hint: letterHint,
        answer: concept.term,
        explanation: `"${concept.term}" means: ${concept.definition}`,
        questionEs: `"${concept.definition}" — ¿Cuál es la palabra o frase en inglés para esto?`,
        hintEs: `Empieza con "${concept.term[0]}" y tiene ${concept.term.length} letras.`,
        explanationEs: `"${concept.term}" significa: ${concept.definition}`,
      };
    } else {
      challenge = {
        question: `What does "${concept.term}" mean and how would you use it in a sentence?`,
        hint: "Think about the context where you learned it.",
        answer: concept.definition || concept.term,
        explanation: `"${concept.term}" is a concept you found in your learning journal.`,
        questionEs: `¿Qué significa "${concept.term}" y cómo lo usarías en una oración?`,
        hintEs: "Piensa en el contexto donde lo aprendiste.",
        explanationEs: `"${concept.term}" es un concepto que encontraste en tu diario de aprendizaje.`,
      };
    }
  }

  if (!challenge) throw new Error("Challenge generation failed");

  // Cache only real AI-generated challenges — fallbacks must be regenerated
  if (!isFallback) {
    await ctx.runMutation(internal.challengeHelpers.cacheChallenge, {
      conceptId,
      challengeType,
      challengeLevel,
      question: challenge.question,
      hint: challenge.hint,
      answer: challenge.answer,
      explanation: challenge.explanation,
      options: challenge.options,
      optionsEs: challenge.optionsEs,
      correctIndex: challenge.correctIndex,
      questionEs: challenge.questionEs,
      hintEs: challenge.hintEs,
      explanationEs: challenge.explanationEs,
    });
  }

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
      { userId: args.userId },
    );
    const concepts = await ctx.runQuery(
      internal.challengeHelpers.getConceptsByEntry,
      { entryId: args.entryId },
    );

    for (const concept of concepts) {
      try {
        await doGenerateChallenge(ctx, concept._id, challengeLevel);
      } catch (error) {
        console.error(
          `Pre-generation failed for concept ${concept._id}:`,
          error,
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
