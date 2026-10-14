import type { Team, TeamMember } from "@/lib/team";
import { normalizeMember } from "@/lib/team";
import type { Folder } from "@/lib/folders";
import { promoteOnDelete } from "@/lib/folders";

const STORAGE_KEY = "competidex:teams";
const CURRENT_VERSION = 3;

interface StoredData {
  version: number;
  teams: Team[];
  folders: Folder[];
}

// ---------------------------------------------------------------------------
// Migraciones
// ---------------------------------------------------------------------------

function migrateV1toV2(teams: Team[]): Team[] {
  return teams.map((team) => ({
    ...team,
    members: team.members.map(normalizeMember),
  }));
}

function migrateData(data: StoredData): StoredData {
  const rawTeams = Array.isArray(data.teams) ? data.teams : [];
  const rawFolders = Array.isArray(data.folders) ? data.folders : [];
  let teams = rawTeams;

  if (!data.version || data.version < 2) {
    teams = migrateV1toV2(teams);
  }

  // v3: las carpetas aparecen; los equipos sin `folderId` van a la raíz.
  if (!data.version || data.version < 3) {
    teams = teams.map((team) => ({ ...team, folderId: team.folderId ?? null }));
  }

  return { version: CURRENT_VERSION, teams, folders: rawFolders };
}

// ---------------------------------------------------------------------------
// Interfaz abstracta (localStorage para invitados, API/Prisma para usuarios)
// ---------------------------------------------------------------------------

export interface TeamStorage {
  list(): Promise<Team[]>;
  get(id: string): Promise<Team | null>;
  save(team: Team): Promise<void>;
  delete(id: string): Promise<void>;
  listFolders(): Promise<Folder[]>;
  saveFolder(folder: Folder): Promise<void>;
  /** Borra la carpeta subiendo su contenido (equipos y subcarpetas) al padre. */
  deleteFolder(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Implementación localStorage
// ---------------------------------------------------------------------------

function emptyData(): StoredData {
  return { version: CURRENT_VERSION, teams: [], folders: [] };
}

function readData(): StoredData {
  if (typeof localStorage === "undefined") return emptyData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as StoredData;
    const migrated = migrateData(parsed);
    if (migrated.version !== parsed.version) {
      writeData(migrated);
    }
    return migrated;
  } catch {
    return emptyData();
  }
}

function writeData(data: StoredData): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const localStorageTeamStorage: TeamStorage = {
  async list(): Promise<Team[]> {
    return readData().teams;
  },

  async get(id: string): Promise<Team | null> {
    const data = readData();
    return data.teams.find((t) => t.id === id) ?? null;
  },

  async save(team: Team): Promise<void> {
    const data = readData();
    const idx = data.teams.findIndex((t) => t.id === team.id);
    if (idx >= 0) {
      data.teams[idx] = team;
    } else {
      data.teams.push(team);
    }
    writeData(data);
  },

  async delete(id: string): Promise<void> {
    const data = readData();
    data.teams = data.teams.filter((t) => t.id !== id);
    writeData(data);
  },

  async listFolders(): Promise<Folder[]> {
    return readData().folders;
  },

  async saveFolder(folder: Folder): Promise<void> {
    const data = readData();
    const idx = data.folders.findIndex((f) => f.id === folder.id);
    if (idx >= 0) {
      data.folders[idx] = folder;
    } else {
      data.folders.push(folder);
    }
    writeData(data);
  },

  async deleteFolder(id: string): Promise<void> {
    const data = readData();
    const { folders, parentId } = promoteOnDelete(data.folders, id);
    const teams = data.teams.map((team) =>
      team.folderId === id ? { ...team, folderId: parentId } : team,
    );
    writeData({ ...data, folders, teams });
  },
};

// ---------------------------------------------------------------------------
// Implementación remota (Prisma vía API routes `/api/teams` y `/api/folders`)
// ---------------------------------------------------------------------------

export class TeamApiError extends Error {
  constructor(public status: number) {
    super(`API error ${status}`);
    this.name = "TeamApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new TeamApiError(res.status);
  return (await res.json()) as T;
}

export const remoteTeamStorage: TeamStorage = {
  async list(): Promise<Team[]> {
    return apiFetch<Team[]>("/api/teams");
  },

  async get(id: string): Promise<Team | null> {
    const res = await fetch(`/api/teams/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new TeamApiError(res.status);
    return (await res.json()) as Team;
  },

  async save(team: Team): Promise<void> {
    await apiFetch<Team>(`/api/teams/${encodeURIComponent(team.id)}`, {
      method: "PUT",
      body: JSON.stringify(team),
    });
  },

  async delete(id: string): Promise<void> {
    await apiFetch<unknown>(`/api/teams/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async listFolders(): Promise<Folder[]> {
    return apiFetch<Folder[]>("/api/folders");
  },

  async saveFolder(folder: Folder): Promise<void> {
    await apiFetch<Folder>(`/api/folders/${encodeURIComponent(folder.id)}`, {
      method: "PUT",
      body: JSON.stringify(folder),
    });
  },

  async deleteFolder(id: string): Promise<void> {
    await apiFetch<unknown>(`/api/folders/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
