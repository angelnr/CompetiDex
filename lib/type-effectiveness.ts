/**
 * Cálculo de efectividades de tipos (defensivo, desde el Pokémon hacia los atacantes).
 *
 * Lógica pura y testeable: recibe los `damage_relations` ya resueltos de cada
 * tipo del Pokémon y produce un mapa { tipoAtacante: multiplicador }.
 *
 * Reglas ( combate estándar):
 *  - x2 si el tipo del defensor recibe doble daño del atacante.
 *  - x0.5 si recite medio.
 *  - x0 si es inmune.
 *  - Para Pokémon con 2 tipos, los multiplicadores se multiplican entre sí.
 *    Ej: Bulbasaur (planta/veneno) recibe x4 de volador (x2 planta + x2 veneno... no,
 *    veneno no recibe x2 de volador; pero planta x2 de volador => x2). Si hubiera
 *    coincidencia x2*x2 => x4; x2*x0.5 => x1 (neutro); x0 * cualquier => x0.
 */

import type { TypeRelations } from "@/lib/pokeapi";

export type EffectivenessMap = Record<string, number>;

export interface EffectivenessBreakdown {
  /** x4 o x2 (recibe más daño). Ordenado por multiplicador descendente. */
  weaknesses: { type: string; multiplier: number }[];
  /** x0.5 o x0.25. Ordenado por multiplicador ascendente. */
  resistances: { type: string; multiplier: number }[];
  /** x0 (inmune). */
  immunities: string[];
}

/**
 * Dadas las `damage_relations` de cada tipo del Pokémon (1 o 2 tipos),
 * produce el mapa completo de multiplicadores defensivos.
 *
 * @param typeRelations Array alineado con los tipos del Pokémon. Cada
 *   `TypeRelations` describe `*_damage_from` (lo que este tipo recibe).
 */
export function computeDefensiveEffectiveness(
  typeRelations: { name: string; relations: TypeRelations }[],
): EffectivenessMap {
  const multiplier: EffectivenessMap = {};

  for (const { relations } of typeRelations) {
    applyRelation(multiplier, relations.double_damage_from, 2);
    applyRelation(multiplier, relations.half_damage_from, 0.5);
    applyRelation(multiplier, relations.no_damage_from, 0);
  }

  // Los tipos no mencionados son neutros (x1). No los añadimos al mapa
  // para que el consumidor distinga "neutro" de "no listado".
  return multiplier;
}

function applyRelation(map: EffectivenessMap, attackers: { name: string }[], factor: number): void {
  for (const a of attackers) {
    const current = map[a.name] ?? 1;
    map[a.name] = roundMultiplier(current * factor);
  }
}

function roundMultiplier(n: number): number {
  // Evitar 0.06250000001 por floating point. Redondeo a 4 decimales.
  return Math.round(n * 10_000) / 10_000;
}

/**
 * Categoriza el mapa en weaknesses/resistances/immunities para UI.
 * Devuelve vacío si no hay relaciones (p.ej. Stellar/unknown).
 */
export function categorizeEffectiveness(map: EffectivenessMap): EffectivenessBreakdown {
  const weaknesses: { type: string; multiplier: number }[] = [];
  const resistances: { type: string; multiplier: number }[] = [];
  const immunities: string[] = [];

  for (const [type, mult] of Object.entries(map)) {
    if (mult === 0) immunities.push(type);
    else if (mult > 1) weaknesses.push({ type, multiplier: mult });
    else if (mult < 1) resistances.push({ type, multiplier: mult });
  }

  weaknesses.sort((a, b) => b.multiplier - a.multiplier);
  resistances.sort((a, b) => a.multiplier - b.multiplier);

  return { weaknesses, resistances, immunities };
}

/**
 * Cobertura defensiva agregada de un equipo.
 * Para cada tipo atacante, computa el peor caso entre todos los miembros
 * del equipo (el que más daño recibiría). Útil en el comparador y en la
 * vista de equipo.
 */
export function computeDefensiveCoverage(
  membersTypeRelations: { name: string; relations: TypeRelations }[][],
): EffectivenessBreakdown {
  if (membersTypeRelations.length === 0) {
    return { weaknesses: [], resistances: [], immunities: [] };
  }

  const aggregate: EffectivenessMap = {};

  for (const member of membersTypeRelations) {
    const memberMap = computeDefensiveEffectiveness(member);
    for (const [type, mult] of Object.entries(memberMap)) {
      const current = aggregate[type] ?? 1;
      // Peor caso: si algún miembro recibe más daño, ese es el multiplicador del equipo
      if (mult > current) {
        aggregate[type] = mult;
      }
    }
  }

  return categorizeEffectiveness(aggregate);
}

/** Etiqueta legible del multiplicador (x4, x2, x0.5, x0...). */
export function formatMultiplier(mult: number): string {
  if (mult === 0) return "x0";
  if (mult === 0.25) return "x¼";
  if (mult === 0.5) return "x½";
  if (mult === 1) return "x1";
  return `x${mult}`;
}
