"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { SUGGESTION_SYSTEM_PROMPT } from "../lib/prompts";
import { getProvider } from "../lib/aiProvider";
import { Id } from "../_generated/dataModel";

interface Suggestion {
  term: string;
  translation: string;
  definition: string;
  exampleSentence: string;
  type: string;
  difficulty: number;
}

const MOCK_SUGGESTIONS: Record<string, Suggestion[]> = {
  travel: [
    { term: "layover", translation: "escala", definition: "A stop between flights during a journey", exampleSentence: "We had a three-hour layover in Miami.", type: "vocabulary", difficulty: 2 },
    { term: "get around", translation: "moverse/desplazarse", definition: "To travel from place to place within an area", exampleSentence: "The best way to get around the city is by subway.", type: "phrase", difficulty: 2 },
    { term: "off the beaten path", translation: "fuera de lo común", definition: "In a place that is not well known or frequently visited", exampleSentence: "We found a beautiful restaurant off the beaten path.", type: "idiom", difficulty: 4 },
    { term: "itinerary", translation: "itinerario", definition: "A planned route or list of places to visit during a trip", exampleSentence: "I made an itinerary for our week in Europe.", type: "vocabulary", difficulty: 3 },
    { term: "check in", translation: "registrarse", definition: "To register upon arrival at a hotel or airport", exampleSentence: "We need to check in at least two hours before the flight.", type: "phrase", difficulty: 1 },
  ],
  work: [
    { term: "deadline", translation: "fecha límite", definition: "The latest time by which something must be completed", exampleSentence: "The deadline for the report is next Friday.", type: "vocabulary", difficulty: 1 },
    { term: "put off", translation: "posponer", definition: "To delay or postpone something", exampleSentence: "Don't put off the meeting again.", type: "phrase", difficulty: 2 },
    { term: "burn the midnight oil", translation: "trabajar hasta tarde", definition: "To work late into the night", exampleSentence: "We burned the midnight oil to finish the project.", type: "idiom", difficulty: 4 },
    { term: "feedback", translation: "retroalimentación", definition: "Information about how well something has been done", exampleSentence: "My manager gave me positive feedback on my presentation.", type: "vocabulary", difficulty: 2 },
    { term: "take on", translation: "asumir/encargarse", definition: "To accept a task or responsibility", exampleSentence: "She took on three new projects this month.", type: "phrase", difficulty: 2 },
  ],
  general: [
    { term: "figure out", translation: "descifrar/resolver", definition: "To understand or solve something", exampleSentence: "I finally figured out how to use this app.", type: "phrase", difficulty: 2 },
    { term: "reliable", translation: "confiable", definition: "Consistently good; able to be trusted", exampleSentence: "She is a very reliable friend.", type: "vocabulary", difficulty: 2 },
    { term: "hit the nail on the head", translation: "dar en el clavo", definition: "To describe exactly what is causing a situation or problem", exampleSentence: "You hit the nail on the head with that observation.", type: "idiom", difficulty: 4 },
    { term: "approach", translation: "enfoque/acercarse", definition: "A way of dealing with something; to come near", exampleSentence: "We need a different approach to solve this problem.", type: "vocabulary", difficulty: 3 },
    { term: "keep in mind", translation: "tener en cuenta", definition: "To remember or consider something", exampleSentence: "Keep in mind that the store closes early on Sundays.", type: "phrase", difficulty: 2 },
  ],
};

export const generateSuggestions = action({
  args: {
    topic: v.string(),
    difficulty: v.string(),
  },
  handler: async (ctx, args): Promise<Suggestion[]> => {
    // Get current user
    const userId: Id<"users"> | null = await ctx.runQuery(
      internal.searchHelpers.getCurrentUserId
    );
    if (!userId) throw new Error("Not authenticated");

    // Get existing terms to exclude duplicates
    const existingTerms: string[] = await ctx.runQuery(
      internal.suggestions.getUserTerms,
      { userId }
    );

    const provider = getProvider();

    if (!provider) {
      console.log("No AI provider configured — using mock suggestions");
      const key = args.topic.toLowerCase();
      const suggestions = MOCK_SUGGESTIONS[key] || MOCK_SUGGESTIONS.general;
      // Filter out already-known terms
      const lowerTerms = new Set(existingTerms.map((t) => t.toLowerCase()));
      return suggestions.filter((s) => !lowerTerms.has(s.term.toLowerCase()));
    }

    try {
      const prompt = SUGGESTION_SYSTEM_PROMPT.replace(
        "{existingTerms}",
        existingTerms.length > 0 ? existingTerms.join(", ") : "(none)"
      );

      const text = await provider.generateText(
        prompt,
        `Topic: ${args.topic}\nDifficulty level: ${args.difficulty}\n\nSuggest 5 useful English words or phrases related to this topic at the specified difficulty level.`
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
          const key = args.topic.toLowerCase();
          return MOCK_SUGGESTIONS[key] || MOCK_SUGGESTIONS.general;
        }
      }

      // Post-generation dedup safety net
      const lowerTerms = new Set(existingTerms.map((t) => t.toLowerCase()));
      return suggestions.filter((s) => !lowerTerms.has(s.term.toLowerCase()));
    } catch (error: any) {
      if (error?.status === 429) {
        console.warn("AI API quota exceeded (429) — falling back to mock suggestions");
      } else {
        console.error("Error generating suggestions:", error);
      }
      const key = args.topic.toLowerCase();
      return MOCK_SUGGESTIONS[key] || MOCK_SUGGESTIONS.general;
    }
  },
});
