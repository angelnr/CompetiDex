import { describe, it, expect } from "vitest";
import {
  addMember,
  findFreeSlot,
  generateTeamId,
  isPokemonInTeam,
  MAX_TEAM_SIZE,
  reindexSlots,
  removeMember,
  teamTypes,
  validateTeamName,
} from "@/lib/team";
import type { TeamMember } from "@/lib/team";

const pikachu: TeamMember = {
  pokemonId: 25,
  name: "pikachu",
  slot: 0,
  sprite: null,
  types: ["electric"],
};

const bulbasaur: TeamMember = {
  pokemonId: 1,
  name: "bulbasaur",
  slot: 1,
  sprite: null,
  types: ["grass", "poison"],
};

describe("validateTeamName", () => {
  it("rejects empty name", () => {
    expect(validateTeamName("")).not.toBeNull();
    expect(validateTeamName("   ")).not.toBeNull();
  });
  it("accepts valid name", () => {
    expect(validateTeamName("Mi equipo")).toBeNull();
  });
  it("rejects too long", () => {
    expect(validateTeamName("x".repeat(31))).not.toBeNull();
    expect(validateTeamName("x".repeat(30))).toBeNull();
  });
});

describe("isPokemonInTeam", () => {
  it("true si el pokemon ya esta", () => {
    expect(isPokemonInTeam([pikachu], 25)).toBe(true);
  });
  it("false si no esta", () => {
    expect(isPokemonInTeam([bulbasaur], 25)).toBe(false);
  });
});

describe("findFreeSlot", () => {
  it("devuelve primer slot libre", () => {
    expect(findFreeSlot([pikachu])).toBe(1);
  });
  it("-1 si lleno", () => {
    const members = Array.from({ length: MAX_TEAM_SIZE }, (_, i) => ({
      ...pikachu,
      pokemonId: i + 100,
      slot: i,
    }));
    expect(findFreeSlot(members)).toBe(-1);
  });
});

describe("addMember", () => {
  it("anyade y asigna slot", () => {
    const result = addMember([], {
      pokemonId: 25,
      name: "pikachu",
      sprite: null,
      types: ["electric"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.members).toHaveLength(1);
      expect(result.members[0]!.slot).toBe(0);
    }
  });

  it("rechaza duplicados", () => {
    const result = addMember([pikachu], {
      pokemonId: 25,
      name: "pikachu",
      sprite: null,
      types: ["electric"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("ya está en el equipo");
  });

  it("rechaza equipo lleno", () => {
    const full = Array.from({ length: MAX_TEAM_SIZE }, (_, i) => ({
      ...pikachu,
      pokemonId: i + 100,
      slot: i,
    }));
    const result = addMember(full, { pokemonId: 999, name: "new", sprite: null, types: [] });
    expect(result.ok).toBe(false);
  });
});

describe("removeMember", () => {
  it("elimina por id", () => {
    const result = removeMember([pikachu, bulbasaur], 25);
    expect(result).toHaveLength(1);
    expect(result[0]!.pokemonId).toBe(1);
  });
});

describe("reindexSlots", () => {
  it("reordena slots contiguamente", () => {
    const members = [
      { ...pikachu, slot: 0 },
      { ...bulbasaur, slot: 2 },
    ];
    const reindexed = reindexSlots(members);
    expect(reindexed[0]!.slot).toBe(0);
    expect(reindexed[1]!.slot).toBe(1);
  });
});

describe("teamTypes", () => {
  it("devuelve tipos unicos del equipo", () => {
    const types = teamTypes([pikachu, bulbasaur]);
    expect(types).toContain("electric");
    expect(types).toContain("grass");
    expect(types).toContain("poison");
    expect(types).toHaveLength(3);
  });
});

describe("generateTeamId", () => {
  it("genera ids unicos", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTeamId()));
    expect(ids.size).toBe(100);
  });
});
