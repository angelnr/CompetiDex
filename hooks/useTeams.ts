"use client";

import { useCallback, useEffect, useState } from "react";
import type { Team, TeamMember } from "@/lib/team";
import {
  addMember,
  generateTeamId,
  reindexSlots,
  removeMember,
  validateTeamName,
} from "@/lib/team";
import { localStorageTeamStorage, type TeamStorage } from "@/lib/storage";

export interface UseTeamsResult {
  /** Lista completa de equipos. */
  teams: Team[];
  /** Carga inicial completada. */
  loaded: boolean;
  /** Crea un equipo vacío con nombre. Retorna error o el equipo creado. */
  createTeam: (name: string) => { ok: true; team: Team } | { ok: false; error: string };
  /** Elimina un equipo. */
  deleteTeam: (id: string) => Promise<void>;
  /** Añade un Pokémon a un equipo. */
  addPokemon: (
    teamId: string,
    member: Omit<TeamMember, "slot">,
  ) => Promise<{ ok: true; team: Team } | { ok: false; error: string }>;
  /** Elimina un Pokémon de un equipo. */
  removePokemon: (teamId: string, pokemonId: number) => Promise<void>;
}

/**
 * Hook para CRUD de equipos.
 * Persiste en localStorage (vía `TeamStorage`). Preparado para inyectar
 * un storage Prisma más adelante.
 */
export function useTeams(storage: TeamStorage = localStorageTeamStorage): UseTeamsResult {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Carga inicial
  useEffect(() => {
    storage.list().then((list) => {
      setTeams(list);
      setLoaded(true);
    });
  }, [storage]);

  const createTeam = useCallback(
    (name: string): ReturnType<UseTeamsResult["createTeam"]> => {
      const error = validateTeamName(name);
      if (error) return { ok: false, error };
      const team: Team = {
        id: generateTeamId(),
        name: name.trim(),
        members: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTeams((prev) => [...prev, team]);
      storage.save(team).catch(console.error);
      return { ok: true, team };
    },
    [storage],
  );

  const deleteTeam = useCallback(
    async (id: string) => {
      setTeams((prev) => prev.filter((t) => t.id !== id));
      await storage.delete(id);
    },
    [storage],
  );

  const addPokemon = useCallback(
    async (
      teamId: string,
      member: Omit<TeamMember, "slot">,
    ): ReturnType<UseTeamsResult["addPokemon"]> => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return { ok: false, error: "Equipo no encontrado" };

      const result = addMember(team.members, member);
      if (!result.ok) return result;

      const updated: Team = {
        ...team,
        members: result.members,
        updatedAt: Date.now(),
      };
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
      await storage.save(updated);
      return { ok: true, team: updated };
    },
    [teams, storage],
  );

  const removePokemon = useCallback(
    async (teamId: string, pokemonId: number) => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;
      const members = reindexSlots(removeMember(team.members, pokemonId));
      const updated: Team = { ...team, members, updatedAt: Date.now() };
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
      await storage.save(updated);
    },
    [teams, storage],
  );

  return { teams, loaded, createTeam, deleteTeam, addPokemon, removePokemon };
}
