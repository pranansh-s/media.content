<div align="center">

# media.content

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/) [![React 19](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Express 5](https://img.shields.io/badge/Express-5.2-lightgrey?style=for-the-badge&logo=express&logoColor=black)](https://expressjs.com/) [![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/) [![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-7-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://sdk.vercel.ai/) [![Gemini](https://img.shields.io/badge/Google_Gemini-2.5-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/) [![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/) [![Zod](https://img.shields.io/badge/Zod-4-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/) [![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/) [![Turborepo](https://img.shields.io/badge/Turborepo-2-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/) [![pnpm](https://img.shields.io/badge/pnpm-10-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

</div>

AI media-outreach studio for startups without a media department. One brief plans and generates a full multi-channel campaign — tweets, LinkedIn posts, Reddit threads, GitHub release notes, Dev.to and Medium articles, banners, social images — streamed per asset over SSE and refinable through follow-up prompts. Every campaign is anchored to a **Brand** and grounded in its references via a RAG pipeline so voice and facts stay consistent across channels.

## How it works

A brief hits `POST /api/brands/:id/campaigns`. The **planner** drafts a channel-aware campaign plan (angle, hooks, per-asset briefs). Each asset then runs through a **RAG retrieval** step — brand references, prior revisions, and URLs cited in the brief are chunked, embedded with `gemini-embedding-001`, and ranked by cosine similarity — before generation. Assets fan out through a bounded-concurrency queue into the active `ContentProvider` and stream back to the studio over Server-Sent Events. Everything persists in SQLite so revisions, refinements, and campaign history survive restarts.

## What makes it distinct

- **Zod-defined contract as ground truth.** Request and response shapes live once in `shared/`; the server validates with them, the web parses responses with them. No duplicated types, no drift.
- **Planner + RAG, not blind fan-out.** Multi-channel generation is planned first and grounded per-asset, so a Reddit post, a LinkedIn post, and a release note stay on-message without saying the same thing twice.
- **Streaming from day one.** SSE per asset, wired into the studio, so the UI paints as tokens land — not a spinner then a wall of text.
- **Pluggable provider.** `ContentProvider` interface with `GeminiProvider` (Vercel AI SDK) and `FixtureProvider` (canned content). The app runs end-to-end without a Gemini key.
- **Brand-as-context.** A single free-text `references` field (links, posts, examples) auto-applied to every generation; style resolves via `styleId: 'brand'`, a shared preset, or free-text `customStyle`.
- **Production-grade Express.** Custom error classes, structured logging, idempotency-key support, Helmet, request-scoped rate limiting, bounded-concurrency queue.

## Monorepo Layout

pnpm workspaces plus Turborepo. Node ≥ 20.9, pnpm 10 via corepack (pnpm 11 breaks on Node 20).

```
shared/  @media-content/shared  — Zod schemas, inferred types, constants. Raw TS, no build step.
server/  @media-content/server  — Express 5 API, SQLite, RAG pipeline, planner, provider abstraction. Port 4000.
web/     @media-content/web     — Next.js 16 App Router studio + marketing. Port 3000; rewrites /api/* to server.
```

**`server/src/`** — `app.ts` (routes, SSE, Zod handlers, Helmet, error middleware) · `db/` (SQLite store, repositories) · `pipeline/` (campaign planner) · `providers/` (`ContentProvider` + Gemini/Fixture) · `rag/` (fetcher, chunker, Gemini embeddings, knowledge index) · `prompts/` (per-kind templates) · `lib/` (errors, logger, concurrency + rate limit).

**`web/src/`** — `app/(marketing)/` · `app/studio/` (brief editor, streaming asset canvas, branding drawer, campaign history) · `app/sign-in`, `app/sign-up` · `components/{ui,landing,studio}/` (tailwind-styled-components + CVA) · `services/` (typed fetch hooks parsing through shared schemas) · `stores/` (Zustand) · `proxy.ts` (Clerk middleware).

## API

All routes validate input with the shared Zod contract.

| Method               | Route                                           |                                                 |
| -------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `GET`                | `/api/health`                                   | Liveness                                        |
| `GET / POST`         | `/api/brands`                                   | List / create                                   |
| `GET / PUT / DELETE` | `/api/brands/:id`                               | Read / update / delete                          |
| `GET`                | `/api/brands/:id/campaigns`                     | List a brand's campaigns                        |
| `POST`               | `/api/brands/:id/campaigns`                     | Plan + generate — **streams per-asset via SSE** |
| `GET`                | `/api/campaigns/:id`                            | Fetch campaign with assets                      |
| `GET`                | `/api/campaigns/:id/export`                     | Export campaign bundle                          |
| `DELETE`             | `/api/campaigns/:id`                            | Delete campaign                                 |
| `POST`               | `/api/assets/:id/refine`                        | Refine with a follow-up prompt                  |
| `POST`               | `/api/assets/:id/regenerate`                    | Regenerate from scratch                         |
| `POST`               | `/api/assets/:id/revisions`                     | Save a manual edit                              |
| `POST`               | `/api/assets/:id/revisions/:revisionId/restore` | Restore a prior revision                        |

## Getting Started

```bash
corepack enable
corepack prepare pnpm@10 --activate
pnpm install
```

Copy `server/.env.example` → `server/.env` and `web/.env.example` → `web/.env.local`. Both keys are optional — without a Gemini key the app runs on `FixtureProvider`; without Clerk keys auth is ungated.

**`server/.env`**

```
GOOGLE_GENERATIVE_AI_API_KEY=
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_CONCURRENCY=2
DB_PATH=
PORT=4000
```

**`web/.env.local`**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
API_URL=http://localhost:4000
```

Run everything in parallel via Turbo:

```bash
pnpm dev         # web :3000, server :4000, shared typecheck
pnpm test        # vitest (supertest for server routes)
pnpm build
pnpm lint
```
