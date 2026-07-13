<div align="center">

# media.content

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/) [![React 19](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Express 5](https://img.shields.io/badge/Express-5.2-lightgrey?style=for-the-badge&logo=express&logoColor=black)](https://expressjs.com/) [![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/) [![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-7-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://sdk.vercel.ai/) [![Gemini](https://img.shields.io/badge/Google_Gemini-3.1-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/) [![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/) [![Zod](https://img.shields.io/badge/Zod-4-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/) [![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/) [![Turborepo](https://img.shields.io/badge/Turborepo-2-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/) [![pnpm](https://img.shields.io/badge/pnpm-10-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

_A one-person newsroom for teams without a media department._

</div>

Most small teams ship things nobody hears about. Writing the announcement six different ways — tweet, LinkedIn post, Reddit thread, release notes, a Dev.to or Medium article — is a day of work that usually doesn't happen. media.content takes one brief and produces the whole bundle, planned as a single campaign so the channels reinforce each other instead of repeating each other. Assets stream into the studio as they finish. Each one keeps its own revision history and can be refined with a follow-up prompt, hand-edited, or regenerated from scratch.

Everything runs under a **Brand**: a name, a tagline, a writing style, and one free-text box of references (links, past posts, pasted copy, whatever evidences the voice you want). References are fetched, chunked, and embedded, and every generation quotes your real material instead of inventing product details.

## How a campaign happens

A brief hits `POST /api/brands/:id/campaigns` and holds the connection open until the last asset lands. A planner runs first — one `generateObject` call producing audience, key messages, and hooks — so a Reddit post and a release note share an angle without sharing sentences. Each asset then retrieves its own evidence: chunks from the brand's references, pages fetched from any URLs in them, and past revisions kept around as style memory. Ranking is cosine similarity over `gemini-embedding-001` vectors stored as SQLite blobs, done in plain JS. There's no vector database, and at this scale there doesn't need to be.

Generation fans out through a small concurrency gate (the Gemini free tier is stingy, default is 2 at a time) into the `ContentProvider`, with backoff retries on 429s. Every state change streams back as a Server-Sent Event, and both ends validate each frame against the same Zod schema. Campaigns, assets, and revisions persist in SQLite, so history survives restarts.

## The parts worth reading

- **One contract, written once.** Every request and response shape is a Zod schema in `shared/src/schemas.ts`. The server validates input with them, the web app parses responses through them at runtime, and every TypeScript type is `z.infer` of the same schemas. There is no second copy to drift.
- **Prompts that fight AI voice.** `server/src/prompts/prompts.ts` injects a "human register" block into every generation: vary sentence length on purpose, ration em-dashes, a banned-phrase list ("delve", "leverage", "game-changer"...), no tidy three-item parallels, and never end on a summary of yourself. User text goes into the prompt fenced inside tags and declared data-only, so a hostile reference page can't smuggle in instructions.
- **Streaming existed before the AI did.** The Express server spoke SSE from the first commit, serving canned fixtures with fake latency. The frontend was built against the real contract the whole time, and wiring in Gemini later touched only `server/src/providers/`.
- **Revisions are append-only.** Each one is tagged `generated`, `refined`, or `manual`, older ones can be restored as new ones, and the campaign row stores the original prompt, resolved style, and plan. Refine and regenerate read their context from the database, which makes "lost the original brief" a bug that can't be written.
- **Boring reliability.** An `Idempotency-Key` on campaign creation replays the finished stream instead of generating twice. Boot reconciles assets orphaned by a crash. A dropped browser tab aborts the in-flight Gemini calls. The URL fetcher resolves DNS first and refuses private and loopback ranges outright.
- **A design direction, not a template.** The studio leans on a newsroom-wire motif — an animated pulse line that divides the landing page and ticks while assets transmit — over a warm paper-and-amber palette. Bricolage Grotesque for display, Atkinson Hyperlegible for body, IBM Plex Mono for the ticker bits. Light and dark themes both real, Tailwind v4 configured entirely in CSS with no config file.

## Layout

pnpm workspaces plus Turborepo. Node ≥ 20.9, pnpm 10 via corepack (pnpm 11 breaks on Node 20).

```
shared/  @media-content/shared  — Zod schemas, inferred types, constants. Raw TS, no build step.
server/  @media-content/server  — Express 5 API, SQLite, RAG, planner, provider abstraction. Port 4000.
web/     @media-content/web     — Next.js 16 App Router studio + marketing site. Port 3000, rewrites /api/* to the server.
```

**`server/src/`** — `app.ts` (routes, SSE, error middleware) · `db/` (SQLite store) · `pipeline/` (campaign planner) · `providers/` (`ContentProvider` + Gemini) · `rag/` (fetcher, chunker, embeddings, retrieval) · `prompts/` · `lib/` (errors, logger, concurrency, rate limiting).

**`web/src/`** — `app/(marketing)/` · `app/studio/` (brief composer, streaming asset grid, refinement drawer, brand switcher, campaign history) · `components/{ui,landing,studio}/` (tailwind-styled-components + CVA) · `services/` (fetch hooks that parse through the shared schemas) · `stores/` (Zustand) · `proxy.ts` (Clerk middleware — Next 16 renamed `middleware.ts`).

## API

| Method               | Route                                           | What it does                                    |
| -------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `GET`                | `/api/health`                                   | Liveness (pings the DB)                         |
| `GET / POST`         | `/api/brands`                                   | List / create brands                            |
| `GET / PUT / DELETE` | `/api/brands/:id`                               | Read / update / delete (last brand is kept)     |
| `GET`                | `/api/brands/:id/campaigns`                     | Campaign history, `?q=` searches prompts        |
| `POST`               | `/api/brands/:id/campaigns`                     | Plan + generate — **streams per-asset via SSE** |
| `GET`                | `/api/campaigns/:id`                            | Fetch a campaign with its assets                |
| `GET`                | `/api/campaigns/:id/export`                     | Flat export of latest revisions                 |
| `DELETE`             | `/api/campaigns/:id`                            | Delete a campaign                               |
| `POST`               | `/api/assets/:id/refine`                        | Rewrite one asset from a follow-up prompt       |
| `POST`               | `/api/assets/:id/regenerate`                    | Re-run one asset from the original brief        |
| `POST`               | `/api/assets/:id/revisions`                     | Save a manual edit                              |
| `POST`               | `/api/assets/:id/revisions/:revisionId/restore` | Bring back an earlier revision                  |

Requests are validated and responses parsed with the shared contract on both sides.

## Running it

```bash
corepack enable
corepack prepare pnpm@10 --activate
pnpm install
```

Copy `server/.env.example` → `server/.env` and `web/.env.example` → `web/.env`, then fill in the keys. Both are required: the server refuses to boot without a Gemini key, and the web app throws without Clerk keys. Both have free tiers — grab the Gemini key from [AI Studio](https://aistudio.google.com/) and the Clerk pair from a free [Clerk](https://clerk.com/) app.

**`server/.env`**

```
GOOGLE_GENERATIVE_AI_API_KEY=   # required
GEMINI_TEXT_MODEL=gemini-3.1-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_CONCURRENCY=2
DB_PATH=                        # defaults to server/data/media-content.db
PORT=4000
```

**`web/.env`**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=   # required
CLERK_SECRET_KEY=                    # required
API_URL=http://localhost:4000
```

Then let Turbo run both apps:

```bash
pnpm dev     # web on :3000, server on :4000
pnpm test    # vitest, supertest against the real SSE routes
pnpm build
pnpm lint
```

## Not here yet

Image and banner generation is typed end to end but gated off — the Gemini free tier grants zero image requests, and the free alternatives weren't good enough to ship. Old image assets still render. Video, billing, and deployment are further out.
