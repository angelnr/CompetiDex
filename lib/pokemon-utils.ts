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
  label: string;
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
  hp: { key: "hp", label: "PS", colorFor: statColor },
  attack: { key: "attack", label: "Ataque", colorFor: statColor },
  defense: { key: "defense", label: "Defensa", colorFor: statColor },
  "special-attack": { key: "special-attack", label: "At. Esp.", colorFor: statColor },
  "special-defense": { key: "special-defense", label: "Def. Esp.", colorFor: statColor },
  speed: { key: "speed", label: "Velocidad", colorFor: statColor },
};

/** Suma total de base_stats (para la barra de total). */
export function computeStatTotal(stats: Pokemon["stats"]): number {
  return stats.reduce((acc, s) => acc + s.base_stat, 0);
}

/** Texto de especie en español; fallback a inglés. */
export function getFlavorText(
  entries: { flavor_text: string; language: { name: string } }[],
): string | null {
  const es = entries.find((e) => e.language.name === "es");
  if (es) return sanitizeFlavorText(es.flavor_text);
  const en = entries.find((e) => e.language.name === "en");
  if (en) return sanitizeFlavorText(en.flavor_text);
  return null;
}

function sanitizeFlavorText(text: string): string {
  return text
    .replace(/\f|\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Género en español; fallback a inglés. */
export function getGenus(genera: { genus: string; language: { name: string } }[]): string | null {
  const es = genera.find((g) => g.language.name === "es");
  if (es) return es.genus;
  const en = genera.find((g) => g.language.name === "en");
  return en?.genus ?? null;
}

/** Nombre legible en español; fallback al nombre interno capitalizado. */
export function getDisplayName(
  names: { name: string; language: { name: string } }[],
  fallback: string,
): string {
  const es = names.find((n) => n.language.name === "es");
  if (es) return es.name;
  const en = names.find((n) => n.language.name === "en");
  return en?.name ?? capitalize(fallback);
}
