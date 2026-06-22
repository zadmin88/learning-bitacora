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
    // Explicit term/definition pairs provided by the user at creation.
    // When present, reprocessing must recreate these instead of running
    // AI extraction over the content (which would pull words from the definition).
    // `kind` distinguishes plain vocabulary from grammar/structure concepts;
    // grammar concepts carry an optional `pattern` (e.g. "used to + base verb")
    // and `examples` model sentences.
    userConcepts: v.optional(
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
      dimensions: 3072,
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
    // Grammar/structure concepts: the slot pattern (e.g. "used to + base
    // verb") and model example sentences used to generate transform/contrast
    // drills. Empty for plain vocabulary.
    pattern: v.optional(v.string()),
    examples: v.optional(v.array(v.string())),
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

  // ─── Writing Coach: captured prompt↔correction samples ───
  // Ingested from outside the browser (Claude Code Stop hook, MCP clients) via
  // the /coach/ingest HTTP endpoint, authed by a per-user ingest key.
  writingSamples: defineTable({
    userId: v.id("users"),
    source: v.string(), // "claude-code" | "claude-desktop" | "cursor" | "mcp" | ...
    original: v.string(), // the user's prompt text
    corrected: v.optional(v.string()), // correction (from capture, or generated later)
    tips: v.optional(v.array(v.string())),
    errorTags: v.optional(v.array(v.string())), // reserved for future per-sample tagging
    analyzed: v.boolean(), // included in a writing review yet?
    reviewId: v.optional(v.id("writingReviews")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "createdAt"])
    .index("by_user_analyzed", ["userId", "analyzed"]),

  // ─── Writing Coach: weekly analysis results ───
  writingReviews: defineTable({
    userId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
    sampleCount: v.number(),
    summary: v.string(),
    patterns: v.array(
      v.object({
        category: v.string(), // e.g. "verb tenses", "prepositions"
        description: v.string(),
        examples: v.array(v.string()),
        frequency: v.number(),
      }),
    ),
    studyTopics: v.array(
      v.object({ topic: v.string(), why: v.string() }),
    ),
    createdAt: v.number(),
  }).index("by_user_date", ["userId", "createdAt"]),

  // ─── Writing Coach: per-user ingest keys (write-only ingestion auth) ───
  ingestKeys: defineTable({
    userId: v.id("users"),
    key: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_key", ["key"])
    .index("by_user", ["userId"]),

  // ─── Cached AI Challenges ───
  challengeCache: defineTable({
    conceptId: v.id("concepts"),
    challengeType: v.string(),
    challengeLevel: v.optional(v.string()),
    question: v.string(),
    hint: v.optional(v.string()),
    answer: v.string(),
    explanation: v.string(),
    // Multiple-choice "contrast" grammar drills: answer options plus the
    // 0-based index of the correct one. Empty for non-MCQ challenge types.
    options: v.optional(v.array(v.string())),
    optionsEs: v.optional(v.array(v.string())),
    correctIndex: v.optional(v.number()),
    questionEs: v.optional(v.string()),
    hintEs: v.optional(v.string()),
    explanationEs: v.optional(v.string()),
    generatedAt: v.number(),
  })
    .index("by_conceptId_and_challengeType_and_challengeLevel", ["conceptId", "challengeType", "challengeLevel"])
    .index("by_concept", ["conceptId"]),
});
