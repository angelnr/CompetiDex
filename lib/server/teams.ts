import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  applyChampionsLevel,
  DEFAULT_EVS,
  DEFAULT_IVS,
  MAX_TEAMS_PER_USER,
  normalizeMember,
  STAT_KEYS,
  type StatSpread,
  type Team,
  type TeamMember,
} from "@/lib/team";

export class TeamOwnershipError extends Error {
  constructor() {
    super("Equipo no encontrado");
    this.name = "TeamOwnershipError";
  }
}

export class TeamLimitError extends Error {
  constructor() {
    super(`Límite de ${MAX_TEAMS_PER_USER} equipos alcanzado`);
    this.name = "TeamLimitError";
  }
}

type TeamRow = Prisma.TeamGetPayload<{ include: { members: true } }>;
type TeamMemberRow = TeamRow["members"][number];

const EMPTY_SPREAD: StatSpread = {
  hp: 0,
  attack: 0,
  defense: 0,
  "special-attack": 0,
  "special-defense": 0,
  speed: 0,
};

function parseSpread(json: string | null): StatSpread {
  if (!json) return { ...EMPTY_SPREAD };
  try {
    const parsed = JSON.parse(json) as Partial<StatSpread>;
    const spread: StatSpread = { ...EMPTY_SPREAD };
    for (const key of STAT_KEYS) {
      const value = parsed[key];
      spread[key] = typeof value === "number" && Number.isFinite(value) ? value : EMPTY_SPREAD[key];
    }
    return spread;
  } catch {
    return { ...EMPTY_SPREAD };
  }
}

function parseStringArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function toTeamMember(row: TeamMemberRow): TeamMember {
  return normalizeMember({
    pokemonId: row.pokemonId,
    slot: row.slot,
    name: row.name,
    sprite: row.sprite,
    types: parseStringArray(row.types),
    level: row.level,
    nature: row.nature,
    heldItem: row.heldItem,
    ability: row.ability,
    ivs: parseSpread(row.ivs),
    evs: parseSpread(row.evs),
    moves: parseStringArray(row.moves),
  });
}

export function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    champions: row.champions ?? false,
    folderId: row.folderId ?? null,
    members: applyChampionsLevel(
      [...row.members].sort((a, b) => a.slot - b.slot).map(toTeamMember),
      row.champions ?? false,
    ),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

async function findOwned(userId: string, id: string): Promise<TeamRow> {
  const row = await prisma.team.findUnique({ where: { id }, include: { members: true } });
  if (!row || row.userId !== userId) throw new TeamOwnershipError();
  return row;
}

export async function listTeams(userId: string): Promise<Team[]> {
  const rows = await prisma.team.findMany({
    where: { userId },
    include: { members: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toTeam);
}

export async function getTeam(userId: string, id: string): Promise<Team | null> {
  const row = await findOwned(userId, id).catch(() => null);
  return row ? toTeam(row) : null;
}

function toDbMember(teamId: string, member: TeamMember) {
  return {
    teamId,
    pokemonId: member.pokemonId,
    slot: member.slot,
    name: member.name,
    sprite: member.sprite,
    types: JSON.stringify(member.types ?? []),
    level: member.level ?? 100,
    nature: member.nature ?? "hardy",
    heldItem: member.heldItem ?? null,
    ability: member.ability ?? null,
    ivs: JSON.stringify(member.ivs ?? DEFAULT_IVS),
    evs: JSON.stringify(member.evs ?? DEFAULT_EVS),
    moves: JSON.stringify(member.moves ?? []),
  };
}

/**
 * Upsert de documento completo de equipo: crea si no existe, reemplaza
 * los miembros si ya existe. Valida que el equipo pertenezca al usuario.
 */
export async function saveTeam(userId: string, team: Team): Promise<Team> {
  const existing = await prisma.team.findUnique({ where: { id: team.id } });
  if (existing && existing.userId !== userId) throw new TeamOwnershipError();
  if (!existing) {
    const teamCount = await prisma.team.count({ where: { userId } });
    if (teamCount >= MAX_TEAMS_PER_USER) throw new TeamLimitError();
  }

  const members = applyChampionsLevel(
    team.members.map((m) => normalizeMember(m)),
    team.champions ?? false,
  );
  const now = new Date(team.updatedAt ?? Date.now());

  const saved = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.team.update({
        where: { id: team.id },
        data: {
          name: team.name,
          champions: team.champions ?? false,
          folderId: team.folderId ?? null,
          updatedAt: now,
        },
      });
    } else {
      await tx.team.create({
        data: {
          id: team.id,
          userId,
          name: team.name,
          champions: team.champions ?? false,
          folderId: team.folderId ?? null,
          createdAt: new Date(team.createdAt ?? Date.now()),
          updatedAt: now,
        },
      });
    }

    await tx.teamPokemon.deleteMany({ where: { teamId: team.id } });
    if (members.length > 0) {
      await tx.teamPokemon.createMany({ data: members.map((m) => toDbMember(team.id, m)) });
    }

    return await tx.team.findUniqueOrThrow({
      where: { id: team.id },
      include: { members: true },
    });
  });

  return toTeam(saved);
}

export async function deleteTeam(userId: string, id: string): Promise<void> {
  const row = await prisma.team.findUnique({ where: { id } });
  if (!row) return;
  if (row.userId !== userId) throw new TeamOwnershipError();
  await prisma.team.delete({ where: { id } });
}
