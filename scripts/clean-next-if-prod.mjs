import { existsSync, rmSync } from "node:fs";

/**
 * `next build` (producción) y `next dev` comparten el directorio `.next`.
 * Arrancar `next dev` sobre artefactos de producción deja un manifest de
 * assets inconsistente y el CSS devuelve 404 (HTML sin estilos).
 *
 * Este `predev` elimina `.next` únicamente si detecta un `BUILD_ID`, que solo
 * genera la build de producción; en arranques de dev normales no hace nada.
 */
if (existsSync(".next/BUILD_ID")) {
  rmSync(".next", { recursive: true, force: true });
  console.log("[dev] Artefactos de producción detectados en .next — limpiados.");
}