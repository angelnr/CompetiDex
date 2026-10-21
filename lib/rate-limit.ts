import { getRedis } from "@/lib/redis";

let lastErrorLoggedAt = 0;
const ERROR_LOG_INTERVAL_MS = 30_000;

/**
 * Rate limit de ventana fija respaldado por Redis (`INCR` + `EXPIRE`).
 *
 * - Sin Redis (dev sin `REDIS_URL`) no se limita.
 * - Si Redis falla, se permite la petición (degradar abierto) para no tumbar
 *   la app cuando el caché se reinicia; el error se logea con throttle.
 *
 * @param bucket Identificador lógico, p. ej. `pokemon:<ip>`.
 * @param limit Máximo de peticiones permitidas en la ventana.
 * @param windowSeconds Duración de la ventana en segundos.
 * @returns `true` si la petición está permitida.
 */
export async function checkRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;

  try {
    const key = `ratelimit:${bucket}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= limit;
  } catch (err) {
    const now = Date.now();
    if (now - lastErrorLoggedAt >= ERROR_LOG_INTERVAL_MS) {
      console.error("[rate-limit] error de Redis:", err instanceof Error ? err.message : err);
      lastErrorLoggedAt = now;
    }
    return true;
  }
}
