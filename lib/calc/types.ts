import type { StatSpread } from "@/lib/team";

/**
 * Estados e inputs de la calculadora de daño. Todos los slugs usan el formato
 * del repositorio (kebab, en inglés): `charizard-mega-x`, `thunder-bolt`,
 * `life-orb`, `snow-warning`. La conversión a slugs compactos de Showdown
 * ocurre en `lib/calc/convert.ts` al invocar el motor `@smogon/calc`.
 */

export type WeatherKey = "none" | "sun" | "rain" | "sand" | "snow";
export type TerrainKey = "none" | "electric" | "grassy" | "psychic" | "misty";
export type Level = 50 | 100;

export interface CalcPokemonInput {
  /** Slug kebab de la especie (PokeAPI). Ej: `charizard-mega-x`. */
  species: string | null;
  level: Level;
  nature: string;
  /** Slug kebab de la habilidad o null. */
  ability: string | null;
  /** Slug kebab del objeto (catálogo de `lib/items.ts`) o null. */
  item: string | null;
  ivs: StatSpread;
  evs: StatSpread;
  /** Etapas de buff/debuff (-6…+6) por stat. HP siempre 0 (no aplica). */
  boosts: StatSpread;
  /** Hasta 4 slugs kebab de movimientos. */
  moves: (string | null)[];
}

export interface CalcFieldInput {
  level: Level;
  weather: WeatherKey;
  terrain: TerrainKey;
  /** Pantallas sobre el defensor. */
  isReflect: boolean;
  isLightScreen: boolean;
  isAuroraVeil: boolean;
  isSR: boolean;
  spikes: 0 | 1 | 2 | 3;
  critical: boolean;
  /** HP actual del defensor en porcentaje (1-100). Default 100. */
  defenderHpPct: number;
}

export interface CalcResult {
  /** Slug kebab del movimiento. */
  move: string;
  /** Notación canónica tipo Smogon (desc() o fallback). */
  desc: string;
  damageMin: number;
  damageMax: number;
  /** % sobre el HP máximo del defensor. */
  pctMin: number;
  pctMax: number;
  /** `null` si el movimiento no daña (estado/innune). */
  koText: string | null;
}

export interface CalcStats {
  /** Stats calculadas (hp/atk/def/spa/spd/spe) del atacante. */
  attacker: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  /** Stats calculadas del defensor. */
  defender: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
}

export const EMPTY_CALC_INPUT: CalcPokemonInput = {
  species: null,
  level: 100,
  nature: "hardy",
  ability: null,
  item: null,
  ivs: {
    hp: 31,
    attack: 31,
    defense: 31,
    "special-attack": 31,
    "special-defense": 31,
    speed: 31,
  },
  evs: {
    hp: 0,
    attack: 0,
    defense: 0,
    "special-attack": 0,
    "special-defense": 0,
    speed: 0,
  },
  boosts: {
    hp: 0,
    attack: 0,
    defense: 0,
    "special-attack": 0,
    "special-defense": 0,
    speed: 0,
  },
  moves: [null, null, null, null],
};

export const EMPTY_CALC_FIELD: CalcFieldInput = {
  level: 100,
  weather: "none",
  terrain: "none",
  isReflect: false,
  isLightScreen: false,
  isAuroraVeil: false,
  isSR: false,
  spikes: 0,
  critical: false,
  defenderHpPct: 100,
};
