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
pnpm dev
```

The app runs at `http://localhost:3100`. It keeps working without Redis (requests go straight to PokeAPI).

## Docker setup (recommended)

```bash
cp .env.example .env      # BETTER_AUTH_SECRET is required
docker compose up --build
```

- App: `http://localhost:3001` (configurable through `WEB_PORT`).
- Redis: internal to the compose network (no published port).
- SQLite persists in the `sqlite-data` volume; the one-shot `migrate` service runs `prisma migrate deploy` before the app starts.

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

| Variable               | Description                                | Default                     |
| ---------------------- | ------------------------------------------ | --------------------------- |
| `NODE_ENV`             | `development` / `production`               | `development`               |
| `PORT`                 | Next.js port locally                       | `3100`                      |
| `WEB_PORT`             | Port published by docker-compose           | `3001`                      |
| `DATABASE_URL`         | Prisma URL                                 | `file:./dev.db`             |
| `REDIS_URL`            | Redis connection (optional in dev)         | `redis://localhost:6379`    |
| `POKEAPI_BASE`         | PokeAPI base URL                           | `https://pokeapi.co/api/v2` |
| `POKEAPI_CACHE_TTL_S`  | Default Redis cache TTL (seconds)          | `86400`                     |
| `BETTER_AUTH_SECRET`   | Signing secret (`openssl rand -base64 32`) | — (required)                |
| `BETTER_AUTH_URL`      | Public app URL                             | `http://localhost:3100`     |
| `NEXT_PUBLIC_APP_NAME` | Name shown in the UI                       | `CompetiDex`                |

Only `.env.example` is committed; never push a real `.env`.

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
