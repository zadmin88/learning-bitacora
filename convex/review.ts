import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./lib/utils";
import { fsrs, Rating } from "ts-fsrs";

export const getQueue = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    const now = Date.now();
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_user_review", (q) =>
        q.eq("userId", user._id).lte("nextReview", now)
      )
      .take(20);

    // Load parent entry content for context
    const conceptsWithContext = await Promise.all(
      concepts.map(async (concept) => {
        const entry = concept.entryId ? await ctx.db.get(concept.entryId) : null;
        return {
          ...concept,
          entryContent: entry?.content ?? "",
        };
      })
    );

    return conceptsWithContext;
  },
});

export const getQueueCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    const now = Date.now();
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_user_review", (q) =>
        q.eq("userId", user._id).lte("nextReview", now)
      )
      .collect();
    return concepts.length;
  },
});

export const submitReview = mutation({
  args: {
    conceptId: v.id("concepts"),
    rating: v.number(),
    challengeType: v.string(),
    wasCorrect: v.boolean(),
    responseTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const concept = await ctx.db.get(args.conceptId);
    if (!concept || concept.userId !== user._id) {
      throw new Error("Concept not found");
    }

    const f = fsrs({ request_retention: 0.95 });

    // Build card from concept state
    const card = {
      due: new Date(concept.nextReview),
      stability: concept.stability,
      difficulty: concept.fsrsDifficulty,
      elapsed_days: concept.elapsedDays,
      scheduled_days: concept.scheduledDays,
      reps: concept.reps,
      lapses: concept.lapses,
      state: concept.state as 0 | 1 | 2 | 3,
      last_review: concept.lastReview
        ? new Date(concept.lastReview)
        : undefined,
    };

    const ratingMap: Record<number, number> = {
      1: Rating.Again,
      2: Rating.Hard,
      3: Rating.Good,
      4: Rating.Easy,
    };

    const now = new Date();
    const grade = ratingMap[args.rating] as typeof Rating.Again;
    const result = f.next(card as any, now, grade);
    const updated = result.card;

    // Patch concept with new FSRS state
    await ctx.db.patch(args.conceptId, {
      stability: updated.stability,
      fsrsDifficulty: updated.difficulty,
      elapsedDays: updated.elapsed_days,
      scheduledDays: updated.scheduled_days,
      reps: updated.reps,
      lapses: updated.lapses,
      state: updated.state,
      nextReview: updated.due.getTime(),
      lastReview: now.getTime(),
    });

    // Log review event
    await ctx.db.insert("reviewEvents", {
      userId: user._id,
      conceptId: args.conceptId,
      rating: args.rating,
      challengeType: args.challengeType,
      wasCorrect: args.wasCorrect,
      responseTime: args.responseTime,
      createdAt: now.getTime(),
    });
  },
});
