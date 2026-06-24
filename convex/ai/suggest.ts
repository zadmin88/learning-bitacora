"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { RECENT_BASED_SUGGESTION_SYSTEM_PROMPT } from "../lib/prompts";
import { getProvider } from "../lib/aiProvider";
import { Id } from "../_generated/dataModel";

interface Suggestion {
  term: string;
  translation: string;
  definition: string;
  exampleSentence: string;
  type: string;
  difficulty: number;
  // Short Spanish phrase explaining how this word links to a recent concept.
  // Absent on mock fallbacks (no real concept context to point at).
  connection?: string;
}

interface RecentConcept {
  term: string;
  definition: string;
  type: string;
  difficulty: number;
  tags: string[];
}

// Used only when no AI provider is configured or the API fails. There is no
// topic to key on anymore, so this is a single neutral fallback set.
const MOCK_SUGGESTIONS: Suggestion[] = [
  { term: "figure out", translation: "descifrar/resolver", definition: "To understand or solve something", exampleSentence: "I finally figured out how to use this app.", type: "phrase", difficulty: 2 },
  { term: "reliable", translation: "confiable", definition: "Consistently good; able to be trusted", exampleSentence: "She is a very reliable friend.", type: "vocabulary", difficulty: 2 },
  { term: "hit the nail on the head", translation: "dar en el clavo", definition: "To describe exactly what is causing a situation or problem", exampleSentence: "You hit the nail on the head with that observation.", type: "idiom", difficulty: 4 },
  { term: "approach", translation: "enfoque/acercarse", definition: "A way of dealing with something; to come near", exampleSentence: "We need a different approach to solve this problem.", type: "vocabulary", difficulty: 3 },
  { term: "keep in mind", translation: "tener en cuenta", definition: "To remember or consider something", exampleSentence: "Keep in mind that the store closes early on Sundays.", type: "phrase", difficulty: 2 },
];

function dedup(suggestions: Suggestion[], existingTerms: string[]): Suggestion[] {
  const lowerTerms = new Set(existingTerms.map((t) => t.toLowerCase()));
  return suggestions.filter((s) => !lowerTerms.has(s.term.toLowerCase()));
}

export const generateSuggestions = action({
  args: {},
  handler: async (ctx): Promise<Suggestion[]> => {
    // Get current user
    const userId: Id<"users"> | null = await ctx.runQuery(
      internal.searchHelpers.getCurrentUserId
    );
    if (!userId) throw new Error("Not authenticated");

    // Seed suggestions from the learner's most recent concepts.
    const recent: RecentConcept[] = await ctx.runQuery(
      internal.suggestions.getRecentConcepts,
      { userId, limit: 10 }
    );

    // Nothing learned yet — there's nothing to connect new words to.
    if (recent.length === 0) return [];

    // Get existing terms to exclude duplicates
    const existingTerms: string[] = await ctx.runQuery(
      internal.suggestions.getUserTerms,
      { userId }
    );

    // Auto-calibrate difficulty to the average of recent concepts.
    const avg =
      recent.reduce((sum, c) => sum + c.difficulty, 0) / recent.length;
    const targetDifficulty = Math.min(5, Math.max(1, Math.round(avg)));

    const provider = getProvider();

    if (!provider) {
      console.log("No AI provider configured — using mock suggestions");
      return dedup(MOCK_SUGGESTIONS, existingTerms);
    }

    const recentList = recent
      .map(
        (c, i) =>
          `${i + 1}. ${c.term} (${c.type}, difficulty ${c.difficulty})${
            c.tags.length > 0 ? ` — tags: ${c.tags.join(", ")}` : ""
          }`
      )
      .join("\n");

    try {
      const prompt = RECENT_BASED_SUGGESTION_SYSTEM_PROMPT.replace(
        "{existingTerms}",
        existingTerms.length > 0 ? existingTerms.join(", ") : "(none)"
      );

      const text = await provider.generateText(
        prompt,
        `The learner's most recently studied concepts (most recent first):\n${recentList}\n\nTarget difficulty: ${targetDifficulty}\n\nSuggest 5 new English words or phrases that connect to these recent concepts, at the target difficulty.`
      );

      let suggestions: Suggestion[];
      try {
        const sanitized = text.replace(/,\s*([}\]])/g, "$1");
        suggestions = JSON.parse(sanitized);
      } catch {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const cleaned = jsonMatch[0].replace(/,\s*([}\]])/g, "$1");
          suggestions = JSON.parse(cleaned);
        } else {
          console.error("Failed to parse suggestion response:", text);
          return dedup(MOCK_SUGGESTIONS, existingTerms);
        }
      }

      // Post-generation dedup safety net
      return dedup(suggestions, existingTerms);
    } catch (error: any) {
      if (error?.status === 429) {
        console.warn("AI API quota exceeded (429) — falling back to mock suggestions");
      } else {
        console.error("Error generating suggestions:", error);
      }
      return dedup(MOCK_SUGGESTIONS, existingTerms);
    }
  },
});
