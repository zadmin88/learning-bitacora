import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./lib/utils";
import { fsrs, Rating } from "ts-fsrs";

// Concepts created by the writing coach carry this tag. They study a different
// skill (writing/grammar patterns) than manually-added or journal vocabulary,
// so the review queue is split into two tracks keyed off it.
export const WRITING_COACH_TAG = "writing-coach";

const trackArg = v.optional(v.union(v.literal("vocab"), v.literal("writing")));

function trackOf(tags: string[] | undefined): "vocab" | "writing" {
  return tags?.includes(WRITING_COACH_TAG) ? "writing" : "vocab";
}

export const getQueue = query({
  args: { track: trackArg },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const now = Date.now();
    const due = await ctx.db
      .query("concepts")
      .withIndex("by_user_review", (q) =>
        q.eq("userId", user._id).lte("nextReview", now)
      )
      .collect();

    // Index returns the soonest-due first; keep that order within the track.
    const selected = (
      args.track ? due.filter((c) => trackOf(c.tags) === args.track) : due
    ).slice(0, 20);

    // Load parent entry content for context
    const conceptsWithContext = await Promise.all(
      selected.map(async (concept) => {
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
  args: { track: trackArg },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const now = Date.now();
    const due = await ctx.db
      .query("concepts")
      .withIndex("by_user_review", (q) =>
        q.eq("userId", user._id).lte("nextReview", now)
      )
      .collect();
    if (!args.track) return due.length;
    return due.filter((c) => trackOf(c.tags) === args.track).length;
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
