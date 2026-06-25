# Bitácora — Tu Diario de Aprendizaje de Inglés

An AI-powered English-learning journal. You write journal entries in English, the
app instantly **corrects** them and **extracts** vocabulary/grammar concepts, and
then helps you **review** them with spaced repetition (the FSRS algorithm). It also
has a **Writing Coach** that collects the corrections you get inside AI tools (like
Claude Code) and turns your recurring mistakes into study topics.

The UI is in Spanish; the language you're learning is English.

---

## Table of contents

1. [What you get](#what-you-get)
2. [Tech stack](#tech-stack)
3. [How it works](#how-it-works)
4. [Prerequisites](#prerequisites)
5. [Quick start (local)](#quick-start-local)
6. [Detailed setup](#detailed-setup)
7. [The Writing Coach / English coach (hook → token)](#the-writing-coach--english-coach-hook--token)
8. [Deploying to production](#deploying-to-production)
9. [Environment variables reference](#environment-variables-reference)
10. [Project structure](#project-structure)
11. [Useful commands](#useful-commands)
12. [Troubleshooting](#troubleshooting)

---

## What you get

- **Journal** — write freely in English; AI returns corrections, praise, and your
  estimated level.
- **Concept extraction** — vocabulary, phrases, grammar patterns, and your own
  errors become flashcard-like "concepts."
- **Spaced repetition** — `/review` (*Repasar*) schedules concepts with FSRS. It has
  **two tabs**: **Vocabulario** (words from your journal + ones you add manually)
  and **Escritura** (study topics produced by the Writing Coach). Each tab is its
  own session with its own progress and stats.
- **Semantic search** — `/explore` answers questions about your past entries using
  vector search.
- **Word discovery** — `/discover` suggests new words connected to what you've
  recently learned.
- **Writing Coach** — `/coach` (*Escritura*) captures your text + its correction from
  Claude Code (or any MCP client), finds recurring error patterns, and feeds study
  topics into the review queue.
- **Progress** — streaks, charts, and a "knowledge garden."

---

## Tech stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16 (App Router), React 19 | UI with route groups |
| Backend | [Convex](https://convex.dev) | Database, serverless functions, auth, vector search, cron, HTTP endpoints |
| Auth | `@convex-dev/auth` (Password) | Email/password login |
| AI — text | **Google Gemini** `gemini-2.5-flash` | Corrections, concept extraction, challenges, suggestions, writing analysis |
| AI — text fallback | **Cloudflare Workers AI** (optional) | Used only if Gemini hits a quota (HTTP 429) |
| AI — embeddings | **Google Gemini** `gemini-embedding-001` (3072-dim) | Semantic search vectors |
| Spaced repetition | `ts-fsrs` | Review scheduling |
| UI | shadcn/ui + Base UI + Tailwind CSS v4 | Components & styling |
| Charts | Recharts | Progress visualization |

> **Note:** an older version of this README claimed Anthropic Claude + OpenAI
> embeddings. The code actually uses **Gemini** (with an optional **Cloudflare**
> text fallback). See [`convex/lib/aiProvider.ts`](convex/lib/aiProvider.ts).

---

## How it works

There's **no separate API server**. The browser talks to **Convex** over a live
WebSocket, so `useQuery` results update in real time — when a background AI task
finishes, the UI re-renders on its own without polling.

```
        Browser (Next.js / React)
                │  useQuery (live) · useMutation · useAction
                ▼
        Convex backend  ──►  Database + Vector index
          │  scheduler / actions
          ▼
        Gemini (text + embeddings)  ·  Cloudflare (text fallback)
```

Three core flows:

**1. Writing an entry** — `entries.create` (a mutation) saves the entry, then
schedules **three background actions in parallel** via `ctx.scheduler.runAfter(0, …)`:

| Task | File | Produces |
|------|------|----------|
| Extract concepts | [`convex/ai/extract.ts`](convex/ai/extract.ts) | Vocabulary / grammar / error "concepts" (with FSRS start state) |
| Correct grammar | [`convex/ai/correct.ts`](convex/ai/correct.ts) | Corrections, praise, estimated level |
| Embed | [`convex/ai/embeddings.ts`](convex/ai/embeddings.ts) | A 3072-dim vector for semantic search |

The UI shows the entry immediately and fills in corrections/concepts as each task
lands.

**2. Reviewing** — [`review.getQueue`](convex/review.ts) returns the concepts due
now, **split into two tracks** by the `writing-coach` tag: **Vocabulario** and
**Escritura**. For each card, [`convex/ai/challenge.ts`](convex/ai/challenge.ts)
generates (and caches) a challenge; you answer and self-rate, and `ts-fsrs`
reschedules the card's next review.

**3. Writing Coach** — captures arrive at the `/coach/ingest` HTTP endpoint
([`convex/http.ts`](convex/http.ts)) authed by your ingest key, landing in
`writingSamples`. Clicking *Analizar escritura* runs
[`convex/ai/coachAnalysis.ts`](convex/ai/coachAnalysis.ts), which finds error
patterns and inserts study topics as concepts in the **Escritura** review track.

**Convex function types** (useful to know when reading `convex/`):

| Type | Reads DB | Writes DB | Calls external APIs | Called from |
|------|:--------:|:---------:|:-------------------:|-------------|
| Query | ✓ | — | — | `useQuery` (live subscription) |
| Mutation | ✓ | ✓ | — | `useMutation` |
| Action | — | via mutations | ✓ | `useAction` / scheduler |
| Internal | — | — | — | backend only (not exposed to the client) |

---

## Prerequisites

You'll need:

- **Node.js 18+** and npm.
- A free **[Convex](https://convex.dev) account** (the backend + database).
- A free **[Google Gemini API key](https://aistudio.google.com/app/apikey)** — this
  powers all the AI features. *Without it the app still runs, but corrections,
  concept extraction, and suggestions are skipped.*
- *(Optional)* a **Cloudflare account + Workers AI token** if you want a text
  fallback when Gemini is rate-limited.
- *(Optional, for the Writing Coach)* **Claude Code**, or any MCP-capable client.

You do **not** need a credit card to start; Convex and Gemini both have free tiers.

---

## Quick start (local)

```bash
# 1. Clone and install
git clone <your-repo-url> learning-bitacora
cd learning-bitacora
npm install

# 2. Connect the Convex backend (opens a browser to log in / create a project).
#    This writes NEXT_PUBLIC_CONVEX_URL + CONVEX_DEPLOYMENT into .env.local for you,
#    and keeps running to sync the convex/ folder. Leave it running.
npx convex dev

# 3. In a SECOND terminal, initialize authentication (one time).
npx @convex-dev/auth

# 4. Add your Gemini key to the Convex backend (NOT .env.local — see note below).
npx convex env set GEMINI_API_KEY <your-gemini-key>

# 5. In a THIRD terminal, start Next.js
npm run dev
```

Open **http://localhost:3000**, register an account, and write your first entry.

> **Important — where secrets live:** AI keys run on Convex's servers, so they go in
> **Convex's environment variables** (`npx convex env set …` or the Convex dashboard),
> **not** in `.env.local`. The only thing in `.env.local` is the public Convex URL,
> which `npx convex dev` fills in automatically.

---

## Detailed setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Convex

```bash
npx convex dev
```

The first run logs you in and creates a Convex project (dev deployment). It:

- writes `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` to `.env.local`, and
- watches the [`convex/`](convex/) folder, deploying your functions and schema on save.

**Keep this terminal running** while developing.

### 3. Initialize authentication (one time)

The app uses email/password auth via `@convex-dev/auth`, which needs signing keys
on your deployment:

```bash
npx @convex-dev/auth
```

This generates the JWT keys (`JWT_PRIVATE_KEY`, `JWKS`) and `SITE_URL` on your Convex
dev deployment. Without it, registering/logging in will fail.

### 4. Configure the AI provider

Set the Gemini key **on the Convex backend**:

```bash
npx convex env set GEMINI_API_KEY <your-gemini-key>
```

*(Optional)* add the Cloudflare text fallback:

```bash
npx convex env set CLOUDFLARE_ACCOUNT_ID  <your-account-id>
npx convex env set CLOUDFLARE_AI_API_TOKEN <your-workers-ai-token>
```

You can also set these in the **Convex dashboard → Settings → Environment Variables**
(run `npx convex dashboard` to open it).

### 5. Run the app

```bash
npm run dev
```

You'll typically have **three terminals**: `npx convex dev`, `npm run dev`, and a
free one for commands. App at **http://localhost:3000**.

---

## The Writing Coach / English coach (hook → token)

This is the feature that captures the English corrections you receive inside AI
tools and turns your recurring mistakes into things to study. Here's the full
pipeline:

```
You write a message to Claude Code
        │
        ▼
[1] UserPromptSubmit hook  ──►  injects a standing instruction:
                                "start each reply with an 'English coaching' section
                                 that corrects the user's message + gives tips"
        │
        ▼
Claude replies (correction + tips at the top)
        │
        ▼
[2] Stop hook (capture-writing.ps1)  ──►  reads the transcript, extracts your
                                          original text + the coaching block
        │
        ▼  POST (Authorization: Bearer <COACH_API_KEY>)
[3] Convex /coach/ingest  ──►  saves a row in `writingSamples`
        │
        ▼  (you click "Analizar escritura" on the /coach page)
[4] runReview action  ──►  Gemini finds error patterns + study topics,
                           saves a `writingReviews` row, and inserts each
                           study topic into `concepts` (tag: "writing-coach")
        │
        ▼
[5] Review queue  ──►  topics appear in /review under the "Escritura" tab
```

Two Claude Code hooks make this work, and they're already configured in
[`.claude/settings.local.json`](.claude/settings.local.json):

- **`UserPromptSubmit`** — injects the "English coaching" standing instruction so
  every reply starts with a correction of your message.
- **`Stop`** — runs [`.claude/hooks/capture-writing.ps1`](.claude/hooks/capture-writing.ps1)
  after each turn to ship your original text + the correction to Convex.

> **Two capture scripts ship with the repo** — use the one for your OS:
> - **Windows:** [`.claude/hooks/capture-writing.ps1`](.claude/hooks/capture-writing.ps1) (PowerShell, already registered).
> - **macOS/Linux:** [`.claude/hooks/capture-writing.sh`](.claude/hooks/capture-writing.sh) (Bash; needs `jq` and `curl`).
>   Run `chmod +x .claude/hooks/capture-writing.sh`, then point the `Stop` hook in
>   `.claude/settings.local.json` at it instead of the `.ps1`:
>   ```json
>   "Stop": [{ "hooks": [{ "type": "command",
>     "command": "bash", "args": [".claude/hooks/capture-writing.sh"], "timeout": 15 }] }]
>   ```
>
> Either way, if you'd rather not use a hook, use the **MCP server** option below.

### Step 1 — Get your token (the "key")

1. Run the app and log in.
2. Go to **Ajustes** (Settings) → **Entrenador de Escritura**.
3. Copy the **URL de ingestión** (`COACH_INGEST_URL`) — it looks like
   `https://<deployment>.convex.site/coach/ingest`.
4. Click **Generar clave** and copy the **key** (`COACH_API_KEY`, starts with
   `coach_`). **It's shown only once** — save it now. Regenerating invalidates the
   old one.

### Step 2 — Give the hook your credentials

The capture hook reads `COACH_INGEST_URL` and `COACH_API_KEY` from either real
environment variables or a **gitignored** file at `.claude/.coach-env`. The file is
the easiest:

```ini
# .claude/.coach-env   (already gitignored — never committed)
COACH_INGEST_URL=https://<your-deployment>.convex.site/coach/ingest
COACH_API_KEY=coach_xxxxxxxxxxxxxxxxxxxxxxxx
```

Now, every time you chat with Claude Code in this project, your messages and their
corrections are captured automatically.

> **Debugging the hook:** set `COACH_DEBUG=1` to print diagnostics instead of
> failing silently, and `COACH_DRYRUN=1` to parse without POSTing. The hook is
> deliberately fail-safe — it never blocks or breaks your Claude Code session.

### Step 3 — Use it from other apps (optional MCP server)

For clients that aren't Claude Code (Claude Desktop, Cursor, …), there's a tiny MCP
server at [`mcp/writing-coach/`](mcp/writing-coach/) exposing one tool,
`submit_writing_sample`. It's already wired for this repo via
[`.mcp.json`](.mcp.json) (reads `COACH_INGEST_URL` / `COACH_API_KEY` from your
environment). Full instructions: [`mcp/writing-coach/README.md`](mcp/writing-coach/README.md).

### Step 4 — Turn captures into study topics

1. Open **/coach** (*Escritura*). You'll see how many texts are captured and how
   many are unanalyzed.
2. Click **Analizar escritura**. Gemini summarizes your error patterns and proposes
   study topics.
3. Those topics are added to your review queue and show up in **/review →
   Escritura tab**, scheduled with spaced repetition just like vocabulary.

> The analysis is **manual** (a button), not a cron job — run it whenever you've
> accumulated some new captures.

---

## Deploying to production

The app has two halves to deploy: the **Convex backend** and the **Next.js
frontend**. The recommended host for the frontend is **Vercel**.

### 1. Deploy the Convex backend

```bash
npx convex deploy
```

Then set your environment variables on the **production** deployment (they're
separate from dev):

```bash
npx convex env set GEMINI_API_KEY <your-gemini-key> --prod
# optional fallback:
npx convex env set CLOUDFLARE_ACCOUNT_ID  <id>    --prod
npx convex env set CLOUDFLARE_AI_API_TOKEN <token> --prod
```

Initialize auth on production too:

```bash
npx @convex-dev/auth --prod
```

### 2. Deploy the Next.js frontend (Vercel)

The clean way to keep frontend + backend in sync is to let Convex run the build.
In your Vercel project settings:

- **Build Command:** `npx convex deploy --cmd 'npm run build'`
- **Environment variable:** `CONVEX_DEPLOY_KEY` — generate it in the Convex
  dashboard (**Settings → Deploy keys → Production**) and paste it into Vercel.

This command deploys your latest Convex functions **and** injects the correct
`NEXT_PUBLIC_CONVEX_URL` into the Next.js build automatically — you don't set that
variable by hand on Vercel.

Push to your Git repo, import it in Vercel, and deploy.

### 3. Point the Writing Coach at production

Once deployed, your production ingest URL changes. In the **live** app, go to
**Ajustes → Entrenador de Escritura**, copy the new `COACH_INGEST_URL` (and
generate a fresh key if you like), and update your local `.claude/.coach-env`
(and any MCP client config) to match.

---

## Environment variables reference

### Convex backend (set with `npx convex env set …`, **not** in `.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Recommended | Powers all AI: corrections, extraction, challenges, suggestions, embeddings, writing analysis |
| `CLOUDFLARE_ACCOUNT_ID` | Optional | Enables Cloudflare text fallback (must be paired with the token) |
| `CLOUDFLARE_AI_API_TOKEN` | Optional | Workers AI token for the text fallback |
| `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` | Auto | Created by `npx @convex-dev/auth` — don't set by hand |
| `CONVEX_SITE_URL` | Auto | Provided by Convex; used by `auth.config.ts` |

### Next.js frontend (`.env.local`, written automatically by `npx convex dev`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | The Convex deployment URL the browser connects to |
| `CONVEX_DEPLOYMENT` | Which Convex deployment the CLI targets |

### Writing Coach hook / MCP (your machine — never committed)

| Variable | Where | Purpose |
|----------|-------|---------|
| `COACH_INGEST_URL` | `.claude/.coach-env` or env | The `…convex.site/coach/ingest` endpoint |
| `COACH_API_KEY` | `.claude/.coach-env` or env | Per-user ingest key generated in **Ajustes** |
| `COACH_DEBUG` / `COACH_DRYRUN` | env | Optional hook debugging flags |

---

## Project structure

```
learning-bitacora/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── (auth)/                   # Public: login, register
│   │   └── (dashboard)/              # Protected: journal, review, explore,
│   │                                 #   discover, coach, progress, settings
│   ├── components/
│   │   ├── ui/                       # shadcn/ui + Base UI primitives
│   │   ├── review/                   # ReviewTabs, ReviewSession, ChallengeCard…
│   │   ├── coach/                    # WritingCoach, ReviewPanel, IngestKeyCard…
│   │   ├── discover/                 # Word suggestions
│   │   └── journal/ explore/ dashboard/ layout/ …
│   └── hooks/  lib/
│
├── convex/                          # Convex backend
│   ├── schema.ts                    # Database tables + indexes
│   ├── auth.ts / auth.config.ts     # Password auth
│   ├── http.ts                      # /coach/ingest HTTP endpoint
│   ├── review.ts                    # FSRS review queue (vocab + writing tracks)
│   ├── coach.ts                     # Ingest keys, samples, writing reviews
│   ├── concepts.ts entries.ts …     # CRUD + queries
│   ├── crons.ts                     # Daily streak reset
│   ├── ai/                          # extract, correct, challenge, suggest,
│   │                                 #   embeddings, coachAnalysis
│   └── lib/aiProvider.ts            # Gemini (+ Cloudflare fallback)
│
├── mcp/writing-coach/               # MCP server for non-Claude-Code clients
├── .claude/
│   ├── settings.local.json          # The two hooks (UserPromptSubmit + Stop)
│   └── hooks/capture-writing.ps1    # Stop hook that ships captures to Convex
└── .mcp.json                        # Registers the writing-coach MCP server
```

---

## Useful commands

| Command | What it does |
|---------|--------------|
| `npx convex dev` | Run/sync the Convex backend (watch mode) |
| `npm run dev` | Start the Next.js dev server |
| `npx @convex-dev/auth` | Initialize auth signing keys (add `--prod` for production) |
| `npx convex env set KEY value` | Set a backend env var (add `--prod` for production) |
| `npx convex dashboard` | Open the Convex dashboard in your browser |
| `npx convex deploy` | Deploy the backend to production |
| `npm run build` | Production build of the frontend |
| `npm run lint` | Lint with ESLint |

---

## Troubleshooting

- **Login/register fails** → you skipped `npx @convex-dev/auth`. Run it (and
  `--prod` for the live site).
- **Entries save but never get corrections/concepts** → no AI provider configured.
  Set `GEMINI_API_KEY` on the **Convex** deployment (not `.env.local`) and confirm
  with `npx convex env list`.
- **`/coach` says "No hay un proveedor de IA configurado"** → same as above:
  `GEMINI_API_KEY` is missing on the backend.
- **Writing Coach captures nothing** → check `.claude/.coach-env` has the right URL
  and key, run a Claude Code turn, then set `COACH_DEBUG=1` to see why the hook
  exited. A `401` from the ingest endpoint means the key is wrong or was
  regenerated. On macOS/Linux, also confirm `jq` is installed (`brew install jq`).
- **Frontend can't reach the backend** → `NEXT_PUBLIC_CONVEX_URL` is missing/stale
  in `.env.local`. Re-run `npx convex dev`.
- **Production AI works in dev but not live** → dev and prod have **separate**
  Convex env vars. Re-set them with `--prod`.
