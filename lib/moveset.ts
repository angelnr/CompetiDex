/**
 * Movepool de una especie para el constructor de equipos.
 *
 * PokeAPI no expone un endpoint batch de movimientos, así que para poder
 * pintar la **lista completa** (tipo, categoría, poder, precisión, PP y
 * nombres localizados) sin disparar N peticiones desde el cliente, se
 * ensambla aquí un DTO compacto por especie y se cachea en Redis bajo una
 * única clave. Mismo patrón que `lib/item-names.ts`.
 *
 * El filtrado por juego (version-group) NO se aplica aquí: se incluye la
 * lista de version-groups legales por movimiento y el cliente filtra, de modo
 * que cambiar de juego es instantáneo y la caché sirve para cualquier juego.
 */

import { getMove, getPokemon, type Pokemon, type PokemonMoveSlot } from "@/lib/pokeapi";
import { getOrSet } from "@/lib/redis";
import { isExcludedVersionGroup, versionGroupOrder } from "@/lib/version-names";
import { baseSpeciesSlug, isMegaName } from "@/lib/pokemon-utils";
import { enrichPokemonWithInheritedEggMoves } from "@/lib/move-inheritance";

/** Locales soportados en la app (ver i18n/routing.ts). */
const APP_LOCALES = ["es", "en", "fr", "de", "ja"] as const;
export type MovepoolLocale = (typeof APP_LOCALES)[number];

/** TTL del movepool ensamblado (7d, como items/moves individuales). */
const MOVESET_TTL_S = 604_800;

/** Límite de peticiones concurrentes a PokeAPI al ensamblar el pool. */
const FETCH_CONCURRENCY = 8;

export interface MovepoolMove {
  /** Slug en inglés (valor que se persiste en el equipo). */
  slug: string;
  /** Nombres oficiales localizados (los que falten, el cliente cae al slug). */
  names: Partial<Record<MovepoolLocale, string>>;
  /** Tipo PokeAPI: "fire", "water"... */
  type: string;
  /** "physical" | "special" | "status". */
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  /** Version-groups legales (ya filtrados los excluidos). */
  vgs: string[];
}

export interface Movepool {
  id: number;
  /** Version-groups disponibles para la especie, en orden cronológico. */
  versionGroups: string[];
  moves: MovepoolMove[];
}

/** Ejecuta `fn` sobre `items` con un límite de concurrencia. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) break;
      results[index] = await fn(items[index]!, index);
    }
  });

  await Promise.all(workers);
  return results;
}

/** Une dos learnsets por movimiento, combinando sus version-group details. */
function mergeSlots(a: PokemonMoveSlot[], b: PokemonMoveSlot[]): PokemonMoveSlot[] {
  const byName = new Map<string, PokemonMoveSlot>();
  for (const slot of [...a, ...b]) {
    const existing = byName.get(slot.move.name);
    if (existing) {
      existing.version_group_details.push(...slot.version_group_details);
    } else {
      byName.set(slot.move.name, {
        move: slot.move,
        version_group_details: [...slot.version_group_details],
      });
    }
  }
  return [...byName.values()];
}

/**
 * Learnset a usar. Las formas mega comparten el learnset de su especie base,
 * pero PokeAPI les da uno parcial (a veces solo el version-group "champions"),
 * así que se unen ambos. Para el resto de formas se usa el propio.
 */
async function resolveSlots(pokemon: Pokemon): Promise<PokemonMoveSlot[]> {
  const own = pokemon.moves ?? [];
  if (!isMegaName(pokemon.name)) return own;
  const baseSlug = baseSpeciesSlug(pokemon.name);
  if (baseSlug === pokemon.name) return own;
  try {
    const base = await getPokemon(baseSlug);
    return mergeSlots(own, base.moves ?? []);
  } catch {
    return own;
  }
}

async function buildMovepool(idOrName: number | string): Promise<Movepool> {
  const pokemon = await enrichPokemonWithInheritedEggMoves(await getPokemon(idOrName));
  const slots = await resolveSlots(pokemon);

  // Agrupa version-groups legales por movimiento (deduplicado).
  const vgsBySlug = new Map<string, { vgs: Set<string>; hasDetails: boolean }>();
  for (const slot of slots) {
    const slug = slot.move.name;
    const entry = vgsBySlug.get(slug) ?? {
      vgs: new Set<string>(),
      hasDetails: slot.version_group_details.length > 0,
    };
    for (const detail of slot.version_group_details) {
      if (!isExcludedVersionGroup(detail.version_group.name)) {
        entry.vgs.add(detail.version_group.name);
      }
    }
    vgsBySlug.set(slug, entry);
  }

  const slugs = [...vgsBySlug.keys()].filter((slug) => {
    const entry = vgsBySlug.get(slug)!;
    // Se descartan antes de pedir el detalle los movimientos presentes solo
    // en versiones excluidas (spinoffs/japonesas): no aportan al pool.
    return !(entry.vgs.size === 0 && entry.hasDetails);
  });

  const fetched = await mapWithConcurrency(slugs, FETCH_CONCURRENCY, async (slug) => {
    try {
      return await getMove(slug);
    } catch {
      // Un movimiento que falla no debe romper el pool: se incluye el slug
      // y el cliente cae al nombre derivado del slug.
      return null;
    }
  });

  const moves: MovepoolMove[] = [];
  const allVgs = new Set<string>();

  slugs.forEach((slug, index) => {
    const entry = vgsBySlug.get(slug)!;
    const vgs = [...entry.vgs].sort(versionGroupOrder);

    const move = fetched[index];
    const names: Partial<Record<MovepoolLocale, string>> = {};
    if (move) {
      for (const locale of APP_LOCALES) {
        const hit = move.names.find((n) => n.language.name === locale);
        if (hit) names[locale] = hit.name;
      }
    }

    moves.push({
      slug,
      names,
      type: move?.type.name ?? "normal",
      category: move?.damage_class.name ?? "status",
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
      priority: move?.priority ?? 0,
      vgs,
    });

    for (const vg of vgs) allVgs.add(vg);
  });

  moves.sort((a, b) => a.slug.localeCompare(b.slug));

  return {
    id: pokemon.id,
    versionGroups: [...allVgs].sort(versionGroupOrder),
    moves,
  };
}

/**
 * Movepool completo de una especie. Cachea el DTO ensamblado en Redis (7d)
 * bajo `pokeapi:moveset:{id}:v4`. Devuelve un pool vacío para formas sin
 * movimientos (p. ej. megas sin learnset en PokeAPI).
 *
 * v4 incluye los movimientos huevo heredados de la especie raíz.
 */
export function getMovepool(idOrName: number | string): Promise<Movepool> {
  const key = `pokeapi:moveset:${idOrName}:v4`;
  return getOrSet(key, () => buildMovepool(idOrName), MOVESET_TTL_S);
}
