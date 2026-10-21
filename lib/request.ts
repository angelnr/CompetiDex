/**
 * Lectura acotada de cuerpos JSON en Route Handlers.
 *
 * Next.js no impone un límite de tamaño en `request.json()`; sin este helper,
 * un POST de cientos de MB provoca un pico de memoria antes de que Zod lo
 * rechace. Se comprueba `Content-Length` y, si no es fiable (chunked), se lee
 * el stream y se corta al superar el límite.
 */
export class PayloadTooLargeError extends Error {
  constructor() {
    super("payload demasiado grande");
    this.name = "PayloadTooLargeError";
  }
}

/** 64 KB cubren de sobra un equipo completo (6 miembros) o una carpeta. */
export const MAX_JSON_BODY_BYTES = 64 * 1024;

export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new PayloadTooLargeError();
  }

  if (!request.body) {
    throw new SyntaxError("payload JSON inválido");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SyntaxError("payload JSON inválido");
  }
}
