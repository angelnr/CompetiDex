/**
 * Nombres localizados de áreas de localización (`location-area`) para las
 * lenguas que PokeAPI sí expone: `en`, `fr` y `de`.
 *
 * PokeAPI no ofrece un endpoint batch de nombres ni nombres en `es`/`ja`, así
 * que:
 * - Se piden SOLO las áreas que el cliente necesita (las de la versión
 *   mostrada en la tabla de encuentros).
 * - Cada área queda cacheada en Redis vía `getLocationArea` (TTL 7d), de modo
 *   que compartir área entre Pokémon es prácticamente gratis.
 * - El español se resuelve en el cliente con el diccionario curado
 *   (`lib/location-names.ts`) y el japonés cae al slug humanizado.
 *
 * Mismo enfoque que `lib/move-names.ts` / `lib/item-names.ts`, pero acotado a
 * las áreas solicitadas en lugar de construir el catálogo completo.
 */

import { getLocationArea } from "@/lib/pokeapi";
import { mapWithConcurrency } from "@/lib/async";

const APP_LOCALES = ["en", "fr", "de"] as const;

export type LocationNameLocale = (typeof APP_LOCALES)[number];

/** `{ [locationAreaId]: { en?, fr?, de? } }`. */
export type LocalizedLocationNames = Record<string, Partial<Record<LocationNameLocale, string>>>;

const FETCH_CONCURRENCY = 8;
/** Tope defensivo: la tabla de encuentros usa muchas menos áreas. */
export const MAX_LOCATION_AREAS = 120;

/**
 * Devuelve los nombres localizados (en/fr/de) de las áreas indicadas,
 * claveados por su id. Las áreas que fallan se omiten y el cliente cae al
 * slug humanizado.
 */
export async function getLocalizedLocationNames(
  identifiers: Array<string | number>,
): Promise<LocalizedLocationNames> {
  const unique = Array.from(new Set(identifiers.map(String))).slice(0, MAX_LOCATION_AREAS);

  const entries = await mapWithConcurrency(unique, FETCH_CONCURRENCY, async (id) => {
    const names: Partial<Record<LocationNameLocale, string>> = {};
    try {
      const area = await getLocationArea(id);
      for (const locale of APP_LOCALES) {
        const hit = area.names.find((n) => n.language.name === locale);
        if (hit) names[locale] = hit.name;
      }
    } catch {
      // Área sin detalle en PokeAPI: se omite y el cliente cae al fallback.
    }
    return [id, names] as const;
  });

  return Object.fromEntries(entries);
}
