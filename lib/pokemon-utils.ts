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

/** Sprite por defecto (frontend_default) fallback всегда disponible. */
export function getDefaultSprite(pokemon: Pick<Pokemon, "sprites">): string | null {
  return pokemon.sprites.front_default ?? getDreamWorldSprite(pokemon);
}

/** Capitaliza un nombre: "pikachu" -> "Pikachu". */
export function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
