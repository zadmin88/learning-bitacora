# Bitácora — Development Plan (Convex)

> **Your English learning memory, powered by AI.**
> An AI-powered learning journal that fights the forgetting curve with spaced repetition, active recall, and semantic search over your personal learning history.

---

## 1. Project Overview

### The Problem
- 70% of newly learned information is forgotten within 24 hours (Ebbinghaus, 1885)
- Education apps have a 2% user retention rate by day 30
- 42% of language learners quit due to lack of motivation; 64% hit plateaus and give up
- Existing tools (Anki, Duolingo) use pre-made or decontextualized content that strips personal meaning

### The Solution
A learning journal where users write about what they learn in English each day. AI extracts concepts, schedules spaced reviews using active recall challenges generated from the user's own entries, and provides semantic search over their entire learning history.

### Core Differentiators
1. **Persistent personal knowledge base** — unlike ChatGPT, it remembers everything across sessions
2. **Proactive scheduling** — it tells YOU when to review, not the other way around
3. **Context-rich recall** — challenges come from your own writing, not generic flashcards
4. **Reflective writing as learning** — the act of journaling itself improves retention (research-backed)

### Architecture Strategy
**Convex-first** — Ship the MVP fast using Convex (DB, backend functions, vector search, scheduling). Frontend on Next.js deployed to Vercel. Once validated, optionally rebuild the backend in FastAPI + PostgreSQL on a VPS as a learning exercise.

---

## 2. Tech Stack

| Layer            | Technology                              | Reason                                              |
| ---------------- | --------------------------------------- | --------------------------------------------------- |
| **Frontend**     | Next.js 14+ (App Router)               | SSR, file-based routing, great Convex integration   |
| **Styling**      | Tailwind CSS                            | Rapid iteration, design tokens                      |
| **UI Components**| shadcn/ui                               | Accessible, customizable, consistent                |
| **Backend + DB** | Convex                                  | Real-time DB, serverless functions, vector search, scheduler — all in one |
| **Auth**         | Convex Auth (built-in) or Clerk         | Seamless integration with Convex                    |
| **AI**           | Anthropic Claude API (`claude-sonnet-4-20250514`) | Extraction, challenge generation, correction |
| **Embeddings**   | OpenAI `text-embedding-3-small`         | Generate vectors for Convex vector search            |
| **Spaced Rep**   | FSRS algorithm (`ts-fsrs`)              | State-of-the-art spaced repetition, runs inside Convex mutations |
| **Frontend Deploy** | Vercel                               | Zero-config Next.js deploy                          |
| **Package Mgr**  | pnpm                                    | Fast, disk-efficient                                |

---

## 3. Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users ───
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
    streak: v.number(),
    lastActiveDate: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

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
      dimensions: 1536,
      filterFields: ["userId"],
    }),

  // ─── Concepts (extracted from entries) ───
  concepts: defineTable({
    userId: v.id("users"),
    entryId: v.id("entries"),
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
    question: v.string(),
    hint: v.optional(v.string()),
    answer: v.string(),
    explanation: v.string(),
    generatedAt: v.number(),
  })
    .index("by_concept_type", ["conceptId", "challengeType"]),
});
```

---

## 4. Project Structure

```
bitacora/
├── convex/                           # Convex backend
│   ├── schema.ts                     # Database schema
│   ├── auth.ts                       # Auth configuration
│   ├── _generated/                   # Auto-generated (don't edit)
│   ├── entries.ts                    # Entry CRUD mutations + queries
│   ├── concepts.ts                   # Concept queries + internal mutations
│   ├── review.ts                     # Review queue query + submit mutation
│   ├── search.ts                     # Semantic search action
│   ├── stats.ts                      # Progress stats queries
│   ├── ai/
│   │   ├── extract.ts                # Claude: extract concepts from entry
│   │   ├── challenge.ts              # Claude: generate review challenges
│   │   ├── correct.ts                # Claude: writing correction
│   │   └── embeddings.ts             # OpenAI: generate entry embeddings
│   ├── lib/
│   │   ├── fsrs.ts                   # FSRS algorithm wrapper
│   │   ├── prompts.ts                # All AI prompt templates
│   │   └── utils.ts                  # Shared helpers
│   └── crons.ts                      # Scheduled jobs
│
├── src/                              # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx                # Root layout (ConvexProvider, fonts, theme)
│   │   ├── page.tsx                  # Landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── (dashboard)/
│   │       ├── layout.tsx            # Dashboard shell (sidebar, auth guard)
│   │       ├── page.tsx              # Home: summary, due reviews, recent entries
│   │       ├── journal/
│   │       │   ├── page.tsx          # Journal timeline
│   │       │   └── new/page.tsx      # New entry editor
│   │       ├── review/
│   │       │   └── page.tsx          # Review session
│   │       ├── explore/
│   │       │   └── page.tsx          # AI search
│   │       ├── progress/
│   │       │   └── page.tsx          # Stats dashboard
│   │       └── settings/
│   │           └── page.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn components
│   │   ├── providers/
│   │   │   └── ConvexProvider.tsx
│   │   ├── journal/
│   │   │   ├── EntryEditor.tsx
│   │   │   ├── EntryCard.tsx         # With fading ink effect
│   │   │   ├── EntryTimeline.tsx
│   │   │   ├── ConceptBadge.tsx
│   │   │   └── CorrectionHighlight.tsx
│   │   ├── review/
│   │   │   ├── ReviewSession.tsx
│   │   │   ├── ChallengeCard.tsx
│   │   │   ├── FillGapChallenge.tsx
│   │   │   ├── FreeRecallChallenge.tsx
│   │   │   ├── ErrorCorrectionChallenge.tsx
│   │   │   ├── RatingButtons.tsx
│   │   │   └── ReviewSummary.tsx
│   │   ├── explore/
│   │   │   ├── SearchBar.tsx
│   │   │   └── SearchResults.tsx
│   │   ├── progress/
│   │   │   ├── StatsOverview.tsx
│   │   │   ├── ForgettingCurveChart.tsx
│   │   │   ├── KnowledgeGarden.tsx
│   │   │   └── WeeklyDigest.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── TopBar.tsx
│   │       └── MobileNav.tsx
│   ├── hooks/
│   │   ├── useCurrentUser.ts
│   │   ├── useReviewQueue.ts
│   │   └── useSearch.ts
│   └── lib/
│       ├── utils.ts
│       └── constants.ts
│
├── public/fonts/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. Key Backend Implementation

### 5a. Entry Creation (mutation + scheduled AI processing)

```typescript
// convex/entries.ts
export const create = mutation({
  args: { content: v.string(), language: v.optional(v.string()), mood: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const entryId = await ctx.db.insert("entries", {
      userId: user._id, content: args.content, language: args.language ?? "en",
      source: "text", mood: args.mood, conceptCount: 0, createdAt: Date.now(),
    });
    // Fire-and-forget AI processing
    await ctx.scheduler.runAfter(0, internal.ai.extract.processEntry, { entryId, userId: user._id, content: args.content });
    await ctx.scheduler.runAfter(0, internal.ai.correct.checkEntry, { entryId, content: args.content });
    await ctx.scheduler.runAfter(0, internal.ai.embeddings.generateForEntry, { entryId, userId: user._id, content: args.content });
    return entryId;
  },
});
```

### 5b. AI Extraction (action → creates concepts)

```typescript
// convex/ai/extract.ts
"use node";
export const processEntry = internalAction({
  args: { entryId: v.id("entries"), userId: v.id("users"), content: v.string() },
  handler: async (ctx, args) => {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 2000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analyze this journal entry:\n\n${args.content}` }],
    });
    const concepts = JSON.parse(response.content[0].text);
    for (const c of concepts) {
      await ctx.runMutation(internal.concepts.createFromExtraction, {
        userId: args.userId, entryId: args.entryId,
        type: c.type, term: c.term, definition: c.definition ?? "",
        context: c.context ?? "", tags: c.tags ?? [], difficulty: c.difficulty ?? 3,
      });
    }
    await ctx.runMutation(internal.entries.updateConceptCount, { entryId: args.entryId, count: concepts.length });
  },
});
```

### 5c. FSRS Review Submission (mutation)

```typescript
// convex/review.ts
export const submitReview = mutation({
  args: { conceptId: v.id("concepts"), rating: v.number(), challengeType: v.string(), wasCorrect: v.boolean() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const concept = await ctx.db.get(args.conceptId);
    // Build FSRS card from current state → process rating → get updated card
    const card = buildFSRSCard(concept);
    const ratingMap = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Easy };
    const result = f.repeat(card, new Date());
    const updated = result[ratingMap[args.rating]].card;
    // Patch concept with new FSRS state
    await ctx.db.patch(args.conceptId, {
      stability: updated.stability, fsrsDifficulty: updated.difficulty,
      elapsedDays: updated.elapsed_days, scheduledDays: updated.scheduled_days,
      reps: updated.reps, lapses: updated.lapses, state: updated.state,
      nextReview: updated.due.getTime(), lastReview: Date.now(),
    });
    // Log review event
    await ctx.db.insert("reviewEvents", {
      userId: user._id, conceptId: args.conceptId, rating: args.rating,
      challengeType: args.challengeType, wasCorrect: args.wasCorrect, createdAt: Date.now(),
    });
  },
});
```

### 5d. Semantic Search (action — vector search + Claude)

```typescript
// convex/search.ts
"use node";
export const semanticSearch = action({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    // 1. Embed query
    const embedding = await openai.embeddings.create({ model: "text-embedding-3-small", input: args.query });
    // 2. Vector search
    const results = await ctx.vectorSearch("entryEmbeddings", "by_embedding", {
      vector: embedding.data[0].embedding, limit: 8,
      filter: (q) => q.eq("userId", user._id),
    });
    // 3. Load entries
    const entries = await loadEntriesFromEmbeddingResults(ctx, results);
    // 4. Claude generates conversational answer from entries
    const answer = await generateSearchAnswer(args.query, entries);
    return { answer, entries };
  },
});
```

---

## 6. AI Prompt Templates

```typescript
// convex/lib/prompts.ts

export const EXTRACTION_SYSTEM_PROMPT = `You are an expert ESL/EFL teacher analyzing a language learner's journal entry.
Extract every learnable concept. For each concept return a JSON object with:
- type: "vocabulary" | "phrase" | "grammar" | "idiom" | "error" | "cultural"
- term: the word, phrase, or rule
- definition: clear, simple explanation
- context: the exact sentence from the entry where it appears
- tags: 1-3 topic tags (e.g., "food", "work", "travel", "emotions")
- difficulty: 1-5 (1=beginner, 5=advanced)
Also identify English errors as type "error" with the corrected version in definition.
Return ONLY a valid JSON array. No markdown, no explanation.`;

export const CORRECTION_SYSTEM_PROMPT = `You are a friendly, encouraging English tutor reviewing a journal entry
written by a Spanish-speaking English learner.
For each error: { "original", "corrected", "explanation", "severity": "minor"|"moderate"|"important" }
Return ONLY valid JSON: { "corrections": [...], "praise": "...", "overallLevel": "beginner"|"intermediate"|"advanced" }`;

export const CHALLENGE_SYSTEM_PROMPT = `You generate active recall challenges for English language learners.
Return ONLY valid JSON: { "question": "...", "hint": "...", "answer": "...", "explanation": "..." }`;

export const SEARCH_SYSTEM_PROMPT = `You are a helpful learning assistant. The user is searching their personal English learning journal.
Answer based on the journal entries provided. Reference entries by date. Be warm and encouraging.
If the user writes in Spanish, respond in Spanish.`;
```

---

## 7. Implementation Phases

### Phase 1 — Foundation (Week 1)
**Goal**: Auth, entry creation, AI extraction, journal timeline.

| # | Task | Files |
|---|------|-------|
| 1 | Project setup (Next.js + Convex + shadcn) | configs |
| 2 | Convex schema with all tables + indexes | `convex/schema.ts` |
| 3 | Auth setup (Clerk or Convex Auth) | `convex/auth.ts`, auth pages |
| 4 | Dashboard layout (sidebar, nav, mobile) | `(dashboard)/layout.tsx`, layout components |
| 5 | Entry editor with writing prompts | `journal/new/page.tsx`, `EntryEditor.tsx` |
| 6 | Entry creation mutation + AI scheduling | `convex/entries.ts` |
| 7 | AI extraction action | `convex/ai/extract.ts` |
| 8 | AI correction action | `convex/ai/correct.ts` |
| 9 | Embedding generation action | `convex/ai/embeddings.ts` |
| 10 | Journal timeline (reactive, real-time) | `journal/page.tsx`, `EntryTimeline.tsx` |
| 11 | Entry detail with corrections + concepts | `EntryCard.tsx`, `CorrectionHighlight.tsx` |

**Milestone**: Write entry → concepts + corrections appear in real-time.

### Phase 2 — Review Engine (Week 2)
**Goal**: Spaced repetition review sessions.

| # | Task | Files |
|---|------|-------|
| 1 | FSRS wrapper | `convex/lib/fsrs.ts` |
| 2 | Review queue query | `convex/review.ts` → `getQueue` |
| 3 | Challenge generation action + caching | `convex/ai/challenge.ts` |
| 4 | ReviewSession flow component | `ReviewSession.tsx` |
| 5 | Challenge type components (3 types) | `FillGap`, `FreeRecall`, `ErrorCorrection` |
| 6 | Rating buttons + submit mutation | `RatingButtons.tsx`, `convex/review.ts` → `submitReview` |
| 7 | Review summary screen | `ReviewSummary.tsx` |
| 8 | Dashboard "due reviews" widget | `(dashboard)/page.tsx` |

**Milestone**: Complete review session → FSRS updates → next review dates adjust.

### Phase 3 — Search & Discovery (Week 3)
**Goal**: Semantic search + concept browser.

| # | Task | Files |
|---|------|-------|
| 1 | Semantic search action | `convex/search.ts` |
| 2 | Search UI (input + results) | `explore/page.tsx`, `SearchBar.tsx`, `SearchResults.tsx` |
| 3 | Concept browser with filters | `concepts/page.tsx` or within explore |
| 4 | Quick search in top nav | `TopBar.tsx` |

**Milestone**: Ask natural language questions about your learning history.

### Phase 4 — Progress & Motivation (Week 4)
**Goal**: Visual progress, fading ink, engagement.

| # | Task | Files |
|---|------|-------|
| 1 | Stats queries (totals, accuracy, streaks) | `convex/stats.ts` |
| 2 | StatsOverview cards | `StatsOverview.tsx` |
| 3 | Fading ink CSS effect on entries | `EntryCard.tsx` |
| 4 | Forgetting curve chart | `ForgettingCurveChart.tsx` (recharts) |
| 5 | Knowledge garden visualization | `KnowledgeGarden.tsx` |
| 6 | Weekly digest | `WeeklyDigest.tsx` |
| 7 | Streak tracking + crons | `convex/crons.ts` |
| 8 | Smart entry prompts | `EntryEditor.tsx` |

**Milestone**: Open app → see fading entries, streak, progress garden.

### Phase 5 — Polish & Deploy (Week 5)
**Goal**: Production-ready.

| # | Task |
|---|------|
| 1 | Responsive design (mobile-first review) |
| 2 | Loading states, error boundaries, skeletons |
| 3 | Onboarding flow (first-time user) |
| 4 | Empty states for all views |
| 5 | PWA manifest + offline draft storage |
| 6 | Deploy: Vercel (frontend) + Convex Cloud (backend) |
| 7 | Landing page with value prop |
| 8 | Seed data / demo account |

---

## 8. Environment Variables

```env
# .env.local (Next.js)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Convex env vars (set via CLI):
# npx convex env set ANTHROPIC_API_KEY sk-ant-...
# npx convex env set OPENAI_API_KEY sk-...
```

---

## 9. Dependencies

```json
{
  "dependencies": {
    "next": "^14.2", "react": "^18.3", "react-dom": "^18.3",
    "convex": "^1.17", "ts-fsrs": "^4.x",
    "@anthropic-ai/sdk": "^0.30", "openai": "^4.x",
    "recharts": "^2.x", "tailwindcss": "^3.4",
    "class-variance-authority": "^0.7", "clsx": "^2.x",
    "tailwind-merge": "^2.x", "lucide-react": "^0.400", "date-fns": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x", "@types/react": "^18.x", "@types/node": "^20.x",
    "eslint": "^8.x", "eslint-config-next": "^14.x"
  }
}
```

---

## 10. Design Direction: "Warm Editorial Notebook"

- **Typography**: Serif display (Lora / Playfair Display) + sans body (Source Sans 3)
- **Colors**: cream `#FBF7F0`, charcoal `#2D2A26`, terracotta `#C4653A`, sage `#6B8F71`
- **Effects**: Paper texture, ink-fade animations, gentle page transitions
- **Layout**: Single-column journal, generous whitespace

---

## 11. Claude Code Quick-Start

```bash
pnpm create next-app@latest bitacora --typescript --tailwind --eslint --app --src-dir
cd bitacora
pnpm add convex ts-fsrs recharts date-fns lucide-react class-variance-authority clsx tailwind-merge @anthropic-ai/sdk openai
npx convex init
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input textarea badge dialog tabs tooltip skeleton separator avatar dropdown-menu sheet
npx convex env set ANTHROPIC_API_KEY sk-ant-your-key
npx convex env set OPENAI_API_KEY sk-your-key

# Dev (two terminals):
npx convex dev    # Terminal 1
pnpm dev          # Terminal 2
```

### Convex patterns cheat sheet:
- **Queries** = read (reactive) | **Mutations** = write | **Actions** = external APIs (not reactive)
- `"use node";` at top of files that import npm packages (Claude SDK, OpenAI)
- `ctx.scheduler.runAfter(0, ...)` → fire async work after mutations
- Vector search → only in actions, not queries
- `internal.` prefix → functions only callable server-side

---

## 12. Future: FastAPI Migration Path

Once MVP is validated:
1. Export Convex data → seed PostgreSQL + pgvector
2. Build FastAPI routes mirroring Convex function signatures
3. Swap frontend API calls from Convex hooks to `fetch()`
4. Deploy on VPS: Docker + Nginx + Gunicorn/Uvicorn + PostgreSQL
5. Learn the full Python backend + DevOps stack with a real project
