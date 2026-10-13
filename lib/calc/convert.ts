import { DEFAULT_EVS, DEFAULT_IVS, type StatSpread, type TeamMember } from "@/lib/team";
import type { CalcPokemonInput, Level } from "./types";

/**
 * Conversión entre slugs del repositorio (kebab) y slugs compactos que
 * espera `@smogon/calc` (formato Showdown): `life-orb` → `lifeorb`,
 * `snow-warning` → `snowwarning`, `charizard-mega-x` → `charizardmegax`.
 */

export function toGenslug(slug: string): string {
  return slug.replace(/[\s-]+/g, "").toLowerCase();
}

/** Correcciones puntuales de formas con orden distinto al de Showdown. */
export function toSpeciesGenslug(slug: string): string {
  if (slug.startsWith("raticate-totem-alola")) return "raticatealolatotem";
  if (slug.startsWith("minior-")) {
    const color = slug.replace("minior-", "").replace(/-meteor/, "");
    return `minior${color}`;
  }
  return toGenslug(slug);
}

export type CalcStatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export const STAT_TO_CALC: Record<keyof StatSpread, CalcStatKey> = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
};

export function fullSpread(spread: StatSpread): {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
} {
  return {
    hp: spread.hp,
    atk: spread.attack,
    def: spread.defense,
    spa: spread["special-attack"],
    spd: spread["special-defense"],
    spe: spread.speed,
  };
}

/** Título legible a partir de un slug kebab (`thunder-bolt` → `Thunder Bolt`). */
export function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Convierte un miembro de equipo (nuestro `TeamMember`) al input de la
 * calculadora. `member.name` ya es el slug kebab de la especie (como lo
 * guarda el editor de equipos), p. ej. `pikachu` o `charizard-mega-x`.
 */
export function teamMemberToCalcInput(member: TeamMember, level: Level): CalcPokemonInput {
  const moves = [...member.moves!, null, null, null, null].slice(0, 4);
  return {
    species: member.name || null,
    level,
    nature: member.nature ?? "hardy",
    ability: member.ability ?? null,
    item: member.heldItem ?? null,
    ivs: { ...DEFAULT_IVS, ...member.ivs },
    evs: { ...DEFAULT_EVS, ...member.evs },
    moves,
  };
}
