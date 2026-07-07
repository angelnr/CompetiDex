import type { StatKey } from "@/lib/natures";

export const MAX_TEAM_SIZE = 6;
export const MAX_EV_PER_STAT = 252;
export const MAX_EV_TOTAL = 510;

export interface StatSpread {
  hp: number;
  attack: number;
  defense: number;
  "special-attack": number;
  "special-defense": number;
  speed: number;
}

export const STAT_KEYS: StatKey[] = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
];

export const DEFAULT_IVS: StatSpread = {
  hp: 31,
  attack: 31,
  defense: 31,
  "special-attack": 31,
  "special-defense": 31,
  speed: 31,
};

export const DEFAULT_EVS: StatSpread = {
  hp: 0,
  attack: 0,
  defense: 0,
  "special-attack": 0,
  "special-defense": 0,
  speed: 0,
};

export interface TeamMember {
  pokemonId: number;
  name: string;
  slot: number;
  sprite: string | null;
  types: string[];
  level?: number;
  heldItem?: string | null;
  ability?: string | null;
  nature?: string;
  ivs?: StatSpread;
  evs?: StatSpread;
  moves?: string[];
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  createdAt: number;
  updatedAt: number;
}

/** Campos editables de TeamMember (excluye campos de identidad). */
export type TeamMemberPatch = Partial<
  Pick<TeamMember, "level" | "heldItem" | "ability" | "nature" | "ivs" | "evs" | "moves">
>;

export function defaultStatSpread(value: number): StatSpread {
  const spread: StatSpread = {
    hp: 0,
    attack: 0,
    defense: 0,
    "special-attack": 0,
    "special-defense": 0,
    speed: 0,
  };
  for (const k of STAT_KEYS) spread[k] = value;
  return spread;
}

export function normalizeMember(member: TeamMember): TeamMember {
  return {
    ...member,
    level: member.level ?? 100,
    heldItem: member.heldItem ?? null,
    ability: member.ability ?? null,
    nature: member.nature ?? "hardy",
    ivs: member.ivs ?? { ...DEFAULT_IVS },
    evs: member.evs ?? { ...DEFAULT_EVS },
    moves: member.moves ?? [],
  };
}

export function totalEvs(spread: StatSpread): number {
  return STAT_KEYS.reduce((sum, k) => sum + spread[k], 0);
}

export function validateEvs(spread: StatSpread): string | null {
  for (const k of STAT_KEYS) {
    if (!Number.isInteger(spread[k]) || spread[k] < 0 || spread[k] > MAX_EV_PER_STAT) {
      return `EVs in ${k} must be between 0 and ${MAX_EV_PER_STAT}`;
    }
  }
  if (totalEvs(spread) > MAX_EV_TOTAL) {
    return `Total EVs cannot exceed ${MAX_EV_TOTAL}`;
  }
  return null;
}

export function validateIvs(spread: StatSpread): string | null {
  for (const k of STAT_KEYS) {
    if (!Number.isInteger(spread[k]) || spread[k] < 0 || spread[k] > 31) {
      return `IVs in ${k} must be between 0 and 31`;
    }
  }
  return null;
}

export function capEvs(spread: StatSpread): StatSpread {
  const capped = { ...spread };
  for (const k of STAT_KEYS) {
    capped[k] = Math.min(Math.max(Math.round(capped[k]), 0), MAX_EV_PER_STAT);
  }
  let total = totalEvs(capped);
  while (total > MAX_EV_TOTAL) {
    for (const k of STAT_KEYS) {
      if (total <= MAX_EV_TOTAL) break;
      const diff = Math.min(capped[k], total - MAX_EV_TOTAL);
      capped[k] -= diff;
      total -= diff;
    }
  }
  return capped;
}

export function clampStat(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

/** Valida que el nombre no esté vacío y tenga ≤ 30 caracteres. */
export function validateTeamName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "El nombre no puede estar vacío";
  if (trimmed.length > 30) return "El nombre no puede tener más de 30 caracteres";
  return null;
}

/** Comprueba si un Pokémon ya está en el equipo (por slot o duplicado). */
export function isPokemonInTeam(members: TeamMember[], pokemonId: number): boolean {
  return members.some((m) => m.pokemonId === pokemonId);
}

/** Busca el siguiente slot libre en el equipo. Retorna -1 si está lleno. */
export function findFreeSlot(members: TeamMember[]): number {
  const occupied = new Set(members.map((m) => m.slot));
  for (let i = 0; i < MAX_TEAM_SIZE; i++) {
    if (!occupied.has(i)) return i;
  }
  return -1;
}

/** Añade un miembro al equipo validando límite y duplicados. Retorna error o nuevo array. */
export function addMember(
  members: TeamMember[],
  member: Omit<TeamMember, "slot">,
): { ok: true; members: TeamMember[] } | { ok: false; error: string } {
  if (members.length >= MAX_TEAM_SIZE) {
    return { ok: false, error: `El equipo ya tiene ${MAX_TEAM_SIZE} Pokémon` };
  }
  if (isPokemonInTeam(members, member.pokemonId)) {
    return { ok: false, error: `${member.name} ya está en el equipo` };
  }
  const slot = findFreeSlot(members);
  if (slot === -1) {
    return { ok: false, error: "No hay slots libres" };
  }
  return {
    ok: true,
    members: [...members, normalizeMember({ ...member, slot })],
  };
}

/** Elimina un miembro del equipo por pokemonId. */
export function removeMember(members: TeamMember[], pokemonId: number): TeamMember[] {
  return members.filter((m) => m.pokemonId !== pokemonId);
}

/** Reordena los slots para que sean contiguos después de eliminar. */
export function reindexSlots(members: TeamMember[]): TeamMember[] {
  return members.sort((a, b) => a.slot - b.slot).map((m, i) => ({ ...m, slot: i }));
}

/** Previsualización rápida: tipos únicos del equipo. */
export function teamTypes(members: TeamMember[]): string[] {
  const types = new Set<string>();
  for (const m of members) {
    for (const t of m.types) types.add(t);
  }
  return Array.from(types);
}

/** Genera un id único (suficiente para localStorage). */
export function generateTeamId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
