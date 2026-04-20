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

## Production deployment checklist

Deploying publicly? Read this first. The default `docker-compose.yml` is production-safe **only if** you follow all of these:

1. **Every secret is unique and strong.** `POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `SEED_PASSWORD`. Generate with `openssl rand`. Never reuse across environments.
2. **Rotate `SEED_PASSWORD` immediately after first login** via Settings → Change password. The seed only runs on an empty DB, but the value persists in `.env`.
3. **Ports**
   - Postgres (`5432`) is **not** bound to the host in `docker-compose.yml`. Do not add it back. Only the `web` and `migrate` services (on the internal docker network) can reach it.
   - `web` binds to `127.0.0.1:3000` only — not reachable from the public internet. Put Caddy or nginx in front for TLS, and reverse-proxy to `127.0.0.1:3000`.
4. **Firewall**: `ufw default deny incoming; ufw allow 22/tcp; ufw allow 80/tcp; ufw allow 443/tcp; ufw enable`. Enable DigitalOcean's cloud firewall too — defense in depth.
5. **SSH**: disable password auth (`PasswordAuthentication no` in `/etc/ssh/sshd_config`), key-only, consider a non-22 port, install `fail2ban`.
6. **OS**: `unattended-upgrades` on Ubuntu/Debian so kernel + Docker security patches apply automatically.
7. **Auth host trust**: `AUTH_TRUST_HOST=true` is set by default because NextAuth v5 requires it on any non-Vercel host. This is safe **only** because the app binds to localhost behind a trusted reverse proxy. If you expose port 3000 directly, a spoofed `Host` header can redirect auth flows.
8. **Backups**: `docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup-$(date +%F).sql.gz` in cron. Store off-box.
9. **`.env` permissions**: `chmod 600 .env && chown root:root .env`.

If your droplet ever gets flagged for abuse (outbound DDoS, crypto mining, port scanning), assume **every secret it ever touched is compromised**. Revoke API keys, rotate SSH keys, generate new `NEXTAUTH_SECRET`/`ENCRYPTION_KEY` before rebuilding.

### Auth host trust

See item 7 above.

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
