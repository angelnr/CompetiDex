import { describe, expect, it } from "vitest";

import { parseTeamPayload } from "@/lib/team-schema";

const VALID = {
  id: "team-1",
  name: "Mi equipo",
  champions: false,
  members: [
    {
      pokemonId: 25,
      slot: 0,
      name: "pikachu",
      types: ["electric"],
      level: 100,
      nature: "adamant",
      ivs: {
        hp: 31,
        attack: 31,
        defense: 31,
        "special-attack": 31,
        "special-defense": 31,
        speed: 31,
      },
      evs: {
        hp: 4,
        attack: 252,
        defense: 0,
        "special-attack": 0,
        "special-defense": 0,
        speed: 252,
      },
      moves: ["thunderbolt"],
    },
  ],
};

describe("parseTeamPayload", () => {
  it("válida y normaliza un payload correcto", () => {
    const team = parseTeamPayload(VALID);
    expect(team.id).toBe("team-1");
    expect(team.members).toHaveLength(1);
    expect(team.members[0]?.level).toBe(100);
    expect(team.members[0]?.nature).toBe("adamant");
    expect(team.members[0]?.moves).toEqual(["thunderbolt"]);
  });

  it("rechaza slots duplicados", () => {
    const payload = {
      ...VALID,
      members: [
        VALID.members[0]!,
        { ...VALID.members[0]!, pokemonId: 26, slot: 0, name: "raichu" },
      ],
    };
    expect(() => parseTeamPayload(payload)).toThrow(/slot duplicado/);
  });

  it("rechaza Pokémon duplicados", () => {
    const payload = {
      ...VALID,
      members: [VALID.members[0]!, { ...VALID.members[0]!, slot: 1 }],
    };
    expect(() => parseTeamPayload(payload)).toThrow(/duplicados/);
  });

  it("rechaza EVs por encima del límite no-Champions", () => {
    const payload = {
      ...VALID,
      members: [
        {
          ...VALID.members[0]!,
          evs: {
            hp: 4,
            attack: 300,
            defense: 0,
            "special-attack": 0,
            "special-defense": 0,
            speed: 252,
          },
        },
      ],
    };
    expect(() => parseTeamPayload(payload)).toThrow(/EVs in attack/);
  });

  it("permite EVs Champions (32/66) cuando el equipo es formato Champions", () => {
    const payload = {
      ...VALID,
      champions: true,
      members: [
        {
          ...VALID.members[0]!,
          ivs: { ...VALID.members[0]!.ivs, hp: 0 },
          evs: {
            hp: 4,
            attack: 30,
            defense: 30,
            "special-attack": 0,
            "special-defense": 0,
            speed: 2,
          },
        },
      ],
    };
    const team = parseTeamPayload(payload);
    expect(team.champions).toBe(true);
    expect(team.members[0]!.evs!.attack).toBe(30);
    expect(team.members[0]!.level).toBe(50);
    // Champions no usa IVs: se normalizan al máximo (31).
    expect(team.members[0]!.ivs!.hp).toBe(31);
  });

  it("usa IVs 31 por defecto cuando el miembro no los incluye", () => {
    const payload = {
      ...VALID,
      members: [
        {
          pokemonId: 25,
          slot: 0,
          name: "pikachu",
          types: ["electric"],
        },
      ],
    };
    const team = parseTeamPayload(payload);
    expect(team.members[0]!.ivs).toEqual({
      hp: 31,
      attack: 31,
      defense: 31,
      "special-attack": 31,
      "special-defense": 31,
      speed: 31,
    });
  });

  it("rechaza payload no conforme al esquema", () => {
    expect(() => parseTeamPayload({ id: 123 })).toThrow();
    expect(() => parseTeamPayload(null)).toThrow();
  });
});
