/**
 * Capa de persistencia para equipos.
 *
 * Actual: localStorage del navegador.
 * Futuro: Prisma + SQLite/Postgres (cuando haya autenticación).
 *
 * La interfaz `TeamStorage` permite intercambiar implementaciones sin
 * cambiar el hook `useTeams` ni los componentes.
 */

import type { Team } from "@/lib/team";

const STORAGE_KEY = "competidex:teams";
const CURRENT_VERSION = 1;

interface StoredData {
  version: number;
  teams: Team[];
}

// ---------------------------------------------------------------------------
// Interfaz abstracta (preparada para Prisma)
// ---------------------------------------------------------------------------

export interface TeamStorage {
  list(): Promise<Team[]>;
  get(id: string): Promise<Team | null>;
  save(team: Team): Promise<void>;
  delete(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Implementación localStorage
// ---------------------------------------------------------------------------

function readData(): StoredData {
  if (typeof localStorage === "undefined") {
    return { version: CURRENT_VERSION, teams: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: CURRENT_VERSION, teams: [] };
    return JSON.parse(raw) as StoredData;
  } catch {
    return { version: CURRENT_VERSION, teams: [] };
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
};
