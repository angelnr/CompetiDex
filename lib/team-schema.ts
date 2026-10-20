import { z } from "zod";

import {
  applyChampionsLevel,
  MAX_TEAM_SIZE,
  normalizeMember,
  validateEvs,
  validateIvs,
  type StatSpread,
  type Team,
} from "@/lib/team";

const statSpreadField = z.number().int().min(0).max(999);

const statSpreadSchema = z.object({
  hp: statSpreadField,
  attack: statSpreadField,
  defense: statSpreadField,
  "special-attack": statSpreadField,
  "special-defense": statSpreadField,
  speed: statSpreadField,
});

const EVS_DEFAULT: StatSpread = {
  hp: 0,
  attack: 0,
  defense: 0,
  "special-attack": 0,
  "special-defense": 0,
  speed: 0,
};

const IVS_DEFAULT: StatSpread = {
  hp: 31,
  attack: 31,
  defense: 31,
  "special-attack": 31,
  "special-defense": 31,
  speed: 31,
};

export const teamMemberSchema = z.object({
  pokemonId: z.number().int().positive(),
  slot: z
    .number()
    .int()
    .min(0)
    .max(MAX_TEAM_SIZE - 1),
  name: z.string().trim().min(1).max(80),
  sprite: z.string().nullable().default(null),
  types: z.array(z.string().min(1)).default([]),
  level: z.number().int().min(1).max(100).default(100),
  heldItem: z.string().nullable().default(null),
  ability: z.string().nullable().default(null),
  nature: z.string().min(1).default("hardy"),
  ivs: statSpreadSchema.default(EVS_DEFAULT),
  evs: statSpreadSchema.default(EVS_DEFAULT),
  moves: z.array(z.string().min(1)).max(4).default([]),
});

export const teamSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(30),
  champions: z.boolean().default(false),
  folderId: z.string().min(1).max(64).nullable().default(null),
  members: z.array(teamMemberSchema).max(MAX_TEAM_SIZE),
  createdAt: z.number().int().positive().optional(),
  updatedAt: z.number().int().positive().optional(),
});

/** Valida el payload completo de un equipo y lo normaliza al tipo cliente. */
export function parseTeamPayload(payload: unknown): Team {
  const parsed = teamSchema.parse(payload);

  const usedSlots = new Set<number>();
  const seenPokemon = new Set<number>();

  for (const member of parsed.members) {
    if (usedSlots.has(member.slot)) {
      throw new Error("slot duplicado en el equipo");
    }
    if (seenPokemon.has(member.pokemonId)) {
      throw new Error("no puede haber Pokémon duplicados");
    }
    usedSlots.add(member.slot);
    seenPokemon.add(member.pokemonId);

    const evError = validateEvs(member.evs, parsed.champions);
    if (evError) throw new Error(evError);
    const ivError = validateIvs(member.ivs);
    if (ivError) throw new Error(ivError);
  }

  return {
    id: parsed.id,
    name: parsed.name,
    champions: parsed.champions,
    folderId: parsed.folderId ?? null,
    members: applyChampionsLevel(
      parsed.members.map((m) => normalizeMember(m)),
      parsed.champions,
    ),
    createdAt: parsed.createdAt ?? Date.now(),
    updatedAt: parsed.updatedAt ?? Date.now(),
  };
}
