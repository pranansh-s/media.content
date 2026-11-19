# Deployment — Vercel (frontend) + Railway (backend)

media.content is a two-process monorepo: a Next.js frontend (`web/`) and an Express API (`server/`). The frontend deploys to Vercel; the backend deploys to Railway with persistent disk for SQLite and image storage.

## Prerequisites

- A Vercel account (free Hobby plan works)
- A Railway account (free tier: 500 hrs/mo, $5 credit, 1 GB disk)
- The repository pushed to GitHub

## 1. Deploy the backend to Railway

### Create the service

1. Create a new project in Railway → **Deploy from GitHub repo**
2. Select this repository
3. Railway auto-detects the monorepo and `railway.json`

### Add a persistent volume

The SQLite database and stored images live on disk. Without a volume they vanish on redeploy.

1. In the service settings → **Volumes** → **New Volume**
2. Mount path: `/app/server/data`
3. Size: 1 GB (expand later if needed)

### Set environment variables

| Variable | Value |
|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Your Gemini API key |
| `GEMINI_TEXT_MODEL` | `gemini-3.1-flash-lite` (or preferred model) |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` |
| `GEMINI_CONCURRENCY` | `2` (safe for free-tier rate limits) |
| `PORT` | Railway sets this automatically — leave unset |
| `CORS_ORIGINS` | `https://your-app.vercel.app` (comma-separated if you have a custom domain too) |
| `NODE_ENV` | `production` |

`DB_PATH` can be left empty; it defaults to `server/data/media-content.db` which falls inside the mounted volume.

### Verify

Once deployed, hit the health endpoint:

```
curl https://<your-railway-url>/api/health
# → {"status":"ok"}
```

Copy the Railway URL — you need it for the Vercel step.

## 2. Deploy the frontend to Vercel

### Import the project

1. In the Vercel dashboard → **Add New Project** → import the GitHub repo
2. **Root Directory**: `web`
3. **Framework Preset**: Next.js (auto-detected)

Vercel auto-detects the pnpm monorepo and runs `pnpm install` at the workspace root, then `next build` inside `web/`.

### Set environment variables

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
| `CLERK_SECRET_KEY` | Your Clerk secret key |
| `API_URL` | The full Railway URL, e.g. `https://media-content-server-production.up.railway.app` |

The `API_URL` powers the Next.js rewrite in `next.config.ts` — all browser requests to `/api/*` are proxied through Vercel to Railway.

### Region

Set the Vercel function region to **US East (iad1)** to colocate with Railway (US East) and the Gemini API.

### Verify

1. Load `https://your-app.vercel.app` — the landing page should render with fonts and animations
2. Sign in via Clerk → navigate to `/studio`
3. Generate a campaign — SSE events should stream in real-time

## Region colocation

Keep all three services in US East to minimize inter-service latency:

| Component | Region |
|---|---|
| Vercel | `iad1` (US East) |
| Railway | US East (default) |
| Gemini API | US (default) |

## Custom domain

1. Add your domain in Vercel → **Domains**
2. Update `CORS_ORIGINS` on Railway to include the custom domain
3. Update Clerk's allowed redirect URLs to include the custom domain

## Architecture

```
Browser ──▶ Vercel (CDN + Next.js SSR)
               │
               │  /api/* rewrite (edge proxy)
               ▼
            Railway (Express + SQLite + Gemini)
               │
               ├── SQLite DB (persistent volume)
               ├── Image files (persistent volume)
               └── Gemini API (text generation + embeddings)
```

## Redeployment

- **Frontend changes**: push to main → Vercel auto-deploys
- **Backend changes**: push to main → Railway auto-deploys
- **Schema migrations**: `better-sqlite3` uses `CREATE TABLE IF NOT EXISTS` — additive schema changes apply on restart; destructive changes need manual migration

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Studio shows "Can't reach the wire" | `API_URL` wrong or Railway down | Check Railway logs; verify `API_URL` in Vercel env vars |
| SSE stream stalls / no assets arrive | Vercel edge proxy timeout | Add `?direct=1` to bypass and call Railway directly (requires CORS_ORIGINS set) |
| 429 errors on generation | Gemini free-tier RPM limit | The retry logic handles this; increase `GEMINI_CONCURRENCY` only if on a paid Gemini plan |
| DB lost after redeploy | Volume not mounted | Re-attach the volume at `/app/server/data` |
| Build fails on Vercel: "Clerk keys missing" | Env vars not set | Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel dashboard |
