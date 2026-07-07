/**
 * Utilidades puras para parseo de respuestas de PokeAPI.
 * Sin JSX ni dependencias — seguro en Server y cliente.
 */

import type { Pokemon, PokemonSpecies } from "@/lib/pokeapi";

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
 * URL determinista del sprite pixel-art (front_default) dado un id.
 * Sin fetch extra — la URL está dentro de remotePatterns de next.config.
 * Tamaño nativo 96×96, sirve para thumbnails en dropdowns de búsqueda.
 */
export function getPixelSpriteById(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

// ---------------------------------------------------------------------------
// Mega Evolution helpers
// ---------------------------------------------------------------------------

export interface MegaVarietyInfo {
  id: number;
  name: string;
  /** Nombre "Mega Charizard X" legible. */
  label: string;
  /** "mega-x" | "mega-y" | "mega" */
  suffix: string;
}

const MEGA_NAME_RE = /^([a-z0-9-]+)-mega(-[xy])?$/;

/** Determina si un nombre de Pokémon corresponde a una forma Mega. */
export function isMegaName(name: string): boolean {
  return MEGA_NAME_RE.test(name);
}

/** Extrae el sufijo mega de un nombre: "charizard-mega-x" → "mega-x" */
export function getMegaSuffix(name: string): string | null {
  const m = name.match(/-(mega-?([xy])?)$/);
  return m?.[1] ?? null;
}

/** Genera etiqueta legible: "charizard-mega-x" → "Mega Charizard X" */
export function getMegaFormLabel(name: string): string {
  const m = name.match(/^(.+)-mega-?([xy])?$/);
  if (!m) return capitalize(name);
  const base = capitalize(m[1]!);
  const variant = m[2] ? ` ${m[2].toUpperCase()}` : "";
  return `Mega ${base}${variant}`;
}

/** Filtra las variedades mega de una especie. */
export function getMegaVarieties(species: PokemonSpecies): MegaVarietyInfo[] {
  return species.varieties
    .filter((v) => !v.is_default && isMegaName(v.pokemon.name))
    .map((v) => {
      const name = v.pokemon.name;
      const id = extractIdFromUrl(v.pokemon.url);
      const suffix = getMegaSuffix(name) ?? "mega";
      return { id, name, label: getMegaFormLabel(name), suffix };
    });
}

/**
 * Mapa de especies que tienen formas Mega → array de formas mega conocidas.
 * ID numérico obtenido de PokeAPI (aprox. 10034+ para megas).
 */
const MEGA_SPECIES_MAP: Record<string, { name: string; id: number }[]> = {
  venusaur: [{ name: "venusaur-mega", id: 10033 }],
  charizard: [
    { name: "charizard-mega-x", id: 10034 },
    { name: "charizard-mega-y", id: 10035 },
  ],
  blastoise: [{ name: "blastoise-mega", id: 10036 }],
  beedrill: [{ name: "beedrill-mega", id: 10090 }],
  pidgeot: [{ name: "pidgeot-mega", id: 10091 }],
  alakazam: [{ name: "alakazam-mega", id: 10037 }],
  slowbro: [{ name: "slowbro-mega", id: 10071 }],
  gengar: [{ name: "gengar-mega", id: 10038 }],
  kangaskhan: [{ name: "kangaskhan-mega", id: 10039 }],
  pinsir: [{ name: "pinsir-mega", id: 10040 }],
  gyarados: [{ name: "gyarados-mega", id: 10041 }],
  aerodactyl: [{ name: "aerodactyl-mega", id: 10042 }],
  mewtwo: [
    { name: "mewtwo-mega-x", id: 10043 },
    { name: "mewtwo-mega-y", id: 10044 },
  ],
  ampharos: [{ name: "ampharos-mega", id: 10045 }],
  steelix: [{ name: "steelix-mega", id: 10072 }],
  scizor: [{ name: "scizor-mega", id: 10046 }],
  heracross: [{ name: "heracross-mega", id: 10047 }],
  houndoom: [{ name: "houndoom-mega", id: 10048 }],
  tyranitar: [{ name: "tyranitar-mega", id: 10049 }],
  sceptile: [{ name: "sceptile-mega", id: 10073 }],
  blaziken: [{ name: "blaziken-mega", id: 10050 }],
  swampert: [{ name: "swampert-mega", id: 10074 }],
  gardevoir: [{ name: "gardevoir-mega", id: 10051 }],
  sableye: [{ name: "sableye-mega", id: 10075 }],
  mawile: [{ name: "mawile-mega", id: 10076 }],
  aggron: [{ name: "aggron-mega", id: 10052 }],
  medicham: [{ name: "medicham-mega", id: 10077 }],
  manectric: [{ name: "manectric-mega", id: 10078 }],
  banette: [{ name: "banette-mega", id: 10079 }],
  absol: [{ name: "absol-mega", id: 10080 }],
  garchomp: [{ name: "garchomp-mega", id: 10053 }],
  lucario: [{ name: "lucario-mega", id: 10054 }],
  abomasnow: [{ name: "abomasnow-mega", id: 10081 }],
  gallade: [{ name: "gallade-mega", id: 10082 }],
  audino: [{ name: "audino-mega", id: 10083 }],
  diancie: [{ name: "diancie-mega", id: 10084 }],
  lopunny: [{ name: "lopunny-mega", id: 10085 }],
  salamence: [{ name: "salamence-mega", id: 10055 }],
  metagross: [{ name: "metagross-mega", id: 10057 }],
  latios: [{ name: "latios-mega", id: 10059 }],
  latias: [{ name: "latias-mega", id: 10058 }],
  rayquaza: [{ name: "rayquaza-mega", id: 10060 }],
  sharpedo: [{ name: "sharpedo-mega", id: 10086 }],
  camerupt: [{ name: "camerupt-mega", id: 10087 }],
  altaria: [{ name: "altaria-mega", id: 10088 }],
  glalie: [{ name: "glalie-mega", id: 10089 }],
};

/** Retorna las formas mega conocidas para una especie dada su nombre. */
export function getMegaFormSuggestions(speciesName: string): { name: string; id: number }[] {
  return MEGA_SPECIES_MAP[speciesName] ?? [];
}

// ---------------------------------------------------------------------------
// Fuzzy match
// ---------------------------------------------------------------------------

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

export interface ComputeStatInput {
  base: number;
  iv: number;
  ev: number;
  level: number;
  isHp: boolean;
  natureMultiplier: number;
}

/**
 * Calcula la estadística real según la fórmula estándar de la saga.
 * HP:  floor((2*base + iv + floor(ev/4)) * level / 100) + level + 10
 * Non-HP: (floor((2*base + iv + floor(ev/4)) * level / 100) + 5) * natureMultiplier
 */
export function computeStat({
  base,
  iv,
  ev,
  level,
  isHp,
  natureMultiplier,
}: ComputeStatInput): number {
  const a = Math.floor(ev / 4);
  const b = Math.floor(((2 * base + iv + a) * level) / 100);
  if (isHp) return b + level + 10;
  return Math.floor((b + 5) * natureMultiplier);
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
