/**
 * Overrides curados de nombres de movimientos.
 *
 * PokeAPI conserva nombres oficiales desactualizados en algunos idiomas (p. ej.
 * el español de `ice-shard` sigue siendo "Esquirla Helada", renombrado a
 * "Canto Helado" en la octava generación). Se corrige en un único punto del
 * servidor (`getMove`) para que todas las superficies —picker del editor,
 * tooltips, movepool y diccionario de nombres— usen el mismo texto.
 *
 * Añadir una entrada solo cuando el nombre de PokeAPI sea incorrecto o esté
 * desactualizado respecto al oficial actual.
 */

import type { Move } from "@/lib/pokeapi";

/** Locales soportados por la app (ver i18n/routing.ts). */
type MoveNameLocale = "es" | "en" | "fr" | "de" | "ja";

export const MOVE_NAME_OVERRIDES: Record<string, Partial<Record<MoveNameLocale, string>>> = {
  "ice-shard": { es: "Canto Helado" },
};

/**
 * Aplica los overrides al array `names` de un movimiento: reemplaza la entrada
 * del idioma si ya existe y la añade si falta. No muta el objeto original.
 */
export function applyMoveNameOverrides(move: Move): Move {
  const overrides = MOVE_NAME_OVERRIDES[move.name];
  if (!overrides) return move;

  const names = [...move.names];
  for (const [locale, value] of Object.entries(overrides) as [MoveNameLocale, string][]) {
    if (!value) continue;
    const index = names.findIndex((n) => n.language.name === locale);
    if (index >= 0) {
      names[index] = { ...names[index]!, name: value };
    } else {
      // La URL del recurso de idioma no la consume ningún cliente.
      names.push({ name: value, language: { name: locale, url: "" } });
    }
  }

  return { ...move, names };
}
