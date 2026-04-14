import { query } from "./_generated/server";
import { getAuthUser } from "./lib/utils";

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const reviews = await ctx.db
      .query("reviewEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const correctReviews = reviews.filter((r) => r.wasCorrect).length;
    const accuracy =
      reviews.length > 0
        ? Math.round((correctReviews / reviews.length) * 100)
        : 0;

    // Concepts by FSRS state
    const mastered = concepts.filter((c) => c.state >= 2 && c.stability > 10).length;

    return {
      totalEntries: entries.length,
      totalConcepts: concepts.length,
      masteredConcepts: mastered,
      totalReviews: reviews.length,
      accuracy,
      streak: profile?.streak ?? 0,
    };
  },
});

export const getReviewHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const reviews = await ctx.db
      .query("reviewEvents")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("createdAt", thirtyDaysAgo)
      )
      .collect();

    // Group by day
    const byDay: Record<string, { count: number; correct: number }> = {};
    for (const review of reviews) {
      const day = new Date(review.createdAt).toISOString().split("T")[0];
      if (!byDay[day]) byDay[day] = { count: 0, correct: 0 };
      byDay[day].count++;
      if (review.wasCorrect) byDay[day].correct++;
    }

    return Object.entries(byDay)
      .map(([date, { count, correct }]) => ({
        date,
        count,
        accuracy: Math.round((correct / count) * 100),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const getConceptBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const byType: Record<string, number> = {};
    const byState: Record<string, number> = {
      new: 0,
      learning: 0,
      review: 0,
      relearning: 0,
    };

    for (const concept of concepts) {
      byType[concept.type] = (byType[concept.type] || 0) + 1;
      const stateNames = ["new", "learning", "review", "relearning"];
      const stateName = stateNames[concept.state] || "new";
      byState[stateName]++;
    }

    return { byType, byState };
  },
});
