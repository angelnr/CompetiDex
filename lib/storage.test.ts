import { afterEach, describe, expect, it, vi } from "vitest";

import { remoteTeamStorage, TeamApiError } from "@/lib/storage";
import type { Team } from "@/lib/team";

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
});
