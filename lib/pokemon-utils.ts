/**
 * Utilidades puras para parseo de respuestas de PokeAPI.
 * Sin JSX ni dependencias — seguro en Server y cliente.
 */

import type { Pokemon } from "@/lib/pokeapi";

/** Extrae el id numérico de una URL de PokeAPI: /api/v2/pokemon/25/ -> 25 */
export function extractIdFromUrl(url: string): number {
  const matches = url.match(/\/(\d+)\/?$/);
  if (!matches || !matches[1]) {
    throw new Error(`No se pudo extraer id de la URL: ${url}`);
  }
  return Number(matches[1]);
}

/** Formatea el id con ceros a la izquierda (#001, #025, #1025). */
export function formatPokedexId(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

/** URL del sprite oficial cacheada en next/image (remotePatterns). */
export function getOfficialArtwork(pokemon: Pick<Pokemon, "sprites">): string | null {
  return pokemon.sprites.other?.["official-artwork"]?.front_default ?? null;
}

/** URL del sprite del dream_world (SVG, ideal para grid). */
export function getDreamWorldSprite(pokemon: Pick<Pokemon, "sprites">): string | null {
  return pokemon.sprites.other?.dream_world?.front_default ?? null;
}

/** Sprite por defecto (front_default) fallback siempre disponible. */
export function getDefaultSprite(pokemon: Pick<Pokemon, "sprites">): string | null {
  return pokemon.sprites.front_default ?? getDreamWorldSprite(pokemon);
}

/**
 * URL determinista del artwork oficial dado un id de Pokémon/species.
 * Para cadenas evolutivas donde solo tenemos la species URL (id coincide con
 * el pokemon id para formas por defecto). La URL está dentro de remotePatterns.
 */
export function getOfficialArtworkById(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

/**
 * Fuzzy match estilo fzf para la barra de búsqueda.
 * Retorna `null` si no hay match, o un score donde menor = mejor.
 *
 * El algoritmo verifica que todos los caracteres de `query` aparezcan
 * en `target` en orden, y puntúa según:
 *  - posición del primer match (más temprano = mejor)
 *  - cantidad de caracteres consecutivos match
 *  - proporción query/target
 */
export interface FuzzyMatchResult {
  score: number;
  highlights: number[];
}

export function fuzzyMatch(query: string, target: string): FuzzyMatchResult | null {
  if (!query) return null;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (q.length > t.length) return null;

  let ti = 0;
  let consecutive = 0;
  let totalConsecutive = 0;
  let firstMatch = -1;

  for (let qi = 0; qi < q.length; qi++) {
    const char = q[qi];
    // eslint-disable-next-line no-constant-condition -- simple char search loop
    while (true) {
      if (ti >= t.length) return null;
      if (t[ti] === char) {
        if (qi === 0) firstMatch = ti;
        if (qi > 0 && ti > 0 && t[ti - 1] === q[qi - 1]) {
          consecutive++;
        } else {
          totalConsecutive += consecutive;
          consecutive = 1;
        }
        ti++;
        break;
      }
      ti++;
    }
  }
  totalConsecutive += consecutive;

  // Score: menor es mejor. Combina:
  //  - posición del primer match (0-1, normalizado sobre target length)
  //  - cobertura de query en target (más compacto = mejor)
  //  - ratio de match (query más corta que target es mejor)
  const posScore = firstMatch / t.length;
  const compactScore = 1 - totalConsecutive / q.length;
  const lengthRatio = 1 - q.length / t.length;
  const score = posScore * 0.5 + compactScore * 0.3 + lengthRatio * 0.2;

  return { score, highlights: [] };
}

/** Dato mínimo de un Pokémon para mostrar en cards y dropdowns. */
export interface PokemonSummary {
  id: number;
  name: string;
  types: string[];
  sprite: string | null;
}

/**
 * Selecciona un valor de un array de entradas lenguaje-dependentes.
 * Busca primero el locale dado, luego fallbacks en orden (es, en).
 */
function pickByLocale<T extends { language: { name: string } }>(
  arr: T[],
  key: keyof T,
  locale: string,
  fallbacks = ["es", "en"],
): T | undefined {
  const fallback = locale === "es" || locale === "en" ? ["es", "en"] : [locale, ...fallbacks];
  for (const l of fallback) {
    const hit = arr.find((e) => e.language.name === l);
    if (hit) return hit;
  }
  return undefined;
}

/** Nombre traducido de un array de nombres, con fallbacks. */
export function getName(
  names: { name: string; language: { name: string } }[],
  fallback: string,
  locale = "es",
): string {
  const pick = pickByLocale(names, "name", locale);
  if (pick) return pick.name as string;
  return capitalize(fallback);
}

/** Capitaliza un nombre: "pikachu" -> "Pikachu". */
export function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Convierte decímetros a metros: 4 -> "0.4 m". */
export function formatHeight(decimeters: number): string {
  const meters = decimeters / 10;
  return `${meters.toFixed(1).replace(".0", "")} m`;
}

/** Convierte hectogramos a kilogramos: 60 -> "6.0 kg". */
export function formatWeight(hectograms: number): string {
  const kg = hectograms / 10;
  return `${kg.toFixed(1)} kg`;
}

export interface StatMeta {
  key: string;
  /** Color hex por rango de valor (verde/amarillo/rojo). */
  colorFor: (value: number) => string;
}

const GREEN = "#22c55e";
const YELLOW = "#eab308";
const ORANGE = "#f97316";
const RED = "#ef4444";

function statColor(value: number): string {
  if (value >= 120) return GREEN;
  if (value >= 80) return YELLOW;
  if (value >= 50) return ORANGE;
  return RED;
}

export const POKEMON_STATS: Record<string, StatMeta> = {
  hp: { key: "hp", colorFor: statColor },
  attack: { key: "attack", colorFor: statColor },
  defense: { key: "defense", colorFor: statColor },
  "special-attack": { key: "special-attack", colorFor: statColor },
  "special-defense": { key: "special-defense", colorFor: statColor },
  speed: { key: "speed", colorFor: statColor },
};

/** Suma total de base_stats (para la barra de total). */
export function computeStatTotal(stats: Pokemon["stats"]): number {
  return stats.reduce((acc, s) => acc + s.base_stat, 0);
}

/** Flavor text traducido; fallback a es, luego en. */
export function getFlavorText(
  entries: { flavor_text: string; language: { name: string } }[],
  locale = "es",
): string | null {
  const pick = pickByLocale(entries, "flavor_text", locale);
  if (pick) return sanitizeFlavorText(pick.flavor_text as string);
  return null;
}

function sanitizeFlavorText(text: string): string {
  return text
    .replace(/\f|\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Género traducido; fallback a es, luego en. */
export function getGenus(
  genera: { genus: string; language: { name: string } }[],
  locale = "es",
): string | null {
  const pick = pickByLocale(genera, "genus", locale);
  if (pick) return pick.genus as string;
  return null;
}

/** Nombre legible traducido; fallback al nombre interno capitalizado. */
export function getDisplayName(
  names: { name: string; language: { name: string } }[],
  fallback: string,
  locale = "es",
): string {
  const pick = pickByLocale(names, "name", locale);
  if (pick) return pick.name as string;
  return capitalize(fallback);
}
