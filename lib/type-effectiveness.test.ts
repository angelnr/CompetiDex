import { describe, it, expect } from "vitest";
import {
  computeDefensiveEffectiveness,
  categorizeEffectiveness,
  formatMultiplier,
} from "@/lib/type-effectiveness";
import type { TypeRelations } from "@/lib/pokeapi";

/** Helper que crea un NamedAPIResource con url vacía (no se usa en el cálculo). */
function res(name: string) {
  return { name, url: "" };
}

function rel(partial: Partial<TypeRelations>): TypeRelations {
  return {
    no_damage_to: [],
    half_damage_to: [],
    double_damage_to: [],
    no_damage_from: [],
    half_damage_from: [],
    double_damage_from: [],
    ...partial,
  };
}

const fireRelations = rel({
  double_damage_from: [res("water"), res("ground"), res("rock")],
  half_damage_from: [res("fire"), res("grass"), res("ice")],
});

const flyingRelations = rel({
  double_damage_from: [res("electric"), res("ice"), res("rock")],
  half_damage_from: [res("grass"), res("fighting"), res("bug")],
  no_damage_from: [res("ground")],
});

describe("computeDefensiveEffectiveness", () => {
  it("tipo unico: aplica multiplicadores directos", () => {
    const map = computeDefensiveEffectiveness([{ name: "fire", relations: fireRelations }]);
    expect(map.water).toBe(2);
    expect(map.ground).toBe(2);
    expect(map.rock).toBe(2);
    expect(map.fire).toBe(0.5);
    expect(map.grass).toBe(0.5);
    expect(map.ice).toBe(0.5);
  });

  it("tipo unico con inmunidad: x0", () => {
    const map = computeDefensiveEffectiveness([{ name: "flying", relations: flyingRelations }]);
    expect(map.ground).toBe(0);
    expect(map.electric).toBe(2);
    expect(map.ice).toBe(2);
    expect(map.grass).toBe(0.5);
  });

  it("dos tipos: multiplica coincidencias (x4 en doble debilidad)", () => {
    // Planta/Veneno vs Volador/Tierra/Planta/Psíquico/Bicho...
    // Planta: x2 de {fire, flying, ice, poison, bug}, x0.5 de {water, electric,
    //   grass, fighting, fairy}
    // Let's craft a pinch case: dual tipo con x2 * x2 = x4
    const relationsA = rel({ double_damage_from: [res("fire")] });
    const relationsB = rel({ double_damage_from: [res("fire")] });
    const map = computeDefensiveEffectiveness([
      { name: "a", relations: relationsA },
      { name: "b", relations: relationsB },
    ]);
    expect(map.fire).toBe(4);
  });

  it("dos tipos: x2 * x0.5 se anula a neutro (no aparece en el mapa)", () => {
    const relationsA = rel({ double_damage_from: [res("fire")] });
    const relationsB = rel({ half_damage_from: [res("fire")] });
    const map = computeDefensiveEffectiveness([
      { name: "a", relations: relationsA },
      { name: "b", relations: relationsB },
    ]);
    expect(map.fire).toBe(1);
  });

  it("dos tipos: inmunidad prevalece sobre debilidad", () => {
    const relationsA = rel({ double_damage_from: [res("ghost")] });
    const relationsB = rel({ no_damage_from: [res("ghost")] });
    const map = computeDefensiveEffectiveness([
      { name: "a", relations: relationsA },
      { name: "b", relations: relationsB },
    ]);
    expect(map.ghost).toBe(0);
  });

  it("sin tipos devuelve mapa vacio", () => {
    expect(computeDefensiveEffectiveness([])).toEqual({});
  });
});

describe("categorizeEffectiveness", () => {
  it("reparte weaknesses, resistances e immunities", () => {
    const map = computeDefensiveEffectiveness([{ name: "fire", relations: fireRelations }]);
    const result = categorizeEffectiveness(map);
    expect(result.weaknesses.map((w) => w.type)).toEqual(
      expect.arrayContaining(["water", "ground", "rock"]),
    );
    expect(result.resistances.map((r) => r.type)).toEqual(
      expect.arrayContaining(["fire", "grass", "ice"]),
    );
    expect(result.immunities).toEqual([]);
  });

  it("ordena weaknesses por multiplier descendente (x4 antes de x2)", () => {
    const map: Record<string, number> = { fire: 2, water: 4, grass: 0.5, ice: 0.25 };
    const result = categorizeEffectiveness(map);
    expect(result.weaknesses[0]).toEqual({ type: "water", multiplier: 4 });
    expect(result.weaknesses[1]).toEqual({ type: "fire", multiplier: 2 });
    expect(result.resistances[0]).toEqual({ type: "ice", multiplier: 0.25 });
    expect(result.resistances[1]).toEqual({ type: "grass", multiplier: 0.5 });
  });

  it("incluye immunities", () => {
    const map: Record<string, number> = { normal: 0 };
    const result = categorizeEffectiveness(map);
    expect(result.immunities).toEqual(["normal"]);
  });

  it("mapa vacio devuelve breakdown vacio", () => {
    const result = categorizeEffectiveness({});
    expect(result).toEqual({ weaknesses: [], resistances: [], immunities: [] });
  });
});

describe("formatMultiplier", () => {
  it("formatea valores comunes", () => {
    expect(formatMultiplier(0)).toBe("x0");
    expect(formatMultiplier(0.25)).toBe("x¼");
    expect(formatMultiplier(0.5)).toBe("x½");
    expect(formatMultiplier(1)).toBe("x1");
    expect(formatMultiplier(2)).toBe("x2");
    expect(formatMultiplier(4)).toBe("x4");
  });
});
