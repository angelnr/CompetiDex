import { describe, it, expect } from "vitest";
import { teamToPokepaste, slugToTitle } from "@/lib/pokepaste";
import type { Team } from "@/lib/team";

const fullTeam: Team = {
  id: "test-1",
  name: "My Competitive Team",
  members: [
    {
      pokemonId: 6,
      name: "charizard",
      slot: 0,
      sprite: null,
      types: ["fire", "flying"],
      level: 100,
      heldItem: "life-orb",
      ability: "blaze",
      nature: "timid",
      ivs: {
        hp: 31,
        attack: 0,
        defense: 31,
        "special-attack": 31,
        "special-defense": 31,
        speed: 31,
      },
      evs: {
        hp: 0,
        attack: 0,
        defense: 0,
        "special-attack": 252,
        "special-defense": 0,
        speed: 252,
      },
      moves: ["fire-blast", "solar-beam", "focus-blast", "air-slash"],
    },
    {
      pokemonId: 448,
      name: "lucario",
      slot: 1,
      sprite: null,
      types: ["fighting", "steel"],
      level: 50,
      heldItem: "life-orb",
      ability: "justified",
      nature: "jolly",
      ivs: {
        hp: 30,
        attack: 31,
        defense: 30,
        "special-attack": 0,
        "special-defense": 30,
        speed: 31,
      },
      evs: {
        hp: 6,
        attack: 252,
        defense: 0,
        "special-attack": 0,
        "special-defense": 6,
        speed: 246,
      },
      moves: ["close-combat", "extreme-speed", "swords-dance", "bullet-punch"],
    },
  ],
  createdAt: 0,
  updatedAt: 0,
};

const minimalTeam: Team = {
  id: "test-2",
  name: "Minimal",
  members: [
    {
      pokemonId: 25,
      name: "pikachu",
      slot: 0,
      sprite: null,
      types: ["electric"],
    },
  ],
  createdAt: 0,
  updatedAt: 0,
};

const emptyNameTeam: Team = {
  id: "test-3",
  name: "",
  members: [],
  createdAt: 0,
  updatedAt: 0,
};

describe("slugToTitle", () => {
  it("convierte guiones a espacios y capitaliza", () => {
    expect(slugToTitle("close-combat")).toBe("Close Combat");
    expect(slugToTitle("thunder-bolt")).toBe("Thunder Bolt");
    expect(slugToTitle("fire-blast")).toBe("Fire Blast");
    expect(slugToTitle("charizard")).toBe("Charizard");
  });
});

describe("teamToPokepaste", () => {
  it("serializa equipo completo correctamente", () => {
    const output = teamToPokepaste(fullTeam);
    const expected = [
      "My Competitive Team",
      "",
      "Charizard @ Life Orb",
      "Ability: Blaze",
      "Timid Nature",
      "EVs: 252 SpA / 252 Spe",
      "IVs: 0 Atk",
      "- Fire Blast",
      "- Solar Beam",
      "- Focus Blast",
      "- Air Slash",
      "",
      "Lucario @ Life Orb",
      "Ability: Justified",
      "Level: 50",
      "Jolly Nature",
      "EVs: 6 HP / 252 Atk / 6 SpD / 246 Spe",
      "IVs: 30 HP / 30 Def / 0 SpA / 30 SpD",
      "- Close Combat",
      "- Extreme Speed",
      "- Swords Dance",
      "- Bullet Punch",
    ].join("\n");
    expect(output).toBe(expected);
  });

  it("serializa miembro minimalista sin campos extra", () => {
    const output = teamToPokepaste(minimalTeam);
    const lines = output.split("\n");
    expect(lines[0]).toBe("Minimal");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("Pikachu");
    // No ability, no item, no nature (hardy se omite), no EVs, no IVs (31s omitidos), no moves
    expect(lines[3]).toBeUndefined(); // solo 3 líneas (header + blank + species)
  });

  it("equipo vacío produce solo el nombre", () => {
    const output = teamToPokepaste(emptyNameTeam);
    expect(output).toBe("Untitled Team");
  });
});
