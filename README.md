# ColorsTrades

Self-hosted trading journal for prop-firm traders. Tracks funded-account balances, available drawdown, payouts vs fees, and per-trade P&L. Inspired by TradeZella, designed mobile-first, shippable as a single `docker compose` stack.

## Features (MVP)

- Mobile-first dashboard: total funded accounts, available drawdown, prop income vs expense chart
- Trade journal (manual entry, generic CSV import, LLM-chat import via Anthropic **or** Google Gemini)
- Prop-firm account tracking with rule breach indicators (daily / total drawdown)
- Deposits, withdrawals, payouts, fees, subscriptions per account
- Notebook with markdown entries
- Reports by symbol / tag / day-of-week / hour
- Equity curve, calendar heatmap, per-symbol breakdown
- Single-user self-hosted (email + password)

## Quickstart

```bash
cp .env.example .env
# Edit .env — set NEXTAUTH_SECRET (e.g. `openssl rand -base64 32`) and SEED_PASSWORD
docker compose up --build
```

Open http://localhost:3000 and log in with `SEED_EMAIL` / `SEED_PASSWORD`.

### Environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_SECRET` | Session encryption key (required) |
| `NEXTAUTH_URL` | Public URL of the app |
| `SEED_EMAIL` / `SEED_PASSWORD` | First-run seeded credentials |
| `ENCRYPTION_KEY` | 64-char hex (32 bytes) used to encrypt LLM provider API keys at rest. Generate with `openssl rand -hex 32` |
| `DEFAULT_CURRENCY` | Display currency (default USD) |
| `DEFAULT_TIMEZONE` | Display timezone (default UTC) |

### Auth host trust

`AUTH_TRUST_HOST=true` is set by default in `docker-compose.yml` so NextAuth v5 honors the `Host` header behind a reverse proxy. This is safe **only** when the Next.js container isn't reachable directly from the public internet. For production, run it behind Caddy/nginx and bind the app to localhost — see deployment notes in the docker-compose comments.

### AI chat importer

Go to **Settings → AI chat import** and:

1. Paste an API key for **Anthropic** (Claude) or **Google** (Gemini). Keys are encrypted with AES-256-GCM using `ENCRYPTION_KEY` and are never sent back to the browser.
2. Pick the **Active provider** from the dropdown.

Saved keys can be replaced or removed but never read back — not through the UI, not through the API, not through DevTools.

## Local development

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Postgres 16 · Prisma 6 · NextAuth 5 · Tailwind + shadcn/ui · Recharts · Zod + React Hook Form · Anthropic SDK · Google Generative AI SDK.
