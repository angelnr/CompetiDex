/**
 * Tipos y helpers puros para el sistema de Equipos (Team Builder).
 * Sin dependencias de React ni del DOM — seguro en Server y cliente.
 */

export const MAX_TEAM_SIZE = 6;

export interface TeamMember {
  pokemonId: number;
  name: string;
  slot: number; // 0..5
  sprite: string | null;
  types: string[];
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  createdAt: number;
  updatedAt: number;
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
  return { ok: true, members: [...members, { ...member, slot }] };
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
