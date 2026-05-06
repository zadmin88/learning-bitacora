"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { EXTRACTION_SYSTEM_PROMPT } from "../lib/prompts";
import { getProvider } from "../lib/aiProvider";

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

export const reprocessMockEntries = internalAction({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.runMutation(internal.entries.listMockExtracted, {});
    console.log(`Found ${entries.length} entries with mock-extracted concepts`);

    let reprocessed = 0;
    for (const entry of entries) {
      // Delete old mock concepts
      await ctx.runMutation(internal.entries.deleteMockConcepts, {
        entryId: entry.entryId!,
      });
      // Re-run AI extraction
      await ctx.runAction(internal.ai.extract.processEntry, {
        entryId: entry.entryId!,
        userId: entry.userId,
        content: entry.content,
      });
      reprocessed++;
    }

    console.log(`Reprocessed ${reprocessed} entries`);
    return { reprocessed };
  },
});

// Reprocess ALL entries: deletes old concepts, re-extracts, re-corrects, re-embeds
export const reprocessAllEntries = internalAction({
  args: {},
  handler: async (ctx) => {
    const entries: Array<{
      _id: string;
      userId: string;
      content: string;
    }> = await ctx.runQuery(internal.searchHelpers.getAllEntries);

    console.log(`Reprocessing ${entries.length} entries (extract + correct + embed)...`);

    let processed = 0;
    for (const entry of entries) {
      const entryId = entry._id as any;
      const userId = entry.userId as any;

      // 1. Delete old concepts for this entry
      await ctx.runMutation(internal.entries.deleteAllConceptsByEntry, {
        entryId,
      });

      // 2. Re-extract concepts
      await ctx.runAction(internal.ai.extract.processEntry, {
        entryId,
        userId,
        content: entry.content,
      });

      // 3. Re-run corrections
      await ctx.runAction(internal.ai.correct.checkEntry, {
        entryId,
        content: entry.content,
      });

      // 4. Re-generate embedding
      await ctx.runAction(internal.ai.embeddings.generateForEntry, {
        entryId,
        userId,
        content: entry.content,
      });

      processed++;
      console.log(`Processed ${processed}/${entries.length}`);
    }

    console.log(`Done. Reprocessed ${processed} entries.`);
    return { processed };
  },
});

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

      const provider = getProvider();
      if (provider) {
        try {
          const text = await provider.generateText(
            EXTRACTION_SYSTEM_PROMPT,
            `Analyze this language learner's entry and extract only the main concept(s) the learner is studying:\n\n${args.content}`
          );

          try {
            const sanitized = text.replace(/,\s*([}\]])/g, "$1");
            concepts = JSON.parse(sanitized);
          } catch {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const cleaned = jsonMatch[0].replace(/,\s*([}\]])/g, "$1");
              concepts = JSON.parse(cleaned);
            } else {
              console.error("Failed to parse extraction response:", text);
              return;
            }
          }
        } catch (aiError: any) {
          if (aiError?.status === 429) {
            console.warn(
              "AI API quota exceeded (429) — falling back to mock extraction"
            );
            concepts = extractMockConcepts(args.content);
          } else {
            throw aiError;
          }
        }
      } else {
        // Mock mode for testing without API key
        console.log("No AI provider configured — using mock extraction");
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

      // Pre-generate challenges in background
      await ctx.scheduler.runAfter(
        0,
        internal.ai.challenge.preGenerateForEntry,
        {
          entryId: args.entryId,
          userId: args.userId,
        }
      );
    } catch (error) {
      console.error("Error processing entry:", error);
    }
  },
});
