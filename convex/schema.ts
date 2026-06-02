import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // ─── User Profiles (extends auth users with app-specific data) ───
  profiles: defineTable({
    userId: v.id("users"),
    streak: v.number(),
    lastActiveDate: v.optional(v.string()),
    challengeLevel: v.optional(v.string()),
    showSpanish: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ─── Journal Entries ───
  entries: defineTable({
    userId: v.id("users"),
    content: v.string(),
    contentHtml: v.optional(v.string()),
    corrections: v.optional(v.any()),
    language: v.string(),
    source: v.string(),
    mood: v.optional(v.string()),
    praise: v.optional(v.string()),
    overallLevel: v.optional(v.string()),
    conceptCount: v.number(),
    processingError: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "createdAt"]),

  // ─── Entry Embeddings (separate table — Convex best practice) ───
  entryEmbeddings: defineTable({
    entryId: v.id("entries"),
    userId: v.id("users"),
    embedding: v.array(v.float64()),
  })
    .index("by_entry", ["entryId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768,
      filterFields: ["userId"],
    }),

  // ─── Concepts (extracted from entries) ───
  concepts: defineTable({
    userId: v.id("users"),
    entryId: v.optional(v.id("entries")),
    type: v.string(),
    term: v.string(),
    definition: v.optional(v.string()),
    context: v.string(),
    tags: v.array(v.string()),
    difficulty: v.number(),
    // FSRS state
    stability: v.number(),
    fsrsDifficulty: v.number(),
    elapsedDays: v.number(),
    scheduledDays: v.number(),
    reps: v.number(),
    lapses: v.number(),
    state: v.number(),
    nextReview: v.number(),
    lastReview: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_review", ["userId", "nextReview"])
    .index("by_user_type", ["userId", "type"])
    .index("by_entry", ["entryId"]),

  // ─── Review Events ───
  reviewEvents: defineTable({
    userId: v.id("users"),
    conceptId: v.id("concepts"),
    rating: v.number(),
    challengeType: v.string(),
    wasCorrect: v.boolean(),
    responseTime: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "createdAt"])
    .index("by_concept", ["conceptId"]),

  // ─── Cached AI Challenges ───
  challengeCache: defineTable({
    conceptId: v.id("concepts"),
    challengeType: v.string(),
    challengeLevel: v.optional(v.string()),
    question: v.string(),
    hint: v.optional(v.string()),
    answer: v.string(),
    explanation: v.string(),
    questionEs: v.optional(v.string()),
    hintEs: v.optional(v.string()),
    explanationEs: v.optional(v.string()),
    generatedAt: v.number(),
  })
    .index("by_conceptId_and_challengeType_and_challengeLevel", ["conceptId", "challengeType", "challengeLevel"])
    .index("by_concept", ["conceptId"]),
});
