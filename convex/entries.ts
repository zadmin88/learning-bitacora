import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUser } from "./lib/utils";

export const create = mutation({
  args: {
    content: v.string(),
    language: v.optional(v.string()),
    mood: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const entryId = await ctx.db.insert("entries", {
      userId: user._id,
      content: args.content,
      language: args.language ?? "en",
      source: "text",
      mood: args.mood,
      conceptCount: 0,
      createdAt: Date.now(),
    });
    // Fire-and-forget AI processing
    await ctx.scheduler.runAfter(0, internal.ai.extract.processEntry, {
      entryId,
      userId: user._id,
      content: args.content,
    });
    await ctx.scheduler.runAfter(0, internal.ai.correct.checkEntry, {
      entryId,
      content: args.content,
    });
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

export const updateConceptCount = internalMutation({
  args: { entryId: v.id("entries"), count: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { conceptCount: args.count });
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
