# CompetiDex

Pokédex all-in-one construida sobre [PokeAPI](https://pokeapi.co) con stats, tipos, evoluciones, habilidades, movimientos, debilidades, comparador de Pokémon y calculadora de efectividades.

## Funcionalidades

- **Buscador fuzzy** — busca cualquier Pokémon por nombre con fuzzy matching y navegación por teclado
- **Ficha detallada** — stats, tipos, habilidades, movimientos, cadena evolutiva, debilidades
- **Comparador** — compara dos Pokémon lado a lado (stats, tipos, habilidades)
- **Calculadora de efectividades** — calcula daño x0/x½/x2/x4 entre tipos y Pokémon concretos
- **Team Builder** — crea y persiste equipos en localStorage
- **SSG/ISR** — las fichas de Kanto se pre-renderizan estáticamente; el resto viaja ISR con Redis
- **Cache distribuido** — Redis cache-aside para minimizar llamadas a PokeAPI

## Stack

| Capa           | Tecnología                            |
| -------------- | ------------------------------------- |
| Framework      | Next.js 14 (App Router)               |
| Lenguaje       | TypeScript strict                     |
| Estilos        | Tailwind CSS + shadcn/ui              |
| Data fetching  | TanStack Query                        |
| Caché servidor | Redis 7 (ioredis)                     |
| Base de datos  | Prisma + SQLite                       |
| Testing        | Vitest + Testing Library + Playwright |
| Contenedores   | Docker multi-stage + docker-compose   |

## Requisitos

- Node.js 20 LTS
- pnpm (`npm i -g pnpm`)
- Docker + docker-compose (opcional, para Redis y producción)

## Setup rápido (sin Docker)

```bash
git clone <repo-url>
cd CompetiDex
cp .env.example .env
pnpm install
pnpm dev
```

La app arranca en `http://localhost:3100`. Redis no es necesario en desarrollo (el cliente fallbackea a peticiones directas a PokeAPI).

## Setup con Docker (recomendado para producción)

```bash
cp .env.example .env
pnpm install          # para IDE y tests locales
docker compose up --build
```

App en `:3100`, Redis en `:6379`.

## Comandos útiles

```bash
pnpm dev          # servidor de desarrollo
pnpm build        # build de producción
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # tests unitarios + componentes
pnpm test:e2e     # tests end-to-end (Playwright)
```

## Variables de entorno

| Variable               | Descripción         | Default                     |
| ---------------------- | ------------------- | --------------------------- |
| `PORT`                 | Puerto de Next.js   | `3100`                      |
| `REDIS_URL`            | Conexión a Redis    | `redis://localhost:6379`    |
| `POKEAPI_BASE`         | Base URL de PokeAPI | `https://pokeapi.co/api/v2` |
| `POKEAPI_CACHE_TTL_S`  | TTL de caché Redis  | `86400`                     |
| `DATABASE_URL`         | Ruta SQLite         | `file:./dev.db`             |
| `NEXT_PUBLIC_APP_NAME` | Nombre en UI        | `CompetiDex`                |
