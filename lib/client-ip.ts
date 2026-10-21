/**
 * IP del cliente cuando la app está detrás de Tailscale Funnel.
 *
 * El contenedor solo escucha en 127.0.0.1, así que el único ingress posible es
 * tailscaled. Las versiones recientes de Tailscale inyectan la IP real en
 * `X-Forwarded-For`; el último valor de la cadena es el que añade nuestro
 * proxy de confianza (los anteriores podrían venir del cliente).
 *
 * Si el header no está, se devuelve `"unknown"`: nunca se omite el rate limit,
 * solo se agrupa a esos clientes en un mismo bucket (fail-closed).
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  const parts = forwarded
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? "unknown";
}
