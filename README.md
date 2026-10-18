# CompetiDex

Pokédex competitiva todo-en-uno: consulta fichas completas, compara Pokémon, calcula daños y monta equipos de 6 con un editor estilo Showdown (import/export Poképaste). Next.js 14 sobre [PokeAPI](https://pokeapi.co) con caché Redis, cuentas de usuario y 5 idiomas.

> Proyecto personal en desarrollo activo.

## Funcionalidades

### Pokédex

- **Buscador fuzzy** con navegación por teclado; incluye formas mega, regionales y de género.
- **Ficha completa** (`/pokemon/:id`): artwork oficial con interruptor shiny, selector de mega, tipos, habilidades con descripción, efectividades defensivas, stats base, cadena evolutiva, movimientos por juego con su efecto, encuentros/localizaciones y calculadora de estadísticas.
- **Habilidades** con página propia (`/habilidad/:id`).

### Herramientas

- **Comparador** (`/comparar`): dos Pokémon lado a lado con stats, tipos, habilidades, debilidades y matriz de cobertura.
- **Calculadora de daño** (`/calculadora`): basada en `@smogon/calc`. Sets manuales o cargados desde tus equipos, nivel, clima, terreno, trampas, pantallas, crítico, boosts, porcentaje de daño y KO estimado. La antigua página de efectividades redirige aquí.

### Constructor de equipos

- **6 slots** con reordenación por drag & drop y modo **Estándar** o **Champions** (límites de EV propios).
- **Set completo por Pokémon**: objeto con descripción, habilidad, naturaleza (muestra qué stat sube/baja y la colorea), IVs, sliders de EV con la **stat total calculada** (base + IVs + EVs + naturaleza) y 4 movimientos.
- **Buscador de movimientos** con nombres localizados, tooltip con el efecto, `Tab` para confirmar y saltar al siguiente, y tabla completa (“ver todos”) **ordenable por cualquier columna** y **filtrable por tipo/categoría** (`Hada, Eléctrico`, `Físico`…).
- **Cambio de especie** dentro del editor sin tener que quitar y volver a añadir.
- **Exportar / Importar Poképaste** (formato Showdown), con avisos de lo que no se reconoce.
- **Persistencia**: invitado en `localStorage`; con cuenta en base de datos (Better Auth, email + contraseña). Carpetas jerárquicas (3 niveles), renombrar/mover/borrar equipos y carpetas, e importación de los equipos locales al iniciar sesión.

### Transversal

- 5 idiomas con `next-intl`: español, inglés, francés, alemán y japonés.
- Tema claro/oscuro, diseño responsive y accesibilidad (labels, `aria`, navegación por teclado).
- SSR/ISR para SEO y caché Redis cache-aside para minimizar llamadas a PokeAPI (24 h fichas, 7 d tipos/movimientos/objetos).
- Nombres localizados con correcciones curadas cuando PokeAPI está desactualizado (p. ej. _Ice Shard_ → “Canto Helado”) y diccionario offline de ubicaciones para `es`/`ja`.

## Stack

| Capa            | Tecnología                                          |
| --------------- | --------------------------------------------------- |
| Framework       | Next.js 14 (App Router)                             |
| Lenguaje        | TypeScript strict                                   |
| Estilos         | Tailwind CSS + shadcn/ui + lucide-react             |
| Data fetching   | TanStack Query                                      |
| Caché servidor  | Redis 7 (`ioredis`)                                 |
| Base de datos   | Prisma + SQLite (preparado para Postgres)           |
| Autenticación   | Better Auth (email + contraseña)                    |
| Validación      | Zod                                                 |
| Cálculo de daño | `@smogon/calc`                                      |
| i18n            | `next-intl` (es/en/fr/de/ja)                        |
| Testing         | Vitest + Testing Library + Playwright               |
| Contenedores    | Docker multi-stage + docker-compose                 |
| CI/CD           | GitHub Actions (lint, typecheck, tests, build, e2e) |

## Estructura del proyecto

```
app/
├── [locale]/(pages)/          # home, pokemon/:id, habilidad/:id, comparar,
│                              # calculadora, equipos, equipos/:id, acceder
├── api/pokemon/               # proxy cacheado a PokeAPI
├── api/teams/ · api/folders/  # CRUD de equipos y carpetas
└── api/auth/                  # Better Auth
components/
├── pokemon/                   # ficha, buscador, comparador, editor de equipo…
├── teams/                     # carpetas, importación, diálogos
├── calc/                      # calculadora de daño
└── ui/                        # shadcn/ui
lib/
├── pokeapi.ts · queries.ts    # cliente tipado + hooks de datos
├── moveset.ts · movepool-*    # movepool y orden/filtros de la tabla
├── team.ts · team-schema.ts   # modelo y validación de equipos
├── pokepaste.ts               # export/import Showdown
├── calc/                      # motor de la calculadora
└── server/                    # acceso a datos (Prisma)
hooks/ · messages/ · prisma/ · tests/ (component + e2e)
```

## Requisitos

- Node.js 20 LTS y pnpm 9 (`npm i -g pnpm@9`).
- Docker + Docker Compose (recomendado para producción).
- Redis es opcional en desarrollo: si no está disponible, se salta la caché.

## Setup rápido (sin Docker)

```bash
git clone git@github.com:angelnr/CompetiDex.git
cd CompetiDex
cp .env.example .env      # ajusta BETTER_AUTH_SECRET
pnpm install
pnpm prisma generate
pnpm prisma migrate dev   # crea SQLite con usuarios, equipos y carpetas
pnpm dev
```

La app arranca en `http://localhost:3100`. Sin Redis sigue funcionando (las peticiones van directas a PokeAPI).

## Setup con Docker (recomendado)

```bash
cp .env.example .env      # BETTER_AUTH_SECRET es obligatorio
docker compose up --build
```

- App: `http://localhost:3001` (configurable con `WEB_PORT`).
- Redis: interno del compose (sin puerto publicado).
- SQLite persiste en el volumen `sqlite-data`; el servicio one-shot `migrate` aplica `prisma migrate deploy` antes de arrancar la app.

## Scripts

```bash
pnpm dev          # desarrollo (Next en :3100)
pnpm build        # build de producción
pnpm start        # servidor de producción
pnpm lint         # ESLint (next/core-web-vitals)
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest: unitarios + componentes
pnpm test:e2e     # Playwright (levanta el server si hace falta)
pnpm format       # Prettier
```

## Variables de entorno

| Variable               | Descripción                                  | Default                     |
| ---------------------- | -------------------------------------------- | --------------------------- |
| `NODE_ENV`             | `development` / `production`                 | `development`               |
| `PORT`                 | Puerto de Next.js en local                   | `3100`                      |
| `WEB_PORT`             | Puerto publicado por docker-compose          | `3001`                      |
| `DATABASE_URL`         | URL de Prisma                                | `file:./dev.db`             |
| `REDIS_URL`            | Conexión a Redis (opcional en dev)           | `redis://localhost:6379`    |
| `POKEAPI_BASE`         | Base URL de PokeAPI                          | `https://pokeapi.co/api/v2` |
| `POKEAPI_CACHE_TTL_S`  | TTL por defecto de caché Redis (segundos)    | `86400`                     |
| `BETTER_AUTH_SECRET`   | Secreto de firma (`openssl rand -base64 32`) | — (obligatorio)             |
| `BETTER_AUTH_URL`      | URL pública de la app                        | `http://localhost:3100`     |
| `NEXT_PUBLIC_APP_NAME` | Nombre mostrado en la UI                     | `CompetiDex`                |

Solo se commitea `.env.example`; nunca subas un `.env` real.

## Testing y CI

- **Unitarios**: `lib/*.test.ts` (parseo de PokeAPI, equipos, Poképaste, filtros, calculadora…).
- **Componentes**: `tests/component/` con Testing Library.
- **E2E**: `tests/e2e/` con Playwright (home, ficha, calculadora, auth).
- **CI** (`.github/workflows/ci.yml`): lint, typecheck, tests, build de producción y E2E en cada push/PR a `main`.
- Husky + lint-staged ejecutan lint/typecheck y commitlint valida Conventional Commits.

## Estado del proyecto

Completado: capa de datos PokeAPI + caché, buscador y fichas, comparador, constructor de equipos con cuenta y carpetas, calculadora de daño, internacionalización y CI.

Pendiente / futuro: favoritos persistentes, comparador ampliado y más formatos de importación.

## Licencia y créditos

[MIT](LICENSE) © 2026 Angel_NR. Datos y sprites de [PokeAPI](https://pokeapi.co) y [Pokémon Showdown](https://pokemonshowdown.com) (cálculo de daño). Pokémon es una marca de Nintendo / Game Freak / The Pokémon Company; este proyecto no está afiliado a ellos.
