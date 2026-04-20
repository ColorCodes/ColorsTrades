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
- Single-user self-hosted with **passkey sign-in** (WebAuthn), password fallback, per-identifier rate limiting, and optional **mTLS at the reverse proxy**

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

## Going live: Caddy, HTTPS, and optional mTLS

The repo ships a production overlay at `docker-compose.prod.yml` that adds a Caddy reverse proxy (auto-TLS via Let's Encrypt) and hides the Next.js container from the host completely.

```bash
# 1. Point your domain's A record at the droplet IP.

# 2. Copy and edit the Caddy config.
cp deploy/Caddyfile.example deploy/Caddyfile
# Edit deploy/Caddyfile: replace "your-domain.example" with your domain.

# 3. Set NEXTAUTH_URL to your HTTPS URL.
sed -i 's|^NEXTAUTH_URL=.*|NEXTAUTH_URL=https://your-domain.example|' .env

# 4. Make sure only 22 + 80 + 443 are open on the firewall.
ufw allow 80/tcp && ufw allow 443/tcp

# 5. Start the stack with the prod overlay.
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Passkeys

Once you log in the first time with `SEED_EMAIL` / `SEED_PASSWORD`, go to **Settings → Passkeys** and click **Enroll passkey** on every device you want to use. As soon as ≥1 passkey is enrolled, password sign-in is disabled for your account and the `/login` page favors the passkey button.

Enroll at least one additional backup passkey (a second phone, or a hardware security key) so you're not locked out if you lose a device.

### Rate limiting

Failed sign-in attempts are tracked per email and per IP. After 5 failures for an email (or 20 from one IP) within 15 minutes, that identifier is locked out for the rest of the window. Every attempt is persisted in the `LoginAttempt` table for audit.

### mTLS (optional, extra paranoid)

With mTLS on, Caddy refuses the TLS handshake unless the client presents a certificate signed by your private CA. Anyone without your cert never reaches the login page at all. It's the strongest defense against brute-force and 0-days in the auth layer.

```bash
# On the droplet, generate a CA and one client cert:
./deploy/mtls-setup.sh my-phone
# Repeat for each device:
./deploy/mtls-setup.sh my-laptop

# Install each .p12 file on the matching device
# (iOS Files → tap .p12 → enable full trust; macOS Keychain Access; etc.)

# Enable mTLS in Caddy:
#   1. Uncomment the tls { client_auth { ... } } block in deploy/Caddyfile
#   2. Uncomment the client_ca.pem bind mount in docker-compose.prod.yml
#   3. docker compose -f docker-compose.yml -f docker-compose.prod.yml restart caddy

# Keep deploy/ca.key OFFLINE after you've issued all your client certs.
# Losing it is fine (you can regenerate); leaking it lets an attacker issue new certs.
```

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
