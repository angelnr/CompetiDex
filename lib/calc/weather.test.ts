import { describe, expect, it } from "vitest";

import { moveOverride, terrainPulseOverride, weatherBallOverride } from "@/lib/calc/weather";
import { EMPTY_CALC_FIELD, type CalcFieldInput } from "@/lib/calc/types";

function field(patch: Partial<CalcFieldInput>): CalcFieldInput {
  return { ...EMPTY_CALC_FIELD, ...patch };
}

describe("weatherBallOverride", () => {
  it("sin clima devuelve null (50 Normal)", () => {
    expect(weatherBallOverride(field({ weather: "none" }))).toBeNull();
  });

  it("en sol corrige el tipo a Fuego (calc ya dobla la potencia)", () => {
    expect(weatherBallOverride(field({ weather: "sun" }))).toEqual({ type: "Fire" });
  });

  it("en lluvia corrige el tipo a Agua", () => {
    expect(weatherBallOverride(field({ weather: "rain" }))).toEqual({ type: "Water" });
  });

  it("en arena es Roca y en nieve Hielo", () => {
    expect(weatherBallOverride(field({ weather: "sand" }))).toEqual({ type: "Rock" });
    expect(weatherBallOverride(field({ weather: "snow" }))).toEqual({ type: "Ice" });
  });
});

describe("terrainPulseOverride", () => {
  it("en terreno eléctrico es 100 Eléctrico", () => {
    expect(terrainPulseOverride(field({ terrain: "electric" }))).toEqual({
      basePower: 100,
      type: "Electric",
    });
  });

  it("sin terreno devuelve null", () => {
    expect(terrainPulseOverride(field({ terrain: "none" }))).toBeNull();
  });
});

describe("moveOverride", () => {
  it("despacha por slug compacto", () => {
    expect(moveOverride("weatherball", field({ weather: "sun" }))?.type).toBe("Fire");
    expect(moveOverride("terrainpulse", field({ terrain: "grassy" }))?.type).toBe("Grass");
    expect(moveOverride("thunderbolt", field({ weather: "sun" }))).toBeNull();
  });
});
