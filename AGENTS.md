# AGENTS.md

Guía de referencia para cualquier agente (humano o IA) que trabaje en **CompetiDex**.
Léela completa antes de tocar código. Síguela estrictamente para mantener consistencia
entre contribuyentes y sesiones.

---

## 1. Visión del proyecto

**CompetiDex** es una aplicación web all-in-one construida sobre [PokeAPI](https://pokeapi.co)
que pretende ser una Pokédex más completa de lo habitual: no solo sprite + tipo,
sino stats, evoluciones, habilidades, movimientos, debilidades y (a futuro)
comparador, favoritos, equipos y calculadora de efectividades.

Objetivos no funcionales:

- **Performance**: SSR/SSG + caché agresiva (TanStack Query + Redis).
- **SEO**: HTML renderizado server-side para fichas de Pokémon.
- **DX reproducible**: contenedores Docker + `pnpm` obligatorio.
- **Tipado estricto end-to-end**: TypeScript `strict: true`, sin `any` salvo justificado.

---

## 2. Stack tecnológico (lock)

| Capa                      | Tecnología                                |
| ------------------------- | ----------------------------------------- |
| Runtime / Package manager | Node 20 LTS + **pnpm** (obligatorio)      |
| Framework                 | Next.js 14 App Router                     |
| Lenguaje                  | TypeScript estricto                       |
| Estilos                   | Tailwind CSS + shadcn/ui + lucide-react   |
| Data fetching cliente     | TanStack Query (React Query)              |
| Caché servidor            | Redis 7 (`ioredis`)                       |
| ORM / DB                  | Prisma + SQLite (preparado para Postgres) |
| Validación                | Zod                                       |
| Testing                   | Vitest + Testing Library + Playwright     |
| Calidad                   | ESLint (next/core-web-vitals) + Prettier  |
| Hooks                     | Husky + lint-staged + commitlint          |
| Contenedores              | Docker multi-stage + docker-compose       |
| CI/CD                     | GitHub Actions                            |

**Reglas de stack inquebrantables:**

- NUNCA uses `npm` o `yarn`. Siempre `pnpm`.
- NUNCA instales una librería que duplique una existente (p.ej. no otro state
  manager si ya tenemos Zustand; no otro cliente HTTP si ya tenemos fetch nativo
  - TanStack Query).
- Antes de añadir una dependencia, justifica por qué no se puede resolver con lo
  existente.

---

## 3. Estructura del proyecto

```
CompetiDex/
├── app/                      # App Router (rutas + layouts)
│   ├── (pages)/
│   │   ├── page.tsx          # Home: buscador + grid
│   │   ├── pokemon/[id]/    # Ficha detallada (SSG/ISR)
│   │   └── layout.tsx
│   ├── api/
│   │   └── pokemon/route.ts # Proxy cacheado a PokeAPI
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                  # Componentes shadcn/ui
│   └── pokemon/             # PokemonCard, PokemonGrid, SearchBar, TypeBadge, StatBar, EvolutionChain
├── lib/
│   ├── pokeapi.ts           # Cliente tipado a PokeAPI
│   ├── redis.ts             # Cliente ioredis singleton
│   └── queries.ts           # Hooks de TanStack Query
├── hooks/
├── prisma/
│   └── schema.prisma
├── tests/
│   ├── unit/
│   ├── component/
│   └── e2e/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── .nvmrc
└── package.json
```

### Convenciones de carpetas

- `app/` → solo rutas y layouts. **Lógica de negocio vive en `lib/`**.
- `components/ui/` → solo shadcn. No modificar a mano salvo wrapper inevitable.
- `components/<dominio>/` → componentes de feature (ej. `pokemon/`).
- `lib/` → clientes, tipos, utilidades puras (sin JSX).
- `hooks/` → hooks reutilizables de UI; los hooks de data van en `lib/queries.ts`.

---

## 4. Buenas prácticas obligatorias

### 4.1 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Sin `any`. Si es inevitable, comentar con `// eslint-disable-next-line` y justificar.
- Tipar respuestas de PokeAPI en `lib/pokeapi.ts`. No usar `unknown` sin discriminar.
- Usar `type` para tipos utilitarios y `interface` para objetos extensibles (consistencia).

### 4.2 Data fetching & caching

- **Toda** llamada a PokeAPI debe pasar por el proxy `/api/pokemon` (con Redis)
  o por un helper que consulte Redis primero.
- Nunca hacer `fetch` directo a `pokeapi.co` desde el cliente.
- TanStack Query: `staleTime` alto (p.ej. `Infinity` para datos estáticos de Pokémon).
- TTL de Redis: 24h para Pokémon/species/evolution-chain; 7d para tipos.

### 4.3 Componentes

- Funcionales + hooks. Sin class components.
- Props tipadas con `interface`. Sin `React.FC`.
- Composición > herencia. Usar `children` y slots.
- Server Components por defecto; añadir `"use client"` solo si es necesario
  (estado, eventos, `useEffect`, TanStack Query).
- Accesibilidad: todo input con `label`, botones con `aria-label` si solo icono,
  navegación por teclado, `alt` en imágenes (`next/image`).

### 4.4 Estilos

- Solo Tailwind. Sin CSSModules, sin CSS inplace (`style={{}}`).
- Variantes por `cva` (shadcn/ui). Sin clases dinámicas con interpolación de strings.
- Tema dark/light soportado desde el día 1 (`next-themes`).
- Colores de tipos definidos en `lib/pokemon-types.ts` (única fuente de verdad).

### 4.5 Errores y loading

- Todo componente con datos asíncrono debe renderizar `Skeleton` y estado de error.
- Errores se logean con `console.error` en server y se muestran al usuario con
  `ErrorState` component. (Sentry en el roadmap.)

### 4.6 Seguridad

- Nunca commitear `.env`. Solo `.env.example` con valores ficticios.
- Nunca logear secrets, tokens, o respuestas completas de PokeAPI.
- Validar input usuario con Zod. Nunca confianza en tipos de cliente.

### 4.7 Performance

- `next/image` siempre; `images.remotePatterns` para `raw.githubusercontent.com/PokeAPI/sprites`.
- `next/font` para fuentes (sin Google Fonts directas).
- Code splitting natural de Next; no `dynamic()` salvo justificación.
- SSG/ISR para fichas: `generateStaticParams` para Gen 1-5; on-demand para el resto.

---

## 5. Pruebas

- **Unitarias** (Vitest): `lib/` y helpers puros. Mock de `fetch` e `ioredis`.
- **Componentes** (Vitest + Testing Library): smoke tests de `PokemonCard`,
  `SearchBar`, `PokemonGrid`, `StatBar`. Sin snapshots salvo casos puntuales.
- **E2E** (Playwright): flujo home → búsqueda → ficha → navegación anterior/siguiente.
- Cobertura mínima: no hay umbral duro, pero **ningún nuevo helper de `lib/`**
  puede mergearse sin test mínimo.

Localización de tests:

- Unitarios junto al código: `lib/pokeapi.test.ts`.
- Componentes: `tests/component/`.
- E2E: `tests/e2e/`.

---

## 6. Control de calidad — comandos canónicos

**Antes de cualquier commit, ejecutar y verificar que pasan:**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- `lint`: ESLint con `next/core-web-vitals` + reglas adicionales del proyecto.
- `typecheck`: `tsc --noEmit`.
- `test`: Vitest en modo watch en dev; modo CI en pipelines.
- `build`: `next build` (valida que no haya errores SSR/SSG).

Husky + lint-staged ejecutan lint y typecheck automáticamente en pre-commit.
Commitlint valida formato Conventional Commits. **No usar `--no-verify`.**

---

## 7. Commits

Conventional Commits estricto:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

- **type**: `feat | fix | refactor | perf | test | docs | style | chore | ci | build`.
- **scope**: `pokeapi | ui | redis | prisma | docker | ci | deps` (u otro acordado).
- **description**: minúscula, imperativo, sin punto final, sin emojis, español o
  inglés (elegir uno y mantener).

Ejemplos válidos:

```
feat(pokeapi): añadir cliente de evolution-chain con caché Redis
fix(ui): corregir overflow en PokemonGrid en móvil
refactor(redis): extraer singleton a lib/redis.ts
test(pokeapi): cubrir edge cases de parseo de sprites
```

Línea de `description`: máx. 72 caracteres. Body: máx. 100 caracteres por línea.

---

## 8. Procedimiento de desarrollo estándar

Antes de escribir código, todo agente debe seguir este orden:

1. **Leer este `AGENTS.md`** + el `package.json` + la estructura actual.
2. **Crear/actualizar rama** con patrón `<type>/<scope>-<short-desc>`
   (ej. `feat/pokeapi-evolution-chain`).
3. **Buscar trabajo previo**: `git log --oneline -20`, `grep` en `lib/` y `components/`.
   No duplicar lo que ya existe.
4. **Implementar por incrementos pequeños**: un componente/helper por commit
   cuando sea posible. Commits grandes requieren justificación en el body.
5. **Tipar primero, UX después**: definir `types` en `lib/pokeapi.ts` antes de
   tocar componentes.
6. **Verificar TODOS los comandos del punto 6**.
7. **Si añades dependencia**: actualiza `package.json` con `pnpm add` (no con
   edición manual) y documenta el porqué en el commit.
8. **Si cambias infraestructura (Docker, env, Redis, Prisma)**: actualiza
   `.env.example` y el `README.md` correspondiente.
9. **Al finalizar un feature/fix**: describir en PR qué se testeó y cómo
   reproducirlo.

### Reglas de no-sorpresa

- No reformatear archivos que no tocas (Prettier corre solo sobre staged files).
- No renombrar archivos sin abrir PR dedicado y justificar.
- No reescribir commits ya pusheados a `main` (no `--force` a `main`).
- No instalar librerías a ciegas: revisar `package.json` y `pnpm-lock.yaml`.

---

## 9. Flujo Docker local

```bash
cp .env.example .env        # ajusta valores
pnpm install                # dependencias host (para IDE/tests locales)
docker compose up --build   # app en :3000 + Redis en :6379
```

- El `Dockerfile` es multi-stage: `deps` → `builder` → `runner`.
- Imagen final basada en `node:20-alpine`, usuario non-root, standalone output.
- Redis persiste en volumen `docker-data/redis` (ignorado por git).

---

## 10. Variables de entorno

Solo `.env.example` se commitea. Variables mínimas esperadas:

| Var                    | Descripción                         | Default dev                 |
| ---------------------- | ----------------------------------- | --------------------------- |
| `NODE_ENV`             | `development` / `production`        | `development`               |
| `PORT`                 | Puerto de Next.js                   | `3000`                      |
| `REDIS_URL`            | URL de conexión a Redis             | `redis://localhost:6379`    |
| `POKEAPI_BASE`         | Base URL de PokeAPI                 | `https://pokeapi.co/api/v2` |
| `POKEAPI_CACHE_TTL_S`  | TTL por defecto en Redis (segundos) | `86400`                     |
| `NEXT_PUBLIC_APP_NAME` | Nombre público mostrado en UI       | `CompetiDex`                |

Al añadir una nueva variable, documentarla aquí y en `.env.example`.

---

## 11. Roadmap / Fases (resumen)

0. Bootstrap (Next + pnpm + Tailwind + shadcn + Husky) — **HECHO**
1. Docker + Redis + .env — **HECHO**
2. Capa de datos PokeAPI (cliente tipado + proxy cacheado) — **HECHO**
3. Home (grid infinito + buscador con debounce) — **HECHO**
4. Ficha detallada del Pokémon — **HECHO**
5. Testing (Vitest + Testing Library + Playwright) — **HECHO**
6. CI/CD en GitHub Actions — **HECHO**
7. _(futuro)_ Favoritos, equipos, comparador, calculadora de efectividades

Al completar una fase, marcar aquí y actualizar CHANGELOG (cuando exista).

---

## 12. Puntos de extensión conocidos

- **Favoritos / Equipos**: modelos ya en `prisma/schema.prisma` (cuando se creen).
  Hook `useFavorites`compatible con localStorage ahora y Prisma después.
- **Comparador**: mantener `components/pokemon/PokemonCompare` placeholder.
- **Postgres**: cambiar `datasource` en `schema.prisma` y `docker-compose.yml`
  para añadir servicio `postgres`. El resto del código no debe tocarcliente.

Cualquier cambio que rompa este contrato debe actualizarse aquí.
