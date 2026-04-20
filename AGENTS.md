# AGENTS.md

Context for AI agents (Claude Code, etc.) working on this repo.

## What this is

**ColorsTrades** — self-hosted, single-user trading journal modeled on TradeZella, focused on prop-firm income/expense tracking. Ships as a single `docker compose` stack (Postgres + Next.js).

The `README.md` is the user-facing intro; this file is the agent-facing one.

## Stack

- **Next.js 15** (App Router, RSC, `output: "standalone"`) + **React 19** + **TypeScript 5**
- **Postgres 16** + **Prisma 6** (Decimal money fields, enums, cuid ids)
- **NextAuth 5 beta** (credentials provider, JWT sessions, bcrypt)
- **Tailwind 3** + hand-written shadcn-style UI primitives in `src/components/ui/`
- **Recharts** for all charts (CSS-variable colors so dark mode works)
- **react-hook-form** + **zod**
- **Anthropic SDK** + **@google/generative-ai** for LLM trade extraction
- **Vitest** for unit tests on pure logic

## Repo layout

```
prisma/
  schema.prisma            # 9 models, 8 enums; Decimal(18,6) for money
  seed.ts                  # idempotent: 1 user, 2 accounts, 5 txns, 7 trades
  migrations/              # baseline migration; commit any new ones
src/
  app/
    (app)/                 # auth-gated route group
      dashboard/           # the home page — mobile-first hero KPIs + prop flow chart
      trades/  accounts/  notebook/  reports/  import/  settings/
    api/                   # route handlers; all use requireUser()
    login/   manifest.ts
  components/
    ui/                    # shadcn-style primitives (Button, Card, Input, …)
    charts/                # Recharts wrappers; always ResponsiveContainer
    shell/                 # AppShell (sidebar md+ / bottom tabs <md / hamburger sheet)
  lib/
    db.ts                  # Prisma singleton (HMR-safe)
    auth.ts                # NextAuth config
    session.ts             # requireUser() — call from RSCs and route handlers
    pnl.ts                 # FUTURES_MULTIPLIERS, computePnl(); pure
    analytics.ts           # KPIs, equity curve, groupings; pure
    propfirm.ts            # account drawdown / breach math; pure
    propFlow.ts            # income vs expense series for dashboard chart; pure
    crypto.ts              # AES-256-GCM for stored LLM keys
    llm-settings.ts        # state shape + getDecryptedApiKey
    llm-extract.ts         # provider dispatch (Anthropic / Google)
  middleware.ts            # redirects unauth users to /login
Dockerfile                 # 3-stage; runner copies full node_modules (Prisma needs it)
docker-compose.yml         # db (healthcheck) -> migrate (one-shot) -> web
```

## Conventions

- **Mobile-first.** Author every page at 360px first, add `sm:` / `md:` / `lg:` overrides upward. Tap targets ≥ 44px. Numeric inputs use `inputMode="decimal"`. Tables become stacked cards on `<sm`. Charts use `aspect-[4/3] sm:aspect-[16/9]`.
- **Money is `Decimal`** in the DB; convert to `number` only at the analytics boundary. Do P&L math in `src/lib/pnl.ts` on save/update — no DB triggers.
- **Server components fetch; client components handle interaction.** Keep `"use client"` shallow.
- **Pure functions get tests.** Anything in `lib/` that doesn't touch Prisma should have a `*.test.ts` next to it.
- **No comments unless the WHY is non-obvious.** Don't narrate what code does.
- **Don't add backwards-compat shims** when changing internal APIs — single-user app, just change it.

## Auth & security non-obvious bits

- **`AUTH_TRUST_HOST=true`** is required on every non-Vercel deploy. Already wired into `docker-compose.yml`. Safe **only** when the Next.js container isn't directly internet-exposed (run behind Caddy/nginx for production).
- **`ENCRYPTION_KEY`** (64-hex-char env var) encrypts LLM provider API keys at rest using AES-256-GCM. **Never** decrypt and return a key in any GET endpoint or RSC payload. The settings UI only ever sees `{configured, lastFour, updatedAt}`.
- **LLM keys are write-only from the UI's perspective**: replace or remove, never read back. Don't add a "show key" feature.
- **`requireUser()`** must be the first call in every authenticated route handler / RSC.

## LLM import flow

1. User saves a key in `/settings` → `POST /api/settings/llm` action `saveKey` → encrypted into `LlmApiKey` table.
2. User picks active provider in `/settings` → `POST /api/settings/llm` action `setActive` → updates `User.activeLlmProvider`.
3. Chat importer at `/import/chat` → `POST /api/import/llm` → reads `User.activeLlmProvider`, decrypts key via `getDecryptedApiKey`, dispatches to `extractTrades(provider, key, text)` in `lib/llm-extract.ts`.
4. Both providers use function-calling pointed at a `save_trades` tool whose schema is the trade array. Validate every returned trade with `tradeSchema` (Zod) — never trust the model's output.
5. Confirm step → `POST /api/import/llm/confirm` bulk-creates trades in a `prisma.$transaction`.

When adding a new LLM provider: extend `LlmProvider` enum in `schema.prisma`, add a branch in `extractTrades`, add the option to the Settings UI's `LABELS`/`PLACEHOLDERS` maps.

## Common commands

```bash
# Local dev (assumes Postgres reachable via DATABASE_URL)
npm install
npx prisma migrate dev    # if you changed schema.prisma
npm run db:seed
npm run dev

# Verify before pushing
npm run typecheck && npm test && npm run build

# Generate a new migration without a running DB
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script \
  > prisma/migrations/$(date +%Y%m%d%H%M%S)_<name>/migration.sql
# (then add migration_lock.toml if it's the first migration in the dir)

# Docker
docker compose up -d --build
docker compose logs -f migrate    # one-shot, expect exit 0
docker compose logs -f web        # expect "Ready"
```

## Branch & commit etiquette

- Work happens on `claude/trading-platform-plan-MX2Qb` (the original feature branch).
- Commit per logical change. Push with `git push -u origin <branch>`.
- **Never open a PR unless the user asks.**
- Never amend a pushed commit. Never force-push.

## Known gotchas

- Prisma's runner needs the **full** `node_modules` in the Docker image — `@prisma/config` pulls in `effect`, `c12`, `deepmerge-ts`, `empathic` transitively. Don't try to slim it back down to cherry-picked packages.
- The initial migration is committed at `prisma/migrations/20260420000000_init/`. If you change `schema.prisma`, generate a new migration — don't edit the existing one.
- `prisma migrate deploy` is a no-op when no migrations exist; the seed step then fails with "table does not exist". Always check that a baseline migration is committed.
- Recharts colors must come from CSS variables (e.g., `var(--primary)`), not hard-coded hex, so dark mode works.
- The middleware allowlist must include `/api/auth/*` and `/login`, plus public assets. Don't gate API routes there — gate inside each route handler with `requireUser()`.

## Out of scope (don't build these)

Live broker API sync, tick-by-tick replay, backtesting, multi-user signup, social/spaces, Zella University content. This is a single-user MVP.
