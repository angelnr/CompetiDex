import { describe, it, expect } from "vitest";
import {
  addMember,
  DEFAULT_EVS,
  DEFAULT_IVS,
  findFreeSlot,
  generateTeamId,
  isPokemonInTeam,
  MAX_EV_PER_STAT,
  MAX_EV_TOTAL,
  MAX_TEAM_SIZE,
  normalizeMember,
  reindexSlots,
  removeMember,
  teamTypes,
  totalEvs,
  validateEvs,
  validateIvs,
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

describe("normalizeMember", () => {
  it("rellena campos faltantes con defaults", () => {
    const raw: TeamMember = {
      pokemonId: 25,
      name: "pikachu",
      slot: 0,
      sprite: null,
      types: ["electric"],
    };
    const n = normalizeMember(raw);
    expect(n.level).toBe(100);
    expect(n.heldItem).toBeNull();
    expect(n.ability).toBeNull();
    expect(n.nature).toBe("hardy");
    expect(n.ivs).toEqual(DEFAULT_IVS);
    expect(n.evs).toEqual(DEFAULT_EVS);
    expect(n.moves).toEqual([]);
  });

  it("preserva campos existentes", () => {
    const raw: TeamMember = {
      pokemonId: 25,
      name: "pikachu",
      slot: 0,
      sprite: null,
      types: ["electric"],
      level: 50,
      nature: "jolly",
      moves: ["thunderbolt"],
    };
    const n = normalizeMember(raw);
    expect(n.level).toBe(50);
    expect(n.nature).toBe("jolly");
    expect(n.moves).toEqual(["thunderbolt"]);
    expect(n.ivs).toEqual(DEFAULT_IVS);
  });
});

describe("totalEvs", () => {
  it("suma correctamente", () => {
    expect(totalEvs(DEFAULT_EVS)).toBe(0);
    expect(
      totalEvs({
        hp: 252,
        attack: 252,
        defense: 0,
        "special-attack": 0,
        "special-defense": 0,
        speed: 6,
      }),
    ).toBe(510);
  });
});

describe("validateEvs", () => {
  it("acepta valores válidos", () => {
    expect(validateEvs(DEFAULT_EVS)).toBeNull();
    expect(
      validateEvs({
        hp: 252,
        attack: 252,
        defense: 0,
        "special-attack": 0,
        "special-defense": 0,
        speed: 6,
      }),
    ).toBeNull();
  });

  it("rechaza stat > 252", () => {
    expect(
      validateEvs({
        hp: 300,
        attack: 0,
        defense: 0,
        "special-attack": 0,
        "special-defense": 0,
        speed: 0,
      }),
    ).not.toBeNull();
  });

  it("rechaza total > 510", () => {
    expect(
      validateEvs({
        hp: 252,
        attack: 252,
        defense: 252,
        "special-attack": 0,
        "special-defense": 0,
        speed: 0,
      }),
    ).not.toBeNull();
  });
});

describe("validateIvs", () => {
  it("acepta valores válidos", () => {
    expect(validateIvs(DEFAULT_IVS)).toBeNull();
  });

  it("rechaza > 31", () => {
    expect(
      validateIvs({
        hp: 31,
        attack: 99,
        defense: 31,
        "special-attack": 31,
        "special-defense": 31,
        speed: 31,
      }),
    ).not.toBeNull();
  });

  it("rechaza negativo", () => {
    expect(
      validateIvs({
        hp: 0,
        attack: -1,
        defense: 31,
        "special-attack": 31,
        "special-defense": 31,
        speed: 31,
      }),
    ).not.toBeNull();
  });
});
