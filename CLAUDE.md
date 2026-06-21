# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

NutriAI — nutrition-tracking web app (Spanish/rioplatense UI). Photo→calories via AI,
daily macro tracking, AI-generated nutrition plan, plan-aware chat, and PDF plan import.

## Commands

```bash
npm run dev          # dev server (Turbopack) on :3000
npm run build        # production build
npm run lint         # eslint (flat config). react-hooks rules are ERRORS — must pass
npm run typecheck    # tsc --noEmit

# Database (Drizzle + Neon Postgres)
npm run db:generate  # generate SQL migration from src/db/schema.ts
npm run db:migrate   # apply migrations (non-interactive; prefer over db:push)
npm run db:studio
npx tsx src/db/seed.ts   # seed the foods table

# Diagnostic "tests" — there is NO test framework. These scripts hit the REAL model.
npm run test:vision <path|url> ["descripción opcional"]   # full photo→macros pipeline
npm run test:suggest
npx tsx scripts/test-chat.ts      # chat guardrails (off-topic / jailbreak / danger)
npx tsx scripts/test-estimate.ts  # free-text food + quantity estimation
npx tsx scripts/test-import.ts    # PDF plan import (importPlanFromText / extractTargets)
npx tsx scripts/test-plan.ts      # plan generate + modify
npx tsx scripts/add-weight.ts <email> <kg> [YYYY-MM-DD|ayer]
npx tsx scripts/delete-user.ts <email>   # cascade-deletes a user (for testing onboarding)
```

There is no automated test suite. "Validation" before pushing = `typecheck` + `lint` + `build`.

## Environment

Secrets live in **`.env.local`** (not `.env`). Keys: `DATABASE_URL`, `AUTH_SECRET`,
`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `OPENROUTER_API_KEY`, `AI_VISION_MODEL`, `AI_TEXT_MODEL`.

- `AI_VISION_MODEL` **must** support images (many `:free` models are text-only). Free
  OpenRouter models are slow (~20-40s) and rate-limited (429 is common); models also rotate
  in/out of being free. Verify a model with `npm run test:vision`.
- Next.js auto-loads `.env.local`, but the `tsx` scripts do **not**. They import
  `src/lib/load-env.ts` as the **first** import (before anything that pulls `@/db`).
  `drizzle.config.ts` loads `.env.local` explicitly too.

## Architecture (the big picture)

### AI provider abstraction (`src/lib/ai/`)
`types.ts` declares the `VisionProvider` / `TextProvider` interfaces plus all Zod output
schemas; `openrouter.ts` implements them with the `openai` SDK pointed at OpenRouter;
`index.ts` is the factory (`getVisionProvider`, `getTextProvider`). This indirection exists
to swap to a paid model later by changing `AI_*_MODEL` env (or adding an implementation)
without touching callers. Conventions baked in here:
- LLM JSON parsing is **tolerant** (Zod `.coerce`/`.catch`) because free models omit fields.
- Markdown-producing methods (`generatePlan`, `modifyPlan`, `importPlanFromText`) return raw
  text via `stripFences` — never embed large markdown in JSON.
- `firstContent(res)` detects an error response missing `choices` (typically a 429) and
  throws a clean error; callers map it to a friendly message.

### Hybrid food macros (`src/lib/nutrition/`)
Photo flow (`analyze.ts`): vision model identifies foods + grams → cross-reference the local
`food` table when matched (precise) → fall back to the text model for macros of unmatched
items. **Critical boundary:** `foods.ts` is pure (client-safe; imports the schema with
`import type` only) while `foods.queries.ts` is server-only (imports `@/db`). Client
components must import only from `foods.ts` — importing DB code into a client bundle crashes
the browser with "DATABASE_URL no está definida".

### Effective (hybrid) targets
`targets.ts` = Mifflin-St Jeor (deterministic kcal/macros). `targets-effective.ts`
`getEffectiveTargets(userId)` returns the **imported plan's** targets when present, else the
computed ones. All call sites (Hoy dashboard, Perfil, chat/suggestion context in
`actions.ts`, `nutrition/context.ts`) use this helper — do not call `calcTargets` directly
in pages.

### Plan (`nutrition_plan` table, one row/user)
Markdown `content` + `source` (`generated` | `imported`) + optional `kcal/protein/carb/fat`.
Three ways it changes: AI `generatePlan` (auto-runs after onboarding), chat modification
(`nutritionChat` returns `modifyPlan:true` → server calls `modifyPlan` and saves), or PDF
import. PDF text is extracted **client-side** (`src/lib/pdf.ts`, pdfjs-dist worker via
`new URL(...)`); only the text reaches the server, the file is never uploaded. Imported plan
targets feed the hybrid effective-targets logic.

### Restricted chat (`nutritionChat` in `openrouter.ts`, `sendChatMessage` in actions)
Returns `{ onTopic, answer, modifyPlan }`. Fail-closed: anything off-topic/jailbreak →
`onTopic:false` with a humorous food-themed refusal; health-risk topics stay empathetic
(no jokes) and defer to a professional. Server-side guards: auth, length cap applied only to
the **last user message** (assistant messages in history can be long), rate limit. Context
(remaining macros, prefs, current plan) is built server-side — never from user input.

### Data & auth
Drizzle schema in `src/db/schema.ts`; Neon http client in `src/db/index.ts`; read queries in
`src/lib/queries.ts` (server-only). Auth.js v5 (Google) Drizzle-adapter tables
(user/account/session/verificationToken) + domain tables (profile, food, meal_log,
meal_log_item, weight_log, nutrition_plan). The `session` callback exposes `user.id`.

### Dashboard layout & navigation (`src/app/dashboard/`)
`layout.tsx` centralizes the auth/profile guard (no session → `/login`; no profile →
`/onboarding`) and is a fixed-height flex column (`h-[100dvh]`): header + `main`
(`overflow-hidden`) + bottom nav (mobile). **Each page owns its own scroll**
(`h-full overflow-y-auto`); do not make a page wrapper a flex column or its children shrink
instead of scrolling. Section navigation goes through `NavProgress.tsx` (a `useTransition`
provider that renders a top progress bar); nav links call its `navigate()` instead of
plain `<Link>` navigation. Most mutations are Server Actions; rate limiting via
`src/lib/rate-limit.ts` (in-memory, best-effort on serverless).

## Conventions & gotchas

- **Spanish (rioplatense)** UI throughout. Dates/targets use Argentina timezone
  (`src/lib/date.ts`).
- **Icons:** lucide-react only — no emoji in the UI.
- **Markdown** is rendered via `src/components/Markdown.tsx` (react-markdown, XSS-safe).
- **Image uploads** are downscaled client-side (`src/lib/image.ts`) to stay under the
  ~1MB Server Action body limit; photos are processed then discarded, never stored.
- **`.next` cache can corrupt** → every route returns 404 with no error in the log →
  `rm -rf .next` and restart.
- This is **Next.js 16** (newer than typical training data). For unfamiliar App Router APIs,
  consult the bundled docs in `node_modules/next/dist/docs/` (e.g. `useLinkStatus` exists).
  See `@AGENTS.md`.

@AGENTS.md
