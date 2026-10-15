/**
 * Nombres localizados de áreas de localización (`location-area`).
 *
 * PokeAPI reparte los idiomas en dos recursos:
 * - El **área** (`/location-area/{id}`) suele traer `en`/`fr`/`de`, a veces con
 *   el sufijo de zona ya incluido ("Stony Wilderness (Area 2)").
 * - La **localización padre** (`/location/{name}`) es donde aparecen `es`/`ja`
 *   (y otras), aunque solo en algunas regiones: Hoenn, Kalos, Alola y, como
 *   `ja-hrkt`, Unova. En Kanto/Johto/Sinnoh/Galar/Hisui/Paldea no hay es/ja
 *   upstream: el español cae al diccionario curado (`lib/location-names.ts`) y
 *   el japonés al slug humanizado.
 *
 * Se piden SOLO las áreas que el cliente necesita (las de la versión mostrada
 * en la tabla de encuentros) y tanto áreas como localizaciones quedan cacheadas
 * en Redis (TTL 7d). Mismo enfoque que `lib/move-names.ts` / `lib/item-names.ts`.
 */

import { getLocation, getLocationArea } from "@/lib/pokeapi";
import { mapWithConcurrency } from "@/lib/async";
import type { LocationNameLocale } from "@/lib/location-names";

export type { LocationNameLocale };

/** Idiomas de la app que se intentan extraer de PokeAPI. */
const POKEAPI_LOCALES: readonly LocationNameLocale[] = ["en", "fr", "de", "es", "ja"];

/** Variantes que PokeAPI usa cuando no hay entrada del idioma principal. */
const LOCALE_FALLBACKS: Partial<Record<LocationNameLocale, readonly string[]>> = {
  ja: ["ja-hrkt"],
  es: ["es-419"],
};

/** `{ [locationAreaId]: { en?, fr?, de?, es?, ja? } }`. */
export type LocalizedLocationNames = Record<string, Partial<Record<LocationNameLocale, string>>>;

const FETCH_CONCURRENCY = 8;
/** Tope defensivo: la tabla de encuentros usa muchas menos áreas. */
export const MAX_LOCATION_AREAS = 120;

interface NameEntry {
  name: string;
  language: { name: string };
}

/** Rellena los idiomas que aún falten, sin pisar los ya resueltos. */
function fillMissingNames(
  target: Partial<Record<LocationNameLocale, string>>,
  entries: readonly NameEntry[],
): void {
  const byLanguage = new Map(entries.map((n) => [n.language.name.toLowerCase(), n.name]));
  for (const locale of POKEAPI_LOCALES) {
    if (target[locale] !== undefined) continue;
    for (const candidate of [locale, ...(LOCALE_FALLBACKS[locale] ?? [])]) {
      const hit = byLanguage.get(candidate);
      if (hit) {
        target[locale] = hit;
        break;
      }
    }
  }
}

/**
 * Devuelve los nombres localizados de las áreas indicadas, claveados por su id.
 * Las áreas que fallan se omiten y el cliente cae al fallback.
 */
export async function getLocalizedLocationNames(
  identifiers: Array<string | number>,
): Promise<LocalizedLocationNames> {
  const unique = Array.from(new Set(identifiers.map(String))).slice(0, MAX_LOCATION_AREAS);

  const entries = await mapWithConcurrency(unique, FETCH_CONCURRENCY, async (id) => {
    const names: Partial<Record<LocationNameLocale, string>> = {};
    try {
      const area = await getLocationArea(id);
      fillMissingNames(names, area.names);
      if (POKEAPI_LOCALES.some((locale) => names[locale] === undefined)) {
        // El área no trae todos los idiomas: la localización padre aporta es/ja.
        const location = await getLocation(area.location.name);
        fillMissingNames(names, location.names);
      }
    } catch {
      // Área sin detalle en PokeAPI: se omite y el cliente cae al fallback.
    }
    return [id, names] as const;
  });

  return Object.fromEntries(entries);
}
