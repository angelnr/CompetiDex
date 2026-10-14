import type { StatSpread } from "@/lib/team";

/**
 * Etapas de buff/debuff (-6…+6) y su efecto sobre las estadísticas.
 * La fórmula oficial: positivo `(2+n)/2`, negativo `2/(2-n)`. No aplica a HP.
 */

export function boostMultiplier(stage: number): number {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

/** Estadística efectiva tras aplicar la etapa (redondeo hacia abajo). */
export function effectiveStat(base: number, stage: number): number {
  return Math.floor(base * boostMultiplier(stage));
}

export const EMPTY_BOOSTS: StatSpread = {
  hp: 0,
  attack: 0,
  defense: 0,
  "special-attack": 0,
  "special-defense": 0,
  speed: 0,
};

export const BOOST_STATS = [
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
] as const;
