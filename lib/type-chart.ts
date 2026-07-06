/**
 * Tabla estática de efectividades ofensivas (Gen 9).
 *
 * TYPE_CHART[atacante][defensor] = multiplicador.
 * Solo se almacenan valores ≠ 1 (2, 0.5, 0).
 * Los tipos "stellar" y "unknown" no están incluidos.
 *
 * Fuente única de verdad para Comparador, Calculadora y cobertura de equipo.
 */
import type { PokemonTypeName } from "@/lib/pokemon-types";
import type { EffectivenessBreakdown } from "@/lib/type-effectiveness";

type RealType = Exclude<PokemonTypeName, "stellar" | "unknown">;

export const TYPE_CHART: Record<RealType, Partial<Record<RealType, number>>> = {
  normal: { rock: 0.5, steel: 0.5, ghost: 0 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, flying: 2, dragon: 0.5, ground: 0 },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, poison: 0.5, fighting: 2, dragon: 2, dark: 2, steel: 0.5 },
};

export type { RealType };

export const REAL_TYPES = Object.keys(TYPE_CHART) as RealType[];

function normalize(t: string): RealType {
  const key = t.toLowerCase() as RealType;
  if (key in TYPE_CHART) return key;
  return "normal" as RealType;
}

export function getOffensiveMultiplier(moveType: string, defenderType: string): number {
  const atk = normalize(moveType);
  const def = normalize(defenderType);
  return TYPE_CHART[atk]?.[def] ?? 1;
}

export function getDefensiveMultiplier(attackerType: string, defenderTypes: string[]): number {
  if (defenderTypes.length === 0) return 1;
  const atk = normalize(attackerType);
  let mult = 1;
  for (const dt of defenderTypes) {
    const def = normalize(dt);
    mult *= TYPE_CHART[atk]?.[def] ?? 1;
  }
  return Math.round(mult * 10_000) / 10_000;
}

export interface TeamCoverageEntry {
  attackerType: string;
  multiplier: number;
}

export function getTeamCoverageBreakdown(
  teamMembers: { name: string; types: string[] }[],
): EffectivenessBreakdown {
  const map: Record<string, number> = {};
  for (const atk of REAL_TYPES) {
    const mults = teamMembers.map((m) => getDefensiveMultiplier(atk, m.types));
    if (mults.length === 0) continue;
    const maxMult = Math.max(...mults);
    if (maxMult !== 1) {
      map[atk] = maxMult;
    }
  }

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
 * Computa el breakdown defensivo de un único Pokémon usando solo sus tipos
 * y la tabla estática (sin fetchear Type de PokeAPI).
 */
export function computeDefensiveBreakdownFromTypes(types: string[]): EffectivenessBreakdown {
  const map: Record<string, number> = {};
  for (const atk of REAL_TYPES) {
    const mult = getDefensiveMultiplier(atk, types);
    if (mult !== 1) map[atk] = mult;
  }

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
