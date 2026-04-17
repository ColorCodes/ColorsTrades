# ColorsTrades

Self-hosted trading journal for prop-firm traders. Tracks funded-account balances, available drawdown, payouts vs fees, and per-trade P&L. Inspired by TradeZella, designed mobile-first, shippable as a single `docker compose` stack.

## Features (MVP)

- Mobile-first dashboard: total funded accounts, available drawdown, prop income vs expense chart
- Trade journal (manual entry, generic CSV import, LLM-chat import via Anthropic)
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
| `ANTHROPIC_API_KEY` | Optional — enables the LLM chat importer |
| `DEFAULT_CURRENCY` | Display currency (default USD) |
| `DEFAULT_TIMEZONE` | Display timezone (default UTC) |

## Local development

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Postgres 16 · Prisma 6 · NextAuth 5 · Tailwind + shadcn/ui · Recharts · Zod + React Hook Form · Anthropic SDK.
