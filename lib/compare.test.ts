import { describe, it, expect } from "vitest";
import type { Pokemon } from "@/lib/pokeapi";
import { compareStats, comparePhysical, compareTypes, summarizeAdvantage } from "@/lib/compare";

function mockPokemon(id: number, name: string, stats: Partial<Record<string, number>>): Pokemon {
  const statKeys = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
  return {
    id,
    name,
    base_experience: 100,
    height: 10,
    weight: 100,
    order: id,
    is_default: true,
    species: { name, url: "" },
    abilities: [],
    types: [{ slot: 1, type: { name: "normal", url: "" } }],
    stats: statKeys.map((key) => ({
      base_stat: stats[key] ?? 50,
      effort: 0,
      stat: { name: key, url: "" },
    })),
    sprites: {
      front_default: null,
      front_shiny: null,
      front_female: null,
      front_shiny_female: null,
      back_default: null,
      back_shiny: null,
      back_female: null,
      back_shiny_female: null,
    },
    moves: [],
  };
}

describe("compareStats", () => {
  it("compara stats iguales → tie en todas", () => {
    const a = mockPokemon(1, "a", { hp: 100 });
    const b = mockPokemon(2, "b", { hp: 100 });
    const result = compareStats(a, b);
    const hpResult = result.find((s) => s.statKey === "hp");
    expect(hpResult?.winner).toBe("tie");
    expect(hpResult?.diff).toBe(0);
  });

  it("detecta ganador cuando A > B", () => {
    const a = mockPokemon(1, "a", { hp: 120, attack: 80 });
    const b = mockPokemon(2, "b", { hp: 100, attack: 100 });
    const result = compareStats(a, b);
    expect(result.find((s) => s.statKey === "hp")?.winner).toBe("a");
    expect(result.find((s) => s.statKey === "attack")?.winner).toBe("b");
  });

  it("devuelve 6 filas", () => {
    const a = mockPokemon(1, "a", {});
    const b = mockPokemon(2, "b", {});
    expect(compareStats(a, b)).toHaveLength(6);
  });
});

describe("compareTypes", () => {
  it("detecta tipos compartidos y exclusivos", () => {
    const a = {
      ...mockPokemon(1, "a", {}),
      types: [
        { slot: 1, type: { name: "fire", url: "" } },
        { slot: 2, type: { name: "flying", url: "" } },
      ],
    };
    const b = { ...mockPokemon(2, "b", {}), types: [{ slot: 1, type: { name: "fire", url: "" } }] };
    const result = compareTypes(a, b);
    expect(result.shared).toEqual(["fire"]);
    expect(result.onlyA).toEqual(["flying"]);
    expect(result.onlyB).toEqual([]);
  });
});

describe("comparePhysical", () => {
  it("devuelve altura, peso y exp. base", () => {
    const a = mockPokemon(1, "a", {});
    const b = mockPokemon(2, "b", {});
    const result = comparePhysical(a, b);
    expect(result).toHaveLength(3);
    expect(result[0]?.key).toBe("height");
    expect(result[1]?.key).toBe("weight");
    expect(result[2]?.key).toBe("base_experience");
  });
});

describe("summarizeAdvantage", () => {
  it("cuando A gana en más stats", () => {
    const a = mockPokemon(1, "pikachu", {
      hp: 200,
      attack: 200,
      defense: 200,
      "special-attack": 200,
      "special-defense": 200,
      speed: 200,
    });
    const b = mockPokemon(2, "raichu", {
      hp: 50,
      attack: 50,
      defense: 50,
      "special-attack": 50,
      "special-defense": 50,
      speed: 50,
    });
    expect(summarizeAdvantage(a, b)).toBe("Pikachu gana en 6 de 6 stats base.");
  });

  it("cuando empatan", () => {
    const a = mockPokemon(1, "a", { hp: 100, attack: 100 });
    const b = mockPokemon(2, "b", { hp: 100, attack: 100 });
    expect(summarizeAdvantage(a, b)).toContain("empatados");
  });
});
