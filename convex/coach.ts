import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./lib/utils";

// Shape of the analysis payload, shared by the schema and saveReview.
const patternValidator = v.object({
  category: v.string(),
  description: v.string(),
  examples: v.array(v.string()),
  frequency: v.number(),
});
const studyTopicValidator = v.object({ topic: v.string(), why: v.string() });

// ─── Ingest key management (Settings UI) ───

export const getKey = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    const existing = await ctx.db
      .query("ingestKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    // Never return the secret itself — it is only shown once at creation time.
    // Presence of this object signals "a key exists"; the full value is only
    // returned by generateKey.
    return existing
      ? { createdAt: existing.createdAt, lastUsedAt: existing.lastUsedAt ?? null }
      : null;
  },
});

export const generateKey = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    // Rotate: remove any existing keys for this user, then issue a fresh one.
    const existing = await ctx.db
      .query("ingestKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const k of existing) await ctx.db.delete(k._id);

    const key = `coach_${crypto.randomUUID().replace(/-/g, "")}${crypto
      .randomUUID()
      .replace(/-/g, "")}`;
    await ctx.db.insert("ingestKeys", {
      userId: user._id,
      key,
      createdAt: Date.now(),
    });
    return key;
  },
});

// ─── Sample ingestion (called by the HTTP endpoint) ───

export const resolveKeyAndAdd = internalMutation({
  args: {
    key: v.string(),
    source: v.string(),
    original: v.string(),
    corrected: v.optional(v.string()),
    tips: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const keyRow = await ctx.db
      .query("ingestKeys")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!keyRow) return false;

    await ctx.db.insert("writingSamples", {
      userId: keyRow.userId,
      source: args.source || "unknown",
      original: args.original,
      corrected: args.corrected,
      tips: args.tips,
      analyzed: false,
      createdAt: Date.now(),
    });
    await ctx.db.patch(keyRow._id, { lastUsedAt: Date.now() });
    return true;
  },
});

// ─── Reads for the /coach page ───

export const listSamples = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    return await ctx.db
      .query("writingSamples")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

export const getSampleStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    // Bounded counts — fine for a personal app; capped at 500 for safety.
    const recent = await ctx.db
      .query("writingSamples")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(500);
    const unanalyzed = recent.filter((s) => !s.analyzed).length;
    return { total: recent.length, unanalyzed };
  },
});

export const getLatestReview = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    return await ctx.db
      .query("writingReviews")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
  },
});

export const listReviews = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    return await ctx.db
      .query("writingReviews")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
  },
});

// ─── Internal helpers for the runReview action ───

export const getUnanalyzedSamples = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("writingSamples")
      .withIndex("by_user_analyzed", (q) =>
        q.eq("userId", args.userId).eq("analyzed", false),
      )
      .take(200);
  },
});

export const saveReview = internalMutation({
  args: {
    userId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
    sampleIds: v.array(v.id("writingSamples")),
    summary: v.string(),
    patterns: v.array(patternValidator),
    studyTopics: v.array(studyTopicValidator),
  },
  handler: async (ctx, args) => {
    const reviewId = await ctx.db.insert("writingReviews", {
      userId: args.userId,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      sampleCount: args.sampleIds.length,
      summary: args.summary,
      patterns: args.patterns,
      studyTopics: args.studyTopics,
      createdAt: Date.now(),
    });

    // Mark the analyzed samples so they aren't re-processed next run.
    for (const id of args.sampleIds) {
      await ctx.db.patch(id, { analyzed: true, reviewId });
    }

    // Feed each study topic into the FSRS review system as a grammar concept,
    // due immediately so it surfaces in /review. Mirrors concepts.createFromExtraction.
    for (const topic of args.studyTopics) {
      await ctx.db.insert("concepts", {
        userId: args.userId,
        entryId: undefined,
        type: "grammar",
        term: topic.topic,
        definition: topic.why,
        context: "",
        tags: ["writing-coach"],
        difficulty: 3,
        stability: 0,
        fsrsDifficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: 0, // New
        nextReview: Date.now(), // Due immediately
        lastReview: undefined,
        createdAt: Date.now(),
      });
    }

    return reviewId;
  },
});
