import type { StatSpread, Team, TeamMember } from "@/lib/team";
import { normalizeMember, STAT_KEYS, totalEvs } from "@/lib/team";
import { findItem } from "@/lib/items";
import { genderBaseSpecies, isGenderFormName, pokepasteSpeciesLine } from "@/lib/pokemon-utils";
import type { StatKey } from "@/lib/natures";

/**
 * Convierte un slug like "thunder-bolt" a "Thunder Bolt".
 */
export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Serializa un equipo al formato PokePaste / Showdown.
 *
 * Formato de salida:
 * ```
 * Team Name
 *
 * Pokémon @ Item
 * Ability: Ability
 * Level: 50
 * Nature: Adamant
 * EVs: HP 4 / Atk 252 / Spe 252
 * IVs: HP 31 / Atk 31 / Def 31
 * - Move One
 * - Move Two
 * - Move Three
 * - Move Four
 *
 * Next Pokémon...
 * ```
 */
export function teamToPokepaste(team: Team): string {
  const lines: string[] = [];
  const rawMembers = team.members;

  for (let i = 0; i < rawMembers.length; i++) {
    const rawMember = rawMembers[i]!;
    const member = normalizeMember(rawMember);
    if (i > 0) lines.push(""); // línea en blanco separadora entre miembros

    // ── Nickname + especie + objeto ──
    // Showdown: "Pokémon @ Item" (sin nick a menos que haya uno).
    // Las formas por género usan su identificador: "Basculegion" / "Basculegion-F".
    const speciesLine = pokepasteSpeciesLine(member.name);
    if (member.heldItem) {
      // Preserva el nombre canónico del catálogo (p. ej. "Never-Melt Ice");
      // si no se reconoce, asume slug y lo formatea.
      const itemName = findItem(member.heldItem)?.name ?? slugToTitle(member.heldItem);
      lines.push(`${speciesLine} @ ${itemName}`);
    } else {
      lines.push(speciesLine);
    }

    // ── Ability ──
    if (member.ability) {
      lines.push(`Ability: ${slugToTitle(member.ability)}`);
    }

    // ── Level (solo si no es 100, que es el default competitivo) ──
    if (member.level !== undefined && member.level !== 100) {
      lines.push(`Level: ${member.level}`);
    }

    // ── Nature ──
    if (member.nature && member.nature !== "hardy") {
      lines.push(`${slugToTitle(member.nature)} Nature`);
    }

    // ── EVs (solo stats no-cero) ──
    const evs = member.evs!;
    const evParts = STAT_KEYS.filter((k) => evs[k] > 0).map((k) => `${evs[k]} ${statLabel(k)}`);
    if (evParts.length > 0) {
      lines.push(`EVs: ${evParts.join(" / ")}`);
    }

    // ── IVs (solo stats que no sean 31) ──
    const ivs = member.ivs!;
    const ivParts = STAT_KEYS.filter((k) => ivs[k] !== 31).map((k) => `${ivs[k]} ${statLabel(k)}`);
    if (ivParts.length > 0) {
      lines.push(`IVs: ${ivParts.join(" / ")}`);
    }

    // ── Movimientos ──
    if (member.moves && member.moves.length > 0) {
      for (const move of member.moves) {
        lines.push(`- ${slugToTitle(move)}`);
      }
    }
  }

  return lines.join("\n");
}

function statLabel(key: string): string {
  const map: Record<string, string> = {
    hp: "HP",
    attack: "Atk",
    defense: "Def",
    "special-attack": "SpA",
    "special-defense": "SpD",
    speed: "Spe",
  };
  return map[key] ?? key;
}

// ---------------------------------------------------------------------------
// Importación (Poképaste / Showdown → equipo)
// ---------------------------------------------------------------------------

/** Set crudo tal como aparece en el texto, antes de resolver nombres. */
export interface ParsedSet {
  /** Especie escrita por el usuario (sin el marcador de género). */
  speciesToken: string;
  /** Marcador de género "(F)"/"(M)" de las formas por género. */
  genderMarker: "M" | "F" | null;
  nickname: string | null;
  /** Nombre de objeto tal cual ("Never-Melt Ice"). */
  heldItemName: string | null;
  /** Habilidad como slug ("justified"). */
  abilitySlug: string | null;
  level: number | null;
  /** Naturaleza como slug ("adamant"). */
  natureName: string | null;
  evs: Partial<StatSpread>;
  ivs: Partial<StatSpread>;
  /** Nombres de movimiento tal cual ("Ice Shard"). */
  moveNames: string[];
}

const STAT_ABBREVIATIONS: Record<string, StatKey> = {
  hp: "hp",
  atk: "attack",
  def: "defense",
  spa: "special-attack",
  spd: "special-defense",
  spe: "speed",
};

/** Claves de propiedades de Showdown que no modelamos (se ignoran). */
const IGNORED_PROPERTY_RE =
  /^(shiny|tera type|happiness|friendship|gigantamax|dynamax level|gigantamax factor|gender|ball|pokeball|alpha|social)$/i;

const ABILITY_RE = /^ability\s*:\s*(.+)$/i;
const LEVEL_RE = /^level\s*:\s*(\d+)$/i;
const EVS_RE = /^evs?\s*:\s*(.+)$/i;
const IVS_RE = /^ivs?\s*:\s*(.+)$/i;
const NATURE_KEY_RE = /^nature\s*:\s*([a-z-]+)$/i;
const NATURE_SUFFIX_RE = /^([a-z-]+)\s+nature$/i;
const MOVE_RE = /^[-–—]\s*(.+)$/;

/** Normaliza un texto a clave de búsqueda: sin acentos, espacios ni signos salvo "%". */
export function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]/g, "");
}

/** Clave de búsqueda de un movimiento escrito a mano ("Hidden Power [Ice]"). */
export function moveLookupKey(name: string): string {
  const cleaned = name.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
  if (/^hidden power\b/i.test(cleaned)) return "hiddenpower";
  return normalizeToken(cleaned);
}

/** Parsea "252 Atk / 4 SpD / 252 Spe" a un spread parcial. */
function parseSpread(value: string): Partial<StatSpread> {
  const spread: Partial<StatSpread> = {};
  for (const part of value.split("/")) {
    const match = part.trim().match(/^(\d+)\s+([A-Za-z.]+)$/);
    if (!match) continue;
    const stat = STAT_ABBREVIATIONS[match[2]!.toLowerCase().replace(/\./g, "")];
    if (stat) spread[stat] = Number(match[1]);
  }
  return spread;
}

/** Parsea la línea de especie (y, si la hay, la de objeto). */
function parseSpeciesLine(line: string): Pick<
  ParsedSet,
  "speciesToken" | "genderMarker" | "nickname" | "heldItemName"
> {
  const paren = line.match(/^(.*?)\(([^)]+)\)\s*(?:@\s*(.+))?$/);
  if (paren) {
    const before = paren[1]!.trim();
    const inside = paren[2]!.trim();
    const heldItemName = paren[3]?.trim() || null;
    // "(F)"/"(M)" es el marcador de género de las formas por género, no un nick.
    if (/^[MF]$/i.test(inside)) {
      return {
        speciesToken: before,
        genderMarker: inside.toUpperCase() as "M" | "F",
        nickname: null,
        heldItemName,
      };
    }
    return {
      speciesToken: inside,
      genderMarker: null,
      nickname: before || null,
      heldItemName,
    };
  }

  const at = line.split("@");
  return {
    speciesToken: (at[0] ?? "").trim(),
    genderMarker: null,
    nickname: null,
    heldItemName: at.length > 1 ? (at[1] ?? "").trim() || null : null,
  };
}

function createSet(): ParsedSet {
  return {
    speciesToken: "",
    genderMarker: null,
    nickname: null,
    heldItemName: null,
    abilitySlug: null,
    level: null,
    natureName: null,
    evs: {},
    ivs: {},
    moveNames: [],
  };
}

/**
 * Convierte un texto Poképaste/Showdown en una lista de sets. Tolerante: los
 * sets se separan por líneas en blanco, las propiedades desconocidas se
 * ignoran y todo lo que no sea una propiedad o un movimiento se interpreta
 * como la línea de especie de un set nuevo. Una línea suelta sin datos (p. ej.
 * el nombre del equipo) queda como un set más y la resolución la reportará
 * como especie desconocida, igual que hace Showdown.
 */
export function parsePokepaste(text: string): ParsedSet[] {
  const sets: ParsedSet[] = [];
  // Holder mutable: `current` siempre es un set válido y `flush` solo lo publica.
  const state = { current: createSet() };

  const flush = () => {
    if (state.current.speciesToken) sets.push(state.current);
    state.current = createSet();
  };

  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (line === "") {
      flush();
      continue;
    }

    const move = line.match(MOVE_RE);
    if (move) {
      state.current.moveNames.push(move[1]!.trim());
      continue;
    }

    const ability = line.match(ABILITY_RE);
    if (ability) {
      state.current.abilitySlug = ability[1]!.trim().toLowerCase().replace(/\s+/g, "-");
      continue;
    }

    const level = line.match(LEVEL_RE);
    if (level) {
      state.current.level = Number(level[1]);
      continue;
    }

    const evs = line.match(EVS_RE);
    if (evs) {
      state.current.evs = parseSpread(evs[1]!);
      continue;
    }

    const ivs = line.match(IVS_RE);
    if (ivs) {
      state.current.ivs = parseSpread(ivs[1]!);
      continue;
    }

    const natureKey = line.match(NATURE_KEY_RE) ?? line.match(NATURE_SUFFIX_RE);
    if (natureKey) {
      state.current.natureName = natureKey[1]!.trim().toLowerCase();
      continue;
    }

    if (IGNORED_PROPERTY_RE.test(line.replace(/\s*:\s*.*$/, ""))) continue;

    // Línea de especie: si ya había un set con especie, este empieza otro.
    if (state.current.speciesToken) flush();
    Object.assign(state.current, parseSpeciesLine(line));
  }

  flush();
  return sets;
}

export interface SpeciesLookupEntry {
  slug: string;
  id: number;
}

/**
 * Mapa nombre-de-Showdown → especie del catálogo. Para cada slug se registran
 * varias claves (nombre Poképaste, slug y variante corta de género) de modo que
 * conviven "Basculegion-F (F)", "Basculegion-F" y "Basculegion-M".
 */
export function buildSpeciesLookup(
  catalog: { name: string; id: number }[],
): Map<string, SpeciesLookupEntry> {
  const map = new Map<string, SpeciesLookupEntry>();
  const add = (key: string, entry: SpeciesLookupEntry) => {
    if (key && !map.has(key)) map.set(key, entry);
  };

  for (const entry of catalog) {
    const item: SpeciesLookupEntry = { slug: entry.name, id: entry.id };
    add(normalizeToken(pokepasteSpeciesLine(entry.name)), item);
    add(normalizeToken(entry.name), item);
    if (isGenderFormName(entry.name)) {
      const suffix = entry.name.endsWith("-female") ? "f" : "m";
      add(`${normalizeToken(genderBaseSpecies(entry.name))}${suffix}`, item);
    }
  }

  return map;
}

/** Busca una especie probando el token con y sin el marcador de género. */
export function lookupSpecies(
  lookup: Map<string, SpeciesLookupEntry>,
  speciesToken: string,
  genderMarker: "M" | "F" | null,
): SpeciesLookupEntry | undefined {
  const base = normalizeToken(speciesToken);
  const withMarker = genderMarker ? `${base}${genderMarker.toLowerCase()}` : base;
  return lookup.get(withMarker) ?? lookup.get(base);
}

/** Mapa nombre-de-Showdown → slug de movimiento. */
export function buildMoveLookup(catalog: { name: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of catalog) {
    for (const key of [normalizeToken(slugToTitle(entry.name)), normalizeToken(entry.name)]) {
      if (key && !map.has(key)) map.set(key, entry.name);
    }
  }
  return map;
}
