"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Team, TeamMember, TeamMemberPatch } from "@/lib/team";
import {
  addMember,
  DEFAULT_EVS,
  generateTeamId,
  normalizeMember,
  reindexSlots,
  removeMember,
  swapMemberSlots,
  validateTeamName,
} from "@/lib/team";
import type { Folder } from "@/lib/folders";
import {
  canCreateChild,
  findFolder,
  generateFolderId,
  normalizeParentId,
  promoteOnDelete,
  validateFolderName,
  validateMove,
} from "@/lib/folders";
import { localStorageTeamStorage, remoteTeamStorage, type TeamStorage } from "@/lib/storage";
import { useSession } from "@/lib/auth-client";

export interface UseTeamsResult {
  teams: Team[];
  folders: Folder[];
  loaded: boolean;
  reload: () => Promise<void>;
  createTeam: (
    name: string,
    folderId?: string | null,
  ) => { ok: true; team: Team } | { ok: false; error: string };
  deleteTeam: (id: string) => Promise<void>;
  renameTeam: (
    teamId: string,
    name: string,
  ) => Promise<{ ok: true; team: Team } | { ok: false; error: string }>;
  moveTeam: (
    teamId: string,
    folderId: string | null,
  ) => Promise<{ ok: true; team: Team } | { ok: false; error: string }>;
  addPokemon: (
    teamId: string,
    member: Omit<TeamMember, "slot">,
  ) => Promise<{ ok: true; team: Team } | { ok: false; error: string }>;
  removePokemon: (teamId: string, pokemonId: number) => Promise<void>;
  updateMember: (
    teamId: string,
    pokemonId: number,
    patch: TeamMemberPatch,
  ) => Promise<{ ok: true; team: Team } | { ok: false; error: string }>;
  swapPokemonSlots: (teamId: string, slotA: number, slotB: number) => Promise<void>;
  setChampions: (
    teamId: string,
    champions: boolean,
  ) => Promise<{ ok: true; team: Team } | { ok: false; error: string }>;
  createFolder: (
    name: string,
    parentId?: string | null,
  ) => Promise<{ ok: true; folder: Folder } | { ok: false; error: string }>;
  renameFolder: (
    id: string,
    name: string,
  ) => Promise<{ ok: true; folder: Folder } | { ok: false; error: string }>;
  moveFolder: (
    id: string,
    parentId: string | null,
  ) => Promise<{ ok: true; folder: Folder } | { ok: false; error: string }>;
  deleteFolder: (id: string) => Promise<void>;
}

/**
 * Hook para CRUD de equipos y carpetas.
 *
 * Persiste en localStorage (invitado) o en la BBDD vía `/api/teams` y
 * `/api/folders` (usuario con sesión). Ambos implementan la interfaz
 * `TeamStorage`, por lo que la lógica es idéntica. El storage efectivo cambia
 * al iniciar/cerrar sesión, forzando una recarga de `list()`.
 */
export function useTeams(storage?: TeamStorage): UseTeamsResult {
  const { data: sessionData } = useSession();
  const effectiveStorage: TeamStorage = useMemo(
    () => storage ?? (sessionData?.user ? remoteTeamStorage : localStorageTeamStorage),
    [storage, sessionData?.user?.id],
  );

  const [teams, setTeams] = useState<Team[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setLoaded(false);
    try {
      const [teamList, folderList] = await Promise.all([
        effectiveStorage.list(),
        effectiveStorage.listFolders(),
      ]);
      setTeams(teamList);
      setFolders(folderList);
    } catch (err) {
      console.error("[teams] error al cargar equipos:", err);
      setTeams([]);
      setFolders([]);
    } finally {
      setLoaded(true);
    }
  }, [effectiveStorage]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // -------------------------------------------------------------------------
  // Equipos
  // -------------------------------------------------------------------------

  const createTeam = useCallback(
    (name: string, folderId: string | null = null): ReturnType<UseTeamsResult["createTeam"]> => {
      const error = validateTeamName(name);
      if (error) return { ok: false, error };
      const team: Team = {
        id: generateTeamId(),
        name: name.trim(),
        members: [],
        champions: false,
        folderId: normalizeParentId(folderId),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTeams((prev) => [...prev, team]);
      effectiveStorage.save(team).catch(console.error);
      return { ok: true, team };
    },
    [effectiveStorage],
  );

  const deleteTeam = useCallback(
    async (id: string) => {
      setTeams((prev) => prev.filter((t) => t.id !== id));
      await effectiveStorage.delete(id);
    },
    [effectiveStorage],
  );

  const patchTeam = useCallback(
    async (
      teamId: string,
      patch: Partial<Team>,
    ): Promise<{ ok: true; team: Team } | { ok: false; error: string }> => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return { ok: false, error: "Equipo no encontrado" };
      const updated: Team = { ...team, ...patch, updatedAt: Date.now() };
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
      await effectiveStorage.save(updated);
      return { ok: true, team: updated };
    },
    [teams, effectiveStorage],
  );

  const renameTeam = useCallback(
    async (teamId: string, name: string): ReturnType<UseTeamsResult["renameTeam"]> => {
      const error = validateTeamName(name);
      if (error) return { ok: false, error };
      return patchTeam(teamId, { name: name.trim() });
    },
    [patchTeam],
  );

  const moveTeam = useCallback(
    async (teamId: string, folderId: string | null): ReturnType<UseTeamsResult["moveTeam"]> => {
      return patchTeam(teamId, { folderId: normalizeParentId(folderId) });
    },
    [patchTeam],
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
      await effectiveStorage.save(updated);
      return { ok: true, team: updated };
    },
    [teams, effectiveStorage],
  );

  const removePokemon = useCallback(
    async (teamId: string, pokemonId: number) => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;
      const members = reindexSlots(removeMember(team.members, pokemonId));
      const updated: Team = { ...team, members, updatedAt: Date.now() };
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
      await effectiveStorage.save(updated);
    },
    [teams, effectiveStorage],
  );

  const updateMember = useCallback(
    async (
      teamId: string,
      pokemonId: number,
      patch: TeamMemberPatch,
    ): ReturnType<UseTeamsResult["updateMember"]> => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return { ok: false, error: "Equipo no encontrado" };

      const idx = team.members.findIndex((m) => m.pokemonId === pokemonId);
      if (idx === -1) return { ok: false, error: "Pokémon no encontrado en el equipo" };

      const current = team.members[idx]!;
      const updatedMember = normalizeMember({ ...current, ...patch });

      const members = [...team.members];
      members[idx] = updatedMember;

      const updated: Team = {
        ...team,
        members,
        updatedAt: Date.now(),
      };
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
      await effectiveStorage.save(updated);
      return { ok: true, team: updated };
    },
    [teams, effectiveStorage],
  );

  const swapPokemonSlots = useCallback(
    async (teamId: string, slotA: number, slotB: number) => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;
      const members = swapMemberSlots(team.members, slotA, slotB);
      if (members === team.members) return;
      const updated: Team = { ...team, members, updatedAt: Date.now() };
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
      await effectiveStorage.save(updated);
    },
    [teams, effectiveStorage],
  );

  const setChampions = useCallback(
    async (teamId: string, champions: boolean): ReturnType<UseTeamsResult["setChampions"]> => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return { ok: false, error: "Equipo no encontrado" };
      if (team.champions === champions) return { ok: true, team };

      const updated: Team = {
        ...team,
        champions,
        members: team.members.map((m) => ({
          ...m,
          evs: { ...DEFAULT_EVS },
        })),
        updatedAt: Date.now(),
      };

      setTeams((prev) => prev.map((t) => (t.id === teamId ? updated : t)));
      await effectiveStorage.save(updated);
      return { ok: true, team: updated };
    },
    [teams, effectiveStorage],
  );

  // -------------------------------------------------------------------------
  // Carpetas
  // -------------------------------------------------------------------------

  const createFolder = useCallback(
    async (
      name: string,
      parentId: string | null = null,
    ): ReturnType<UseTeamsResult["createFolder"]> => {
      const error = validateFolderName(name);
      if (error) return { ok: false, error };
      const parent = normalizeParentId(parentId);
      if (parent && !findFolder(folders, parent)) {
        return { ok: false, error: "Carpeta padre no encontrada" };
      }
      if (!canCreateChild(folders, parent)) {
        return { ok: false, error: "No se pueden superar 3 niveles de carpetas" };
      }
      const folder: Folder = {
        id: generateFolderId(),
        name: name.trim(),
        parentId: parent,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setFolders((prev) => [...prev, folder]);
      await effectiveStorage.saveFolder(folder);
      return { ok: true, folder };
    },
    [folders, effectiveStorage],
  );

  const renameFolder = useCallback(
    async (id: string, name: string): ReturnType<UseTeamsResult["renameFolder"]> => {
      const error = validateFolderName(name);
      if (error) return { ok: false, error };
      const folder = findFolder(folders, id);
      if (!folder) return { ok: false, error: "Carpeta no encontrada" };
      const updated: Folder = { ...folder, name: name.trim(), updatedAt: Date.now() };
      setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
      await effectiveStorage.saveFolder(updated);
      return { ok: true, folder: updated };
    },
    [folders, effectiveStorage],
  );

  const moveFolder = useCallback(
    async (id: string, parentId: string | null): ReturnType<UseTeamsResult["moveFolder"]> => {
      const folder = findFolder(folders, id);
      if (!folder) return { ok: false, error: "Carpeta no encontrada" };
      const error = validateMove(folders, id, parentId);
      if (error) return { ok: false, error };
      const updated: Folder = {
        ...folder,
        parentId: normalizeParentId(parentId),
        updatedAt: Date.now(),
      };
      setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
      await effectiveStorage.saveFolder(updated);
      return { ok: true, folder: updated };
    },
    [folders, effectiveStorage],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      // Optimista: sube el contenido directo al padre (igual que el storage).
      const { folders: nextFolders, parentId } = promoteOnDelete(folders, id);
      setFolders(nextFolders);
      setTeams((prev) => prev.map((t) => (t.folderId === id ? { ...t, folderId: parentId } : t)));
      await effectiveStorage.deleteFolder(id);
      // Recarga para reconciliar con el backend (equipos reasignados).
      await reload();
    },
    [folders, effectiveStorage, reload],
  );

  return {
    teams,
    folders,
    loaded,
    reload,
    createTeam,
    deleteTeam,
    renameTeam,
    moveTeam,
    addPokemon,
    removePokemon,
    updateMember,
    swapPokemonSlots,
    setChampions,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
  };
}
