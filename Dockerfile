# syntax=docker/dockerfile:1.7

# =============================================================================
# Stage 1: deps
# =============================================================================
FROM node:24.22.1-alpine AS deps

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1

RUN corepack enable \
    && corepack prepare pnpm@9.15.0 --activate \
    && apk add --no-cache libc6-compat

WORKDIR /app

# Aprovechar caché de capas: copiar primero manifestos
COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# =============================================================================
# Stage 2: builder
# =============================================================================
FROM node:24.22.1-alpine AS builder

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    DATABASE_URL=file:./build.db \
    BETTER_AUTH_SECRET=build-time-placeholder

RUN corepack enable \
    && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables públicas necesarias en build (las no-NEXT_PUBLIC_ se leen en runtime)
ARG NEXT_PUBLIC_APP_NAME=CompetiDex
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

# Generar el cliente Prisma (necesario para tipar y para el runtime)
RUN pnpm prisma generate

RUN pnpm build

# =============================================================================
# Stage 3: migrate (aplica migraciones; servicio one-shot en compose)
# =============================================================================
FROM deps AS migrate

WORKDIR /app

# sqlite3 CLI para fijar WAL (persistente en el fichero) tras las migraciones.
# /data debe ser escribible por el mismo uid que el runner (nextjs = 1001)
RUN apk add --no-cache sqlite \
    && mkdir -p /data && chown 1001:1001 /data

# Solo se necesita el esquema/migraciones + el CLI de Prisma (ya en node_modules)
COPY prisma ./prisma

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma && sqlite3 /data/prod.db 'PRAGMA journal_mode=WAL;'"]

# =============================================================================
# Stage 4: maintenance (limpieza de sesiones + backups SQLite)
# Se ejecuta como servicio aparte; no forma parte de la imagen final.
# =============================================================================
FROM deps AS maintenance

WORKDIR /app

# sqlite3 CLI: backups vía `.backup` (seguro con WAL) e integrity_check.
RUN apk add --no-cache sqlite \
    && mkdir -p /data && chown 1001:1001 /data

COPY prisma ./prisma
COPY scripts ./scripts

# Cliente Prisma generado para el script de limpieza de sesiones.
RUN pnpm prisma generate

CMD ["sh", "scripts/db-maintenance.sh"]

# =============================================================================
# Stage 5: runner (imagen final mínima)
# =============================================================================
FROM node:24.22.1-alpine AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3100 \
    HOSTNAME=0.0.0.0

WORKDIR /app

# Usuario non-root
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# openssl es requisito del query engine de Prisma; /data aloja el SQLite
RUN apk add --no-cache openssl \
    && mkdir -p /data \
    && chown nextjs:nodejs /data

# Copiar standalone output + estáticos + messages
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/messages ./messages

USER nextjs

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3100/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]