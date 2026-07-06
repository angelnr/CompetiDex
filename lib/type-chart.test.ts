import { describe, it, expect } from "vitest";
import {
  TYPE_CHART,
  REAL_TYPES,
  getOffensiveMultiplier,
  getDefensiveMultiplier,
  getTeamCoverageBreakdown,
} from "@/lib/type-chart";

describe("TYPE_CHART", () => {
  it("tiene las 18 claves de tipos reales", () => {
    expect(REAL_TYPES.length).toBe(18);
    expect(REAL_TYPES).toContain("normal");
    expect(REAL_TYPES).toContain("fairy");
    expect(REAL_TYPES).not.toContain("stellar");
    expect(REAL_TYPES).not.toContain("unknown");
  });
});

describe("getOffensiveMultiplier", () => {
  it("fuego vs planta → x2", () => {
    expect(getOffensiveMultiplier("fire", "grass")).toBe(2);
  });

  it("fuego vs agua → x0.5", () => {
    expect(getOffensiveMultiplier("fire", "water")).toBe(0.5);
  });

  it("eléctrico vs tierra → x0", () => {
    expect(getOffensiveMultiplier("electric", "ground")).toBe(0);
  });

  it("fantasma vs normal → x0", () => {
    expect(getOffensiveMultiplier("ghost", "normal")).toBe(0);
  });

  it("normal vs fantasma → x0", () => {
    expect(getOffensiveMultiplier("normal", "ghost")).toBe(0);
  });

  it("hada vs dragón → x2", () => {
    expect(getOffensiveMultiplier("fairy", "dragon")).toBe(2);
  });

  it("neutro cuando no hay relacion especial", () => {
    expect(getOffensiveMultiplier("normal", "electric")).toBe(1);
  });

  it("case-insensitive", () => {
    expect(getOffensiveMultiplier("Fire", "Grass")).toBe(2);
  });
});

describe("getDefensiveMultiplier", () => {
  it("tipo único: hielo vs dragón/volador → x4 (x2 * x2)", () => {
    // Ice hits Dragon x2, Flying x2 → x4
    expect(getDefensiveMultiplier("ice", ["dragon", "flying"])).toBe(4);
  });

  it("fuego vs roca/agua → x0.25 (x0.5 * x0.5)", () => {
    expect(getDefensiveMultiplier("fire", ["rock", "water"])).toBe(0.25);
  });

  it("inmunidad prevalece: fantasma vs normal → x0", () => {
    expect(getDefensiveMultiplier("ghost", ["normal", "fairy"])).toBe(0);
  });

  it("mix x2 * x0.5 = x1 (neutro)", () => {
    // Water vs Fire (x2) y Grass (x0.5) = 1
    expect(getDefensiveMultiplier("water", ["fire", "grass"])).toBe(1);
  });

  it("array vacío → 1", () => {
    expect(getDefensiveMultiplier("fire", [])).toBe(1);
  });
});

describe("getTeamCoverageBreakdown", () => {
  it("equipo de un solo tipo → mismo resultado que sin equipo", () => {
    const result = getTeamCoverageBreakdown([{ name: "Charizard", types: ["fire", "flying"] }]);
    // Charizard (fire/flying):
    // weaknesses: water(x2), electric(x2), rock(x4)...
    expect(result.weaknesses.some((w) => w.type === "rock")).toBe(true);
    expect(result.weaknesses.find((w) => w.type === "rock")?.multiplier).toBe(4);
  });

  it("inmunidad del equipo se refleja", () => {
    const result = getTeamCoverageBreakdown([{ name: "Gengar", types: ["ghost", "poison"] }]);
    expect(result.immunities).toContain("normal");
    expect(result.immunities).toContain("fighting");
  });

  it("equipo vacío devuelve breakdown vacío", () => {
    const result = getTeamCoverageBreakdown([]);
    expect(result.weaknesses).toEqual([]);
    expect(result.resistances).toEqual([]);
    expect(result.immunities).toEqual([]);
  });
});
