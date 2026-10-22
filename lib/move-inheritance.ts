/**
 * Herencia de movimientos huevo entre una especie y sus preevoluciones.
 *
 * PokeAPI no siempre copia a las evoluciones los movimientos huevo de la
 * especie raíz (p. ej. Pawmot no lista Fake Out, aunque Pawmi sí lo aprende
 * por huevo). En el juego esos movimientos siguen siendo legales porque el
 * Pokémon los conserva al evolucionar.
 *
 * La herencia se aplica **por version-group**: solo se añade un movimiento
 * para los juegos en los que la especie actual ya existe. Así no se cuelan
 * movimientos de generaciones anteriores a la introducción de la evolución.
 */

import {
  getEvolutionChain,
  getPokemon,
  getPokemonSpecies,
  type EvolutionChain,
  type Pokemon,
  type PokemonMoveSlot,
} from "@/lib/pokeapi";
import { extractIdFromUrl } from "@/lib/pokemon-utils";

const EGG_METHOD = "egg";

/**
 * Añade a `current` los movimientos huevo de `root` que falten, limitados a
 * los version-groups que ya aparecen en el learnset actual. No muta las
 * entradas originales y devuelve la misma referencia si no hay cambios.
 */
export function mergeInheritedEggMoves(
  current: PokemonMoveSlot[],
  root: PokemonMoveSlot[],
): PokemonMoveSlot[] {
  const currentVersionGroups = new Set(
    current.flatMap((slot) => slot.version_group_details.map((d) => d.version_group.name)),
  );
  if (currentVersionGroups.size === 0) return current;

  const merged = current.map((slot) => ({
    move: slot.move,
    version_group_details: [...slot.version_group_details],
  }));
  const bySlug = new Map(merged.map((slot) => [slot.move.name, slot]));
  let changed = false;

  for (const rootSlot of root) {
    const inherited = rootSlot.version_group_details.filter(
      (detail) =>
        detail.move_learn_method.name === EGG_METHOD &&
        currentVersionGroups.has(detail.version_group.name),
    );
    if (inherited.length === 0) continue;

    const existing = bySlug.get(rootSlot.move.name);
    if (existing) {
      const seen = new Set(
        existing.version_group_details.map((detail) => detail.version_group.name),
      );
      for (const detail of inherited) {
        const vg = detail.version_group.name;
        if (seen.has(vg)) continue;
        existing.version_group_details.push({ ...detail });
        seen.add(vg);
        changed = true;
      }
      continue;
    }

    const slot: PokemonMoveSlot = {
      move: rootSlot.move,
      version_group_details: inherited.map((detail) => ({ ...detail })),
    };
    merged.push(slot);
    bySlug.set(slot.move.name, slot);
    changed = true;
  }

  return changed ? merged : current;
}

/**
 * Obtiene el Pokémon de la especie raíz de una cadena evolutiva, salvo que la
 * especie indicada ya sea la raíz. Devuelve `null` si no aplica o si PokeAPI
 * falla: la herencia es best-effort y nunca debe romper el learnset base.
 */
export async function getRootPokemonFromChain(
  chain: EvolutionChain,
  speciesName: string,
): Promise<Pokemon | null> {
  const rootName = chain.chain.species.name;
  if (rootName === speciesName) return null;

  try {
    return await getPokemon(rootName);
  } catch (err) {
    console.error(`[move-inheritance] no se pudo cargar la raíz ${rootName}:`, err);
    return null;
  }
}

/** Resuelve la especie raíz a partir del nombre de la especie actual. */
export async function getRootPokemonForSpecies(speciesName: string): Promise<Pokemon | null> {
  try {
    const species = await getPokemonSpecies(speciesName);
    const chainId = extractIdFromUrl(species.evolution_chain.url);
    const chain = await getEvolutionChain(chainId);
    return getRootPokemonFromChain(chain, speciesName);
  } catch (err) {
    console.error(`[move-inheritance] no se pudo resolver la cadena de ${speciesName}:`, err);
    return null;
  }
}

/**
 * Devuelve una copia del Pokémon con los movimientos huevo heredados de su
 * especie raíz. Si no hay nada que añadir devuelve el objeto original.
 */
export async function enrichPokemonWithInheritedEggMoves(
  pokemon: Pokemon,
  chain?: EvolutionChain,
): Promise<Pokemon> {
  const speciesName = pokemon.species?.name;
  if (!speciesName || pokemon.moves.length === 0) return pokemon;

  const root = chain
    ? await getRootPokemonFromChain(chain, speciesName)
    : await getRootPokemonForSpecies(speciesName);
  if (!root) return pokemon;

  const moves = mergeInheritedEggMoves(pokemon.moves, root.moves ?? []);
  return moves === pokemon.moves ? pokemon : { ...pokemon, moves };
}
