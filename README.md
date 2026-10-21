# CompetiDex

All-in-one competitive Pokédex: browse complete Pokémon entries, compare species, calculate damage and build 6-mon teams with a Showdown-style editor (Poképaste import/export). Next.js 14 on top of [PokeAPI](https://pokeapi.co) with Redis caching, user accounts and 5 languages.

> Personal project under active development.

## Features

### Pokédex

- **Fuzzy search** with keyboard navigation; includes mega, regional and gender forms.
- **Full entry** (`/pokemon/:id`): official artwork with a shiny toggle, mega selector, types, abilities with descriptions, defensive effectiveness, base stats, evolution chain, moves per game with their effect, encounter/location data and a stat calculator.
- **Abilities** with a dedicated page (`/habilidad/:id`).

### Tools

- **Comparator** (`/comparar`): two Pokémon side by side with stats, types, abilities, weaknesses and a defensive coverage matrix.
- **Damage calculator** (`/calculadora`): built on `@smogon/calc`. Manual sets or sets loaded from your teams, level, weather, terrain, hazards, screens, critical hits, boosts, damage percentage and estimated KO. The old effectiveness page redirects here.

### Team builder

- **6 slots** with drag-and-drop reordering and **Standard** or **Champions** mode (its own EV limits).
- **Full set per Pokémon**: item with description, ability, nature (shows which stat goes up or down and colour-codes it), IVs, EV sliders with the **computed stat total** (base + IVs + EVs + nature) and 4 moves.
- **Move search** with localized names, effect tooltip, `Tab` to confirm and jump to the next move, and a full table (“view all”) **sortable by any column** and **filterable by type/category** (e.g. `Fairy, Electric` or `Physical`; names are matched in the UI language, so `Hada`/`Físico` work too).
- **Species change** inside the editor without removing and re-adding the Pokémon.
- **Poképaste export/import** (Showdown format), warning about anything it cannot recognise.
- **Persistence**: guests in `localStorage`; signed-in users in the database (Better Auth, email + password). Nested folders (3 levels), rename/move/delete teams and folders, and importing local teams when you sign in.

### Cross-cutting

- 5 languages through `next-intl`: Spanish, English, French, German and Japanese.
- Light/dark theme, responsive layout and accessibility (labels, `aria`, keyboard navigation).
- SSR/ISR for SEO plus Redis cache-aside to minimise PokeAPI calls (24 h for entries, 7 d for types/moves/items).
- Localized names with curated fixes when PokeAPI is outdated (e.g. _Ice Shard_ shows as “Canto Helado” in Spanish) and an offline location dictionary for `es`/`ja`.

## Stack

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| Framework      | Next.js 14 (App Router)                             |
| Language       | TypeScript strict                                   |
| Styling        | Tailwind CSS + shadcn/ui + lucide-react             |
| Data fetching  | TanStack Query                                      |
| Server cache   | Redis 7 (`ioredis`)                                 |
| Database       | Prisma + SQLite (Postgres-ready)                    |
| Authentication | Better Auth (email + password)                      |
| Validation     | Zod                                                 |
| Damage calc    | `@smogon/calc`                                      |
| i18n           | `next-intl` (es/en/fr/de/ja)                        |
| Testing        | Vitest + Testing Library + Playwright               |
| Containers     | Docker multi-stage + docker-compose                 |
| CI/CD          | GitHub Actions (lint, typecheck, tests, build, e2e) |

## Project structure

```
app/
├── [locale]/(pages)/          # home, pokemon/:id, habilidad/:id, comparar,
│                              # calculadora, equipos, equipos/:id, acceder
├── api/pokemon/               # cached proxy to PokeAPI
├── api/teams/ · api/folders/  # teams and folders CRUD
└── api/auth/                  # Better Auth
components/
├── pokemon/                   # entry, search bar, comparator, team editor…
├── teams/                     # folders, import, dialogs
├── calc/                      # damage calculator
└── ui/                        # shadcn/ui
lib/
├── pokeapi.ts · queries.ts    # typed client + data hooks
├── moveset.ts · movepool-*    # movepool and table sorting/filtering
├── team.ts · team-schema.ts   # team model and validation
├── pokepaste.ts               # Showdown export/import
├── calc/                      # calculator engine
└── server/                    # data access (Prisma)
hooks/ · messages/ · prisma/ · tests/ (component + e2e)
```

## Requirements

- Node.js 20 LTS and pnpm 9 (`npm i -g pnpm@9`).
- Docker + Docker Compose (recommended for production).
- Redis is optional in development: if it is not available, caching is skipped.

## Quick start (no Docker)

```bash
git clone git@github.com:angelnr/CompetiDex.git
cd CompetiDex
cp .env.example .env      # set BETTER_AUTH_SECRET
pnpm install
pnpm prisma generate
pnpm prisma migrate dev   # creates SQLite with users, teams and folders
sqlite3 prisma/dev.db "PRAGMA journal_mode=WAL;"   # once: enable WAL
pnpm dev
```

The app runs at `http://localhost:3100`. It keeps working without Redis (requests go straight to PokeAPI).

## Docker setup (recommended)

```bash
cp .env.example .env      # BETTER_AUTH_SECRET is required
docker compose up --build
```

- App: `http://localhost:3001` (configurable through `WEB_PORT`).
- Redis: internal to the compose network (no published port), capped at 256 MB with `allkeys-lru` eviction (sessions also live in SQLite, so eviction never logs users out).
- SQLite persists in the `sqlite-data` volume. The one-shot `migrate` service runs `prisma migrate deploy` and then switches the database to WAL mode (persistent), so readers never block the writer. The app connects with `?connection_limit=1` to serialize writes.
- `db-maintenance` runs once a day inside its container: deletes expired sessions and writes a verified SQLite backup to `/data/backups` (14-day retention, configurable with `BACKUP_RETENTION_DAYS`).

### Backups and restore

Backups are created with SQLite's `.backup` API (safe while WAL is active) and checked with `PRAGMA integrity_check`.

To restore one (the app can keep running, but stop it to avoid writes during the swap):

```bash
# 1. Copy the chosen backup out of the named volume
docker compose exec db-maintenance sh -c 'ls -lh /data/backups'

# 2. Stop the writers
docker compose stop app db-maintenance

# 3. Replace the live database (inside the volume)
docker compose run --rm --entrypoint sh db-maintenance -c \
  'cp /data/backups/prod-YYYYMMDD-HHMMSS.db /data/prod.db && sqlite3 /data/prod.db "PRAGMA journal_mode=WAL;"'

# 4. Start again
docker compose up -d app db-maintenance
```

If the backup predates WAL mode, step 3 re-applies it; always confirm with `sqlite3 /data/prod.db "PRAGMA journal_mode;"` → `wal`.

## Scripts

```bash
pnpm dev          # development (Next on :3100)
pnpm build        # production build
pnpm start        # production server
pnpm lint         # ESLint (next/core-web-vitals)
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest: unit + component tests
pnpm test:e2e     # Playwright (starts the server if needed)
pnpm format       # Prettier
```

## Environment variables

| Variable                     | Description                                 | Default                            |
| ---------------------------- | ------------------------------------------- | ---------------------------------- |
| `NODE_ENV`                   | `development` / `production`                | `development`                      |
| `PORT`                       | Next.js port locally                        | `3100`                             |
| `WEB_PORT`                   | Port published by docker-compose            | `3001`                             |
| `DATABASE_URL`               | Prisma URL                                  | `file:./dev.db?connection_limit=1` |
| `REDIS_URL`                  | Redis connection (optional in dev)          | `redis://localhost:6379`           |
| `POKEAPI_BASE`               | PokeAPI base URL                            | `https://pokeapi.co/api/v2`        |
| `POKEAPI_CACHE_TTL_S`        | Default Redis cache TTL (seconds)           | `86400`                            |
| `BETTER_AUTH_SECRET`         | Signing secret (`openssl rand -base64 32`)  | — (required)                       |
| `BETTER_AUTH_URL`            | Public app URL (Tailscale Funnel in prod)   | `http://localhost:3100`            |
| `REQUIRE_EMAIL_VERIFICATION` | Require a verified email to sign in         | `false`                            |
| `RESEND_API_KEY`             | Resend API key (only if verification is on) | — (optional)                       |
| `EMAIL_FROM`                 | Verified Resend sender (if verification on) | — (optional)                       |
| `NEXT_PUBLIC_APP_NAME`       | Name shown in the UI                        | `CompetiDex`                       |

Only `.env.example` is committed; never push a real `.env`.

## Registration policy

By default **sign-up is open and does not require email verification** (that would need a sending domain, which the Funnel hostname cannot provide). Abuse is bounded by:

- **5 registrations per hour per IP** at `/api/auth/sign-up/email` (Redis-backed, shared NAT is fine).
- **100 teams / 100 folders per user**.
- **64 KB max request body** on team/folder endpoints and bounded text fields.
- Daily cleanup of expired sessions.

To require verification later, set `REQUIRE_EMAIL_VERIFICATION=true` **and** configure a verified sending domain in Resend (next section).

## Email verification (optional, Resend)

The verification code is already wired but **disabled by default**. When enabled, the app sends the link through [Resend](https://resend.com) (plain REST call, no SDK dependency).

> **The sending domain must be one whose DNS you control.** The `*.ts.net` Funnel hostname cannot be used: `ts.net` is managed by Tailscale, which does not allow publishing the DKIM/SPF/DMARC records Resend requires. Keep `BETTER_AUTH_URL` on the Funnel URL (that is just the app URL) and use a separate domain for `EMAIL_FROM`.
>
> The domain does **not** have to be paid: Resend's free plan verifies custom domains, and any free domain whose DNS you can edit works (for example the one-year free `.me` from the GitHub Student Developer Pack). What Resend needs is control of the DNS zone, not a receipt.

1. Create a Resend account and add your domain in **Domains** → **Add Domain**.
2. Add the DNS records Resend gives you (SPF, DKIM and the MX record for the subdomain). Wait for the domain to show **Verified**.
3. Create an API key in **API Keys** → **Create API Key** (Sending access is enough).
4. Set the variables in `.env`:
   ```bash
   BETTER_AUTH_URL=https://<node>.<tailnet>.ts.net   # public Funnel URL
   REQUIRE_EMAIL_VERIFICATION=true
   RESEND_API_KEY=re_xxxxxxxxx
   EMAIL_FROM="CompetiDex <no-reply@yourdomain.com>"
   ```
5. Restart the app (`docker compose up -d --build app`).

Verification is only enforced when **both** `REQUIRE_EMAIL_VERIFICATION=true` and `RESEND_API_KEY` are set, so a half-configured deployment cannot lock users out. Without `RESEND_API_KEY` the app logs the verification URL to the container log instead of sending it (useful in development: `docker compose logs -f app`).

> **When enabling verification on an existing deployment:** accounts created while it was off stay unverified and cannot sign in. Mark them as verified once:
>
> ```bash
> docker compose stop app
> docker compose run --rm --entrypoint sh db-maintenance -c \
>   "sqlite3 /data/prod.db 'UPDATE user SET emailVerified = 1;'"
> docker compose up -d app
> ```

## Scaling to PostgreSQL (runbook)

SQLite + WAL comfortably handles a few hundred concurrent users. Consider migrating when any of these is true:

- More than ~500 daily active users, or sustained write traffic from team saves.
- p95 latency of `/api/teams` above 500 ms.
- `SQLITE_BUSY` errors keep appearing in the logs after WAL is enabled.

Steps (the schema is already portable: `Json`-like fields are stored as `String`):

1. Add a `postgres:16-alpine` service to `docker-compose.yml` with a named volume and a healthcheck.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `"postgresql"` (keep `binaryTargets` only if you still build for musl).
3. Point `DATABASE_URL` (app and `migrate`) to the Postgres URL.
4. Run `prisma migrate deploy` (the `migrate` service does it automatically) and verify with `prisma migrate status`.
5. Replace the SQLite backup step in `scripts/db-maintenance.sh` with `pg_dump` (keep the 14-day rotation).
6. Rollback: restore the last SQLite backup using the section above and revert the compose/schema changes.

## Testing and CI

- **Unit**: `lib/*.test.ts` (PokeAPI parsing, teams, Poképaste, table filtering, calculator…).
- **Component**: `tests/component/` with Testing Library.
- **E2E**: `tests/e2e/` with Playwright (home, Pokémon entry, calculator, auth).
- **CI** (`.github/workflows/ci.yml`): lint, typecheck, tests, production build and E2E on every push/PR to `main`.
- Husky + lint-staged run lint/typecheck, and commitlint enforces Conventional Commits.

## Project status

Done: PokeAPI data layer + caching, search and Pokémon entries, comparator, team builder with accounts and folders, damage calculator, internationalization and CI.

Pending / future: persistent favourites, an expanded comparator and more import formats.

## License and credits

[MIT](LICENSE) © 2026 Angel_NR. Data and sprites from [PokeAPI](https://pokeapi.co) and [Pokémon Showdown](https://pokemonshowdown.com) (damage calculation). Pokémon is a trademark of Nintendo / Game Freak / The Pokémon Company; this project is not affiliated with them.
