import { getMove, getMoveList } from "@/lib/pokeapi";
import { getOrSet } from "@/lib/redis";
import { mapWithConcurrency } from "@/lib/async";

/**
 * Diccionario de nombres localizados de los movimientos del catálogo.
 * PokeAPI no expone batch de nombres; se construye una vez un mapa
 * `{ slug: { locale: nombre } }` (módulo servidor) y se cachea en Redis bajo
 * una única clave. El cliente lo consume con un solo GET. Mismo patrón que
 * `lib/item-names.ts`.
 */

const APP_LOCALES = ["es", "en", "fr", "de", "ja"] as const;
export type MoveNameLocale = (typeof APP_LOCALES)[number];
export type LocalizedMoveNames = Record<string, Partial<Record<MoveNameLocale, string>>>;

const DICT_KEY = "pokeapi:move-names-dict:v2";
const DICT_TTL_S = 604_800; // 7d
const FETCH_CONCURRENCY = 8;

export async function getLocalizedMoveNames(): Promise<LocalizedMoveNames> {
  return getOrSet(
    DICT_KEY,
    async () => {
      const list = await getMoveList({ limit: 2000 });
      const slugs = list.results.map((r) => r.name);
      const entries = await mapWithConcurrency(slugs, FETCH_CONCURRENCY, async (slug) => {
        const names: Partial<Record<MoveNameLocale, string>> = {};
        try {
          const move = await getMove(slug);
          for (const locale of APP_LOCALES) {
            const hit = move.names.find((n) => n.language.name === locale);
            if (hit) names[locale] = hit.name;
          }
        } catch {
          // movimiento sin detalle: el cliente cae al slug formateado
        }
        return [slug, names] as const;
      });
      return Object.fromEntries(entries);
    },
    DICT_TTL_S,
  );
}
