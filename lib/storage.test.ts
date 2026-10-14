import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { localStorageTeamStorage, remoteTeamStorage, TeamApiError } from "@/lib/storage";
import type { Team } from "@/lib/team";
import type { Folder } from "@/lib/folders";

const TEAM: Team = {
  id: "team-1",
  name: "Equipo",
  champions: false,
  members: [],
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("remoteTeamStorage", () => {
  it("lista equipos vía GET /api/teams", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([TEAM]));
    vi.stubGlobal("fetch", fetchMock);

    const teams = await remoteTeamStorage.list();
    expect(teams).toEqual([TEAM]);
    expect(fetchMock).toHaveBeenCalledWith("/api/teams", expect.any(Object));
  });

  it("guarda equipos vía PUT /api/teams/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(TEAM));
    vi.stubGlobal("fetch", fetchMock);

    await remoteTeamStorage.save(TEAM);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/teams/${TEAM.id}`,
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("devuelve null en 404 para get", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 404)));
    expect(await remoteTeamStorage.get("nope")).toBeNull();
  });

  it("lanza TeamApiError en errores de red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 500)));
    await expect(remoteTeamStorage.list()).rejects.toBeInstanceOf(TeamApiError);
  });

  it("lista carpetas vía GET /api/folders", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    await remoteTeamStorage.listFolders();
    expect(fetchMock).toHaveBeenCalledWith("/api/folders", expect.any(Object));
  });

  it("elimina carpetas vía DELETE /api/folders/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await remoteTeamStorage.deleteFolder("f1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/folders/f1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("localStorageTeamStorage · carpetas y migración v3", () => {
  const FOLDER: Folder = {
    id: "f1",
    name: "VGC",
    parentId: null,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("migra el esquema v2 añadiendo folderId y folders", async () => {
    localStorage.setItem(
      "competidex:teams",
      JSON.stringify({ version: 2, teams: [{ ...TEAM, folderId: undefined }] }),
    );

    const teams = await localStorageTeamStorage.list();
    const folders = await localStorageTeamStorage.listFolders();

    expect(teams).toHaveLength(1);
    expect(teams[0]!.folderId ?? null).toBeNull();
    expect(folders).toEqual([]);
  });

  it("guarda y lista carpetas", async () => {
    await localStorageTeamStorage.saveFolder(FOLDER);
    expect(await localStorageTeamStorage.listFolders()).toEqual([FOLDER]);
  });

  it("al borrar una carpeta sube el contenido al padre", async () => {
    await localStorageTeamStorage.saveFolder(FOLDER);
    const child: Folder = { ...FOLDER, id: "f2", name: "Sub", parentId: "f1" };
    await localStorageTeamStorage.saveFolder(child);
    await localStorageTeamStorage.save({ ...TEAM, folderId: "f1" });

    await localStorageTeamStorage.deleteFolder("f1");

    expect(await localStorageTeamStorage.listFolders()).toEqual([{ ...child, parentId: null }]);
    const teams = await localStorageTeamStorage.list();
    expect(teams[0]!.folderId).toBeNull();
  });
});
