import { describe, expect, it } from "vitest";

import { boostMultiplier, effectiveStat } from "@/lib/calc/stages";

describe("boostMultiplier", () => {
  it("positivo: (2+n)/2", () => {
    expect(boostMultiplier(1)).toBeCloseTo(1.5);
    expect(boostMultiplier(2)).toBe(2);
    expect(boostMultiplier(3)).toBeCloseTo(2.5);
    expect(boostMultiplier(6)).toBe(4);
  });

  it("negativo: 2/(2-n)", () => {
    expect(boostMultiplier(-1)).toBeCloseTo(2 / 3);
    expect(boostMultiplier(-2)).toBe(0.5);
    expect(boostMultiplier(-3)).toBeCloseTo(0.4);
    expect(boostMultiplier(-4)).toBeCloseTo(1 / 3);
    expect(boostMultiplier(-6)).toBe(0.25);
  });

  it("neutro: 1", () => {
    expect(boostMultiplier(0)).toBe(1);
  });
});

describe("effectiveStat", () => {
  it("redondea hacia abajo", () => {
    expect(effectiveStat(200, 1)).toBe(300); // 200*1.5
    expect(effectiveStat(283, -1)).toBe(188); // 283*2/3 = 188.67 → 188
    expect(effectiveStat(100, -6)).toBe(25); // 100*0.25
  });
});
