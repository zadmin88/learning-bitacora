import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUser } from "./lib/utils";

// A term/definition pair provided explicitly by the user at entry creation.
// Grammar/structure concepts additionally carry a `pattern` and `examples`.
type UserConcept = {
  term: string;
  definition: string;
  kind?: string;
  pattern?: string;
  examples?: string[];
};

// Map a user-provided concept to the arguments for concepts.createFromExtraction.
// Grammar concepts become type "grammar" (carrying pattern/examples and an
// example-derived context); everything else stays plain "vocabulary".
function conceptToExtractionArgs(
  c: UserConcept,
  userId: Id<"users">,
  entryId: Id<"entries">,
) {
  const isGrammar = c.kind === "grammar";
  return {
    userId,
    entryId,
    type: isGrammar ? "grammar" : "vocabulary",
    term: c.term,
    definition: c.definition,
    context: isGrammar
      ? c.examples?.[0] || c.pattern || `${c.term}: ${c.definition}`
      : `${c.term}: ${c.definition}`,
    pattern: isGrammar ? c.pattern : undefined,
    examples: isGrammar ? c.examples : undefined,
    tags: [],
    difficulty: 3,
  };
}

export const create = mutation({
  args: {
    content: v.string(),
    language: v.optional(v.string()),
    mood: v.optional(v.string()),
    concepts: v.optional(
      v.array(
        v.object({
          term: v.string(),
          definition: v.string(),
          kind: v.optional(v.string()),
          pattern: v.optional(v.string()),
          examples: v.optional(v.array(v.string())),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const entryId = await ctx.db.insert("entries", {
      userId: user._id,
      content: args.content,
      language: args.language ?? "en",
      source: "text",
      mood: args.mood,
      conceptCount: args.concepts?.length ?? 0,
      userConcepts:
        args.concepts && args.concepts.length > 0 ? args.concepts : undefined,
      createdAt: Date.now(),
    });

    if (args.concepts && args.concepts.length > 0) {
      // User provided explicit terms — create concepts directly
      for (const concept of args.concepts) {
        await ctx.scheduler.runAfter(
          0,
          internal.concepts.createFromExtraction,
          conceptToExtractionArgs(concept, user._id, entryId),
        );
      }
    } else {
      // No explicit concepts — use AI extraction
      await ctx.scheduler.runAfter(0, internal.ai.extract.processEntry, {
        entryId,
        userId: user._id,
        content: args.content,
      });
    }

    if (!args.concepts || args.concepts.length === 0) {
      // Corrections only make sense for freeform journal writing —
      // a "term: definition" entry is the user's own gloss, not a
      // sentence to grammar-check
      await ctx.scheduler.runAfter(0, internal.ai.correct.checkEntry, {
        entryId,
        content: args.content,
      });
    }
    await ctx.scheduler.runAfter(0, internal.ai.embeddings.generateForEntry, {
      entryId,
      userId: user._id,
      content: args.content,
    });
    return entryId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    return entries;
  },
});

export const get = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== user._id) return null;
    // Also load concepts for this entry
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
    return { ...entry, concepts };
  },
});

export const remove = mutation({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== user._id) {
      throw new Error("Entry not found");
    }
    // Delete associated concepts
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
    for (const concept of concepts) {
      await ctx.db.delete(concept._id);
    }
    // Delete associated embeddings
    const embeddings = await ctx.db
      .query("entryEmbeddings")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
    for (const embedding of embeddings) {
      await ctx.db.delete(embedding._id);
    }
    await ctx.db.delete(args.entryId);
  },
});

export const update = mutation({
  args: {
    entryId: v.id("entries"),
    content: v.optional(v.string()),
    mood: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== user._id) {
      throw new Error("Entry not found");
    }

    const contentChanged =
      args.content !== undefined && args.content !== entry.content;

    // Build patch object
    const patch: Record<string, unknown> = {};
    if (args.content !== undefined) patch.content = args.content;
    if (args.mood !== undefined) patch.mood = args.mood;

    if (contentChanged) {
      // Clear stale AI fields
      patch.corrections = undefined;
      patch.praise = undefined;
      patch.overallLevel = undefined;
      patch.conceptCount = 0;
      // Content no longer matches the original term/definition pairs
      patch.userConcepts = undefined;

      // Delete existing concepts
      const concepts = await ctx.db
        .query("concepts")
        .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
        .collect();
      for (const concept of concepts) {
        await ctx.db.delete(concept._id);
      }

      // Delete existing embeddings
      const embeddings = await ctx.db
        .query("entryEmbeddings")
        .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
        .collect();
      for (const embedding of embeddings) {
        await ctx.db.delete(embedding._id);
      }
    }

    await ctx.db.patch(args.entryId, patch);

    if (contentChanged) {
      // Re-run AI processing
      const newContent = args.content!;
      await ctx.scheduler.runAfter(0, internal.ai.extract.processEntry, {
        entryId: args.entryId,
        userId: user._id,
        content: newContent,
      });
      await ctx.scheduler.runAfter(0, internal.ai.correct.checkEntry, {
        entryId: args.entryId,
        content: newContent,
      });
      await ctx.scheduler.runAfter(0, internal.ai.embeddings.generateForEntry, {
        entryId: args.entryId,
        userId: user._id,
        content: newContent,
      });
    }
  },
});

export const reprocess = mutation({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== user._id) {
      throw new Error("Entry not found");
    }

    // Clear error and stale AI fields
    await ctx.db.patch(args.entryId, {
      processingError: undefined,
      corrections: undefined,
      praise: undefined,
      overallLevel: undefined,
      conceptCount: 0,
    });

    // Delete existing concepts
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
    for (const concept of concepts) {
      await ctx.db.delete(concept._id);
    }

    // Delete existing embeddings
    const embeddings = await ctx.db
      .query("entryEmbeddings")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
    for (const embedding of embeddings) {
      await ctx.db.delete(embedding._id);
    }

    if (entry.userConcepts && entry.userConcepts.length > 0) {
      // Entry was created with explicit term/definition pairs — recreate
      // them directly instead of running AI extraction over the content
      for (const concept of entry.userConcepts) {
        await ctx.scheduler.runAfter(
          0,
          internal.concepts.createFromExtraction,
          conceptToExtractionArgs(concept, user._id, args.entryId),
        );
      }
      await ctx.db.patch(args.entryId, {
        conceptCount: entry.userConcepts.length,
      });
    } else {
      // Re-trigger AI extraction
      await ctx.scheduler.runAfter(0, internal.ai.extract.processEntry, {
        entryId: args.entryId,
        userId: user._id,
        content: entry.content,
      });
      // Corrections only make sense for freeform journal writing —
      // a "term: definition" entry is the user's own gloss, not a
      // sentence to grammar-check
      await ctx.scheduler.runAfter(0, internal.ai.correct.checkEntry, {
        entryId: args.entryId,
        content: entry.content,
      });
    }
    await ctx.scheduler.runAfter(0, internal.ai.embeddings.generateForEntry, {
      entryId: args.entryId,
      userId: user._id,
      content: entry.content,
    });
  },
});

export const setProcessingError = internalMutation({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (entry) {
      await ctx.db.patch(args.entryId, { processingError: true });
    }
  },
});

export const updateConceptCount = internalMutation({
  args: { entryId: v.id("entries"), count: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { conceptCount: args.count });
  },
});

export const listMockExtracted = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find concepts that were mock-extracted (have the mock definition marker)
    const mockConcepts = await ctx.db
      .query("concepts")
      .take(500);

    // Group by entryId and find entries with only mock concepts
    const entryIds = new Set<Id<"entries">>();
    for (const c of mockConcepts) {
      if (
        c.entryId &&
        c.definition === "Palabra encontrada en tu entrada"
      ) {
        entryIds.add(c.entryId);
      }
    }

    // Load entry data for each
    const entries: Array<{ entryId: Id<"entries">; userId: Id<"users">; content: string }> = [];
    for (const entryId of entryIds) {
      const entry = await ctx.db.get(entryId);
      if (entry) {
        entries.push({
          entryId: entry._id,
          userId: entry.userId,
          content: entry.content,
        });
      }
    }
    return entries;
  },
});

export const deleteMockConcepts = internalMutation({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();

    let deleted = 0;
    for (const c of concepts) {
      if (c.definition === "Palabra encontrada en tu entrada" ||
          (c.term === "sentence structure" && c.definition?.includes("SVO"))) {
        await ctx.db.delete(c._id);
        deleted++;
      }
    }
    return deleted;
  },
});

export const deleteAllConceptsByEntry = internalMutation({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();

    for (const c of concepts) {
      await ctx.db.delete(c._id);
    }
    return concepts.length;
  },
});

export const updateCorrections = internalMutation({
  args: {
    entryId: v.id("entries"),
    corrections: v.any(),
    praise: v.optional(v.string()),
    overallLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, {
      corrections: args.corrections,
      praise: args.praise,
      overallLevel: args.overallLevel,
    });
  },
});
