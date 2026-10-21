import Redis, { type RedisOptions } from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __competidexRedis: Redis | undefined;
}

const DEFAULT_TTL_S = Number(process.env.POKEAPI_CACHE_TTL_S) || 86_400;

let _redisUnavailableLogged = false;
let _lastRedisErrorLoggedAt = 0;
const REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

function shouldSkipCache(): boolean {
  return !process.env.REDIS_URL;
}

function buildOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => {
      if (times > 3) return null; // stop retrying
      return Math.min(times * 200, 1000);
    },
  };
}

/**
 * Singleton de Redis.
 * Retorna `null` si REDIS_URL no está definida.
 */
export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) {
    if (!_redisUnavailableLogged) {
      console.warn("[redis] REDIS_URL no definida — caché desactivado");
      _redisUnavailableLogged = true;
    }
    return null;
  }

  if (globalThis.__competidexRedis) {
    return globalThis.__competidexRedis;
  }

  const client = new Redis(process.env.REDIS_URL, buildOptions());

  client.on("error", (err) => {
    // Throttle: si Redis está caído, no inundar el log en cada reintento.
    const now = Date.now();
    if (now - _lastRedisErrorLoggedAt >= REDIS_ERROR_LOG_INTERVAL_MS) {
      console.error("[redis] error de conexión:", err.message);
      _lastRedisErrorLoggedAt = now;
    }
  });

  globalThis.__competidexRedis = client;
  return client;
}

/** Cerrar conexión (útil en tests / apagado controlado). */
export async function closeRedis(): Promise<void> {
  const client = globalThis.__competidexRedis;
  if (!client) return;
  await client.quit();
  globalThis.__competidexRedis = undefined;
}

/** Anti-stampede: lock por clave para que solo un proceso compute el miss. */
const LOCK_TTL_S = 10;
const LOCK_WAIT_ATTEMPTS = 10;
const LOCK_WAIT_MS = 200;

type CacheRead<T> = { hit: true; value: T } | { hit: false };

async function readCached<T>(redis: Redis, key: string): Promise<CacheRead<T>> {
  try {
    const cached = await redis.get(key);
    if (cached !== null) return { hit: true, value: JSON.parse(cached) as T };
    return { hit: false };
  } catch {
    // Si el payload cacheado está corrupto, invalida y re-computa
    await redis.del(key).catch(() => {});
    return { hit: false };
  }
}

/**
 * Lee una clave cacheada como JSON o la computa y almacena.
 * Si Redis no está disponible, ejecuta el producer sin cachear.
 *
 * Si varios procesos piden la misma clave fría a la vez, solo uno computa
 * (lock `SET NX`); el resto espera a que aparezca el valor cacheado. Si la
 * espera expira, computa igualmente: mejor lento que un error.
 *
 * @param key Clave Redis (recomendado prefijo por dominio: `pokeapi:pokemon:1`).
 * @param producer Función que produce el valor si hay miss de caché.
 * @param ttlSeconds TTL del SETEX. Default: `POKEAPI_CACHE_TTL_S` o 86400.
 */
export async function getOrSet<T>(
  key: string,
  producer: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_S,
): Promise<T> {
  const redis = getRedis();
  if (!redis) return producer();

  const initial = await readCached<T>(redis, key);
  if (initial.hit) return initial.value;

  let hasLock = false;
  try {
    hasLock = (await redis.set(`lock:${key}`, "1", "EX", LOCK_TTL_S, "NX")) === "OK";
  } catch {
    // Sin lock disponible (Redis intermitente): computar igualmente.
    hasLock = true;
  }

  if (!hasLock) {
    for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_MS));
      const waited = await readCached<T>(redis, key);
      if (waited.hit) return waited.value;
    }
    // El ganador tarda demasiado o falló: computamos nosotros.
  }

  try {
    const fresh = await producer();
    await redis.setex(key, ttlSeconds, JSON.stringify(fresh)).catch(() => {});
    return fresh;
  } finally {
    if (hasLock) await redis.del(`lock:${key}`).catch(() => {});
  }
}

/** Invalidación explícita de una clave. No-op si no hay Redis. */
export async function invalidate(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(key).catch(() => {});
}

/** Invalidación por patrón (SCAN paginado). No-op si no hay Redis. */
export async function invalidatePattern(pattern: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  let cursor = "0";
  let deleted = 0;
  try {
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length > 0) {
        deleted += await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // Si Redis falla, devolver lo que se haya borrado hasta ahora
  }
  return deleted;
}
