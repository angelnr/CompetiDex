/**
 * Diccionario de nombres localizados de los objetos del catálogo curado.
 *
 * PokeAPI no expone un endpoint batch de nombres; para que el buscador de
 * objetos funcione fuera de inglés se genera una vez un mapa
 * `{ slug: { locale: nombre } }` (solo módulo servidor), cacheado en Redis
 * bajo una única clave. El cliente lo consume con un solo GET.
 */

import { ITEMS } from "@/lib/items";
import { getItem } from "@/lib/pokeapi";
import { getOrSet } from "@/lib/redis";

/** Locales soportados en la app (ver i18n/routing.ts). */
const APP_LOCALES = ["es", "en", "fr", "de", "ja"] as const;

export type LocalizedItemNames = Record<
  string,
  Partial<Record<(typeof APP_LOCALES)[number], string>>
>;

const DICT_KEY = "pokeapi:item-names-dict";
const DICT_TTL_S = 604_800; // 7d

/**
 * Devuelve los nombres localizados de los ítems del catálogo.
 * Cachea el mapa completo en Redis; los fallos por ítem no rompen el dict.
 */
export async function getLocalizedItemNames(): Promise<LocalizedItemNames> {
  return getOrSet(
    DICT_KEY,
    async () => {
      const entries = await Promise.all(
        ITEMS.map(async (item) => {
          const names: Partial<Record<(typeof APP_LOCALES)[number], string>> = {};
          try {
            const poke = await getItem(item.slug);
            for (const locale of APP_LOCALES) {
              const hit = poke.names.find((n) => n.language.name === locale);
              if (hit) names[locale] = hit.name;
            }
          } catch {
            // ítem sin representación en PokeAPI: se omite y el cliente cae al canónico
          }
          return [item.slug, names] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
    DICT_TTL_S,
  );
}
