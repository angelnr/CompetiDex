/**
 * Métodos de aprendizaje presentes en un version-group concreto.
 *
 * La ficha del Pokémon pinta una pestaña por método. No todos los juegos usan
 * los mismos: Champions, por ejemplo, marca todos sus movimientos con
 * `train`, así que una lista fija (nivel, MT/MA, tutor, huevo) dejaba su
 * learnset vacío. Este helper deriva las pestañas de los datos reales.
 */

import type { PokemonMoveSlot } from "@/lib/pokeapi";

/** Orden preferente de las pestañas; los métodos desconocidos van al final. */
export const MOVE_METHOD_ORDER = ["level-up", "machine", "tutor", "egg", "train"] as const;

/** Posición de un método en la lista de pestañas. */
export function moveMethodRank(name: string): number {
  const index = MOVE_METHOD_ORDER.indexOf(name as (typeof MOVE_METHOD_ORDER)[number]);
  return index === -1 ? MOVE_METHOD_ORDER.length : index;
}

/**
 * Métodos con al menos un movimiento en `game`, en el orden de las pestañas.
 * Devuelve un array vacío si no hay juego o la especie no tiene movimientos.
 */
export function methodsInGame(moveSlots: PokemonMoveSlot[], game: string | undefined): string[] {
  if (!game) return [];

  const methods = new Set<string>();
  for (const slot of moveSlots) {
    for (const detail of slot.version_group_details) {
      if (detail.version_group.name === game) {
        methods.add(detail.move_learn_method.name);
      }
    }
  }

  return [...methods].sort((a, b) => moveMethodRank(a) - moveMethodRank(b) || a.localeCompare(b));
}

/** Primera pestaña con movimientos para un juego (la que se selecciona al abrir). */
export function defaultMoveMethod(
  moveSlots: PokemonMoveSlot[],
  game: string | undefined,
): string | undefined {
  return methodsInGame(moveSlots, game)[0];
}

/**
 * Juego que se muestra al abrir la ficha. Se priorizan los juegos principales
 * (Escarlata/Púrpura y Espada/Escudo) y se deja Champions como opción, no como
 * vista por defecto, salvo que sea el único juego con learnset.
 */
export function pickDefaultMoveGame(versionGroups: string[]): string | undefined {
  if (versionGroups.includes("scarlet-violet")) return "scarlet-violet";
  if (versionGroups.includes("sword-shield")) return "sword-shield";

  return [...versionGroups].reverse().find((vg) => vg !== "champions") ?? versionGroups[0];
}
