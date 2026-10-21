import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock se hoistea: el mock debe crearse con vi.hoisted.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    team: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { saveTeam, TeamLimitError, TeamOwnershipError } from "@/lib/server/teams";
import { MAX_TEAMS_PER_USER } from "@/lib/team";

const newTeam = {
  id: "t1",
  name: "Equipo de prueba",
  members: [],
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveTeam", () => {
  it("rechaza crear un equipo nuevo si se alcanzó el límite por usuario", async () => {
    prismaMock.team.findUnique.mockResolvedValueOnce(null);
    prismaMock.team.count.mockResolvedValueOnce(MAX_TEAMS_PER_USER);

    await expect(saveTeam("user-1", newTeam)).rejects.toBeInstanceOf(TeamLimitError);
    expect(prismaMock.team.count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("permite crear mientras no se alcance el límite", async () => {
    prismaMock.team.findUnique.mockResolvedValueOnce(null);
    prismaMock.team.count.mockResolvedValueOnce(MAX_TEAMS_PER_USER - 1);

    // Al pasar el chequeo, intenta escribir: el mock no define $transaction, así
    // que basta con comprobar que el error NO es el de límite.
    await expect(saveTeam("user-1", newTeam)).rejects.not.toBeInstanceOf(TeamLimitError);
  });

  it("rechaza escribir sobre un equipo de otro usuario sin consultar el límite", async () => {
    prismaMock.team.findUnique.mockResolvedValueOnce({ id: "t1", userId: "otro" });

    await expect(saveTeam("user-1", newTeam)).rejects.toBeInstanceOf(TeamOwnershipError);
    expect(prismaMock.team.count).not.toHaveBeenCalled();
  });
});
