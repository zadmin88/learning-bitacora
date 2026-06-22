"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { WRITING_ANALYSIS_PROMPT } from "../lib/prompts";
import { getProvider } from "../lib/aiProvider";
import { Id } from "../_generated/dataModel";

interface Pattern {
  category: string;
  description: string;
  examples: string[];
  frequency: number;
}
interface StudyTopic {
  topic: string;
  why: string;
}
interface AnalysisResult {
  summary: string;
  patterns: Pattern[];
  studyTopics: StudyTopic[];
}

type RunReviewResult =
  | { status: "no_samples" }
  | { status: "no_provider" }
  | { status: "error" }
  | { status: "done"; reviewId: Id<"writingReviews">; sampleCount: number };

// Analyze all of the current user's unanalyzed writing samples for recurring
// error patterns, store a writingReviews row, and turn the suggested study
// topics into grammar concepts that enter the FSRS review queue.
export const runReview = action({
  args: {},
  handler: async (ctx): Promise<RunReviewResult> => {
    const userId: Id<"users"> | null = await ctx.runQuery(
      internal.searchHelpers.getCurrentUserId,
    );
    if (!userId) throw new Error("Not authenticated");

    const samples = await ctx.runQuery(internal.coach.getUnanalyzedSamples, {
      userId,
    });
    if (samples.length === 0) return { status: "no_samples" };

    const provider = getProvider();
    if (!provider) {
      console.log("No AI provider configured — skipping writing review");
      return { status: "no_provider" };
    }

    const payload = samples.map((s) => ({
      original: s.original,
      corrected: s.corrected ?? "",
      tips: s.tips ?? [],
    }));

    let text: string;
    try {
      text = await provider.generateText(
        WRITING_ANALYSIS_PROMPT,
        `Analyze these ${payload.length} writing samples:\n\n${JSON.stringify(
          payload,
        )}`,
      );
    } catch (aiError: unknown) {
      if ((aiError as { status?: number })?.status === 429) {
        console.warn("AI API quota exceeded (429) — skipping writing review");
        return { status: "error" };
      }
      throw aiError;
    }

    let result: AnalysisResult;
    try {
      const sanitized = text.replace(/,\s*([}\]])/g, "$1");
      result = JSON.parse(sanitized);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const cleaned = jsonMatch[0].replace(/,\s*([}\]])/g, "$1");
        result = JSON.parse(cleaned);
      } else {
        console.error("Failed to parse writing analysis response:", text);
        return { status: "error" };
      }
    }

    const timestamps = samples.map((s) => s.createdAt);
    const reviewId: Id<"writingReviews"> = await ctx.runMutation(
      internal.coach.saveReview,
      {
        userId,
        periodStart: Math.min(...timestamps),
        periodEnd: Math.max(...timestamps),
        sampleIds: samples.map((s) => s._id),
        summary: result.summary ?? "",
        patterns: Array.isArray(result.patterns) ? result.patterns : [],
        studyTopics: Array.isArray(result.studyTopics)
          ? result.studyTopics
          : [],
      },
    );

    return { status: "done", reviewId, sampleCount: samples.length };
  },
});
