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

/** Error de validación de dominio (slots, duplicados, EVs/IVs). */
export class TeamValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamValidationError";
  }
}

/**
 * Límites de los campos de texto. Sin ellos, un usuario podría almacenar
 * megabytes por miembro y llenar la BBDD pese a los topes de equipos.
 */
const MAX_SPRITE_URL = 500;
const MAX_TYPE_NAME = 30;
const MAX_TYPE_COUNT = 3;
const MAX_NATURE = 30;
const MAX_ITEM = 100;
const MAX_ABILITY = 100;
const MAX_MOVE_NAME = 50;

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
  sprite: z.string().max(MAX_SPRITE_URL).nullable().default(null),
  types: z.array(z.string().min(1).max(MAX_TYPE_NAME)).max(MAX_TYPE_COUNT).default([]),
  level: z.number().int().min(1).max(100).default(100),
  heldItem: z.string().max(MAX_ITEM).nullable().default(null),
  ability: z.string().max(MAX_ABILITY).nullable().default(null),
  nature: z.string().min(1).max(MAX_NATURE).default("hardy"),
  ivs: statSpreadSchema.default(IVS_DEFAULT),
  evs: statSpreadSchema.default(EVS_DEFAULT),
  moves: z.array(z.string().min(1).max(MAX_MOVE_NAME)).max(4).default([]),
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
      throw new TeamValidationError("slot duplicado en el equipo");
    }
    if (seenPokemon.has(member.pokemonId)) {
      throw new TeamValidationError("no puede haber Pokémon duplicados");
    }
    usedSlots.add(member.slot);
    seenPokemon.add(member.pokemonId);

    const evError = validateEvs(member.evs, parsed.champions);
    if (evError) throw new TeamValidationError(evError);
    const ivError = validateIvs(member.ivs);
    if (ivError) throw new TeamValidationError(ivError);
  }

  return {
    id: parsed.id,
    name: parsed.name,
    champions: parsed.champions,
    folderId: parsed.folderId ?? null,
    members: applyChampionsLevel(
      parsed.members.map((m) => {
        const member = normalizeMember(m);
        // Champions no usa IVs: se normalizan al máximo aunque el cliente
        // envíe otro valor.
        return parsed.champions ? { ...member, ivs: { ...IVS_DEFAULT } } : member;
      }),
      parsed.champions,
    ),
    createdAt: parsed.createdAt ?? Date.now(),
    updatedAt: parsed.updatedAt ?? Date.now(),
  };
}
