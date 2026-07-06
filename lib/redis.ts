import Redis, { type RedisOptions } from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __competidexRedis: Redis | undefined;
}

const DEFAULT_TTL_S = Number(process.env.POKEAPI_CACHE_TTL_S) || 86_400;

let _redisUnavailableLogged = false;

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
    console.error("[redis] error de conexión:", err.message);
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

/**
 * Lee una clave cacheada como JSON o la computa y almacena.
 * Si Redis no está disponible, ejecuta el producer sin cachear.
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

  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Si el payload cacheado está corrupto, invalida y re-computa
    await redis.del(key).catch(() => {});
  }

  const fresh = await producer();
  await redis.setex(key, ttlSeconds, JSON.stringify(fresh)).catch(() => {});
  return fresh;
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
