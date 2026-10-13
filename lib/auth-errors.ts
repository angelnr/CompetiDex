/**
 * Traduce los errores de Better Auth (objeto `{ message, code, status }` o
 * error lanzado) a una clave del namespace i18n `auth`.
 *
 * Centralizar aquí evita el bug de mostrar siempre el mensaje genérico:
 * Better Auth devuelve códigos como `PASSWORD_TOO_SHORT` o
 * `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` que hay que mapear explícitamente.
 */
export function readAuthErrorKey(err: unknown): string {
  const e = (err ?? {}) as { message?: unknown; code?: unknown; status?: unknown };
  const text = [
    typeof e.message === "string" ? e.message : "",
    typeof e.code === "string" ? e.code : "",
  ]
    .join(" ")
    .toLowerCase();

  if (/already.?exists|ya existe|user_exists/.test(text)) return "errorEmailExists";
  if (/too short|password_too_short|password.*(short|length)/.test(text)) {
    return "errorPasswordTooShort";
  }
  if (/invalid|incorrect|credential|not found/.test(text)) return "errorInvalidCredentials";
  if (e.status === 429 || /rate|too many/.test(text)) return "errorRateLimited";
  return "errorGeneric";
}
