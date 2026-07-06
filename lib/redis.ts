import Redis, { type RedisOptions } from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __competidexRedis: Redis | undefined;
}

const DEFAULT_TTL_S = Number(process.env.POKEAPI_CACHE_TTL_S) || 86_400;

function resolveRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "REDIS_URL no definida en entorno de production. Revisa .env / docker-compose.",
      );
    }
    // Dev fallback para no bloquear el boot sin Redis local en el host
    return "redis://localhost:6379";
  }
  return url;
}

function buildOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  };
}

/**
 * Singleton de Redis reutilizado entre hot-reloads de Next.
 * En runtime serverless sin global, instancia nueva por invocación.
 */
export function getRedis(): Redis {
  if (globalThis.__competidexRedis) {
    return globalThis.__competidexRedis;
  }
  const client = new Redis(resolveRedisUrl(), buildOptions());

  client.on("error", (err) => {
    console.error("[redis] error de conexión:", err.message);
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__competidexRedis = client;
  }
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

  const cached = await redis.get(key);
  if (cached !== null) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      // Si el payload cacheado está corrupto, invalidamos y re-computamos
      await redis.del(key);
    }
  }

  const fresh = await producer();
  await redis.setex(key, ttlSeconds, JSON.stringify(fresh));
  return fresh;
}

/** Invalidación explícita de una clave. */
export async function invalidate(key: string): Promise<void> {
  await getRedis().del(key);
}

/** Invalidación por patrón (keys con SCAN, no KEYS). */
export async function invalidatePattern(pattern: string): Promise<number> {
  const redis = getRedis();
  let cursor = "0";
  let deleted = 0;

  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = next;
    if (keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== "0");

  return deleted;
}
