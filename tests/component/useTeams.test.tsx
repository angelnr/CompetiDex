import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTeams } from "@/hooks/useTeams";
import type { Team } from "@/lib/team";
import type { TeamStorage } from "@/lib/storage";
import type { Folder } from "@/lib/folders";

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: null }),
}));

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: "team-1",
    name: "Equipo",
    champions: false,
    folderId: null,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    members: [
      {
        pokemonId: 25,
        name: "pikachu",
        slot: 0,
        sprite: null,
        types: ["electric"],
        level: 100,
        evs: {
          hp: 4,
          attack: 252,
          defense: 0,
          "special-attack": 0,
          "special-defense": 0,
          speed: 252,
        },
      },
    ],
    ...overrides,
  };
}

function makeStorage(initial: Team[]): TeamStorage {
  let teams = [...initial];
  const folders: Folder[] = [];

  return {
    list: vi.fn(async () => teams),
    get: vi.fn(async (id: string) => teams.find((t) => t.id === id) ?? null),
    save: vi.fn(async (team: Team) => {
      teams = teams.map((t) => (t.id === team.id ? team : t));
    }),
    delete: vi.fn(async (id: string) => {
      teams = teams.filter((t) => t.id !== id);
    }),
    listFolders: vi.fn(async () => folders),
    saveFolder: vi.fn(async (folder: Folder) => {
      folders.push(folder);
    }),
    deleteFolder: vi.fn(async () => undefined),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTeams · Champions", () => {
  it("al marcar Champions pone a todos los miembros a nivel 50 y resetea EVs", async () => {
    const team = makeTeam({
      members: [
        makeTeam().members[0]!,
        {
          pokemonId: 1,
          name: "bulbasaur",
          slot: 1,
          sprite: null,
          types: ["grass"],
          level: 76,
        },
      ],
    });
    const storage = makeStorage([team]);

    const { result } = renderHook(() => useTeams(storage));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.setChampions(team.id, true);
    });

    expect(result.current.teams[0]!.champions).toBe(true);
    expect(result.current.teams[0]!.members.map((m) => m.level)).toEqual([50, 50]);
    expect(
      result.current.teams[0]!.members.map((m) =>
        Object.values(m.evs ?? {}).reduce((sum, v) => sum + v, 0),
      ),
    ).toEqual([0, 0]);
    expect(storage.save).toHaveBeenCalledWith(expect.objectContaining({ champions: true }));
  });

  it("añade nuevos Pokémon al nivel 50 en un equipo Champions", async () => {
    const team = makeTeam({ champions: true });
    const storage = makeStorage([team]);

    const { result } = renderHook(() => useTeams(storage));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.addPokemon(team.id, {
        pokemonId: 1,
        name: "bulbasaur",
        sprite: null,
        types: ["grass"],
        level: 100,
      });
    });

    const added = result.current.teams[0]!.members.find((m) => m.pokemonId === 1);
    expect(added?.level).toBe(50);
  });

  it("no permite bajar el nivel de un miembro Champions mediante updateMember", async () => {
    const team = makeTeam({ champions: true });
    const storage = makeStorage([team]);

    const { result } = renderHook(() => useTeams(storage));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.updateMember(team.id, 25, { level: 100 });
    });

    expect(result.current.teams[0]!.members[0]!.level).toBe(50);
  });
});

describe("useTeams · carga de un solo equipo", () => {
  it("con teamId carga solo ese equipo y no pide la lista ni las carpetas", async () => {
    const first = makeTeam();
    const second = makeTeam({ id: "team-2", name: "Otro" });
    const storage = makeStorage([first, second]);

    const { result } = renderHook(() => useTeams(storage, first.id));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(storage.list).not.toHaveBeenCalled();
    expect(storage.listFolders).not.toHaveBeenCalled();
    expect(storage.get).toHaveBeenCalledWith(first.id);
    expect(result.current.teams).toEqual([first]);
    expect(result.current.folders).toEqual([]);
  });
});
