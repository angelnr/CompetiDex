import { describe, expect, it } from "vitest";

import { computeCalcStats, computeMatchups, getSpeciesAbilities } from "@/lib/calc/engine";
import { EMPTY_CALC_FIELD, EMPTY_CALC_INPUT, type CalcPokemonInput } from "@/lib/calc/types";
import { teamMemberToCalcInput, toSpeciesGenslug, titleCase } from "@/lib/calc/convert";
import { DEFAULT_IVS, type TeamMember } from "@/lib/team";

const ABOMASNOW: CalcPokemonInput = {
  ...EMPTY_CALC_INPUT,
  species: "abomasnow",
  level: 100,
  nature: "hardy",
  evs: {
    hp: 0,
    attack: 0,
    defense: 0,
    "special-attack": 252,
    "special-defense": 0,
    speed: 0,
  },
  moves: ["blizzard"],
};

describe("lib/calc/engine", () => {
  it("reproduce el fixture dorado de Abomasnow (notación Smogon exacta)", async () => {
    const results = await computeMatchups(ABOMASNOW, ABOMASNOW, EMPTY_CALC_FIELD);
    expect(results).toHaveLength(1);
    expect(results[0]?.desc).toBe(
      "252 SpA Abomasnow Blizzard vs. 0 HP / 0 SpD Abomasnow: 162-192 (50.4 - 59.8%) -- guaranteed 2HKO",
    );
    expect(results[0]?.damageMin).toBe(162);
    expect(results[0]?.damageMax).toBe(192);
  });

  it("calcula stats finales (base + IV 31 + EV 252 + naturaleza al nivel 100)", async () => {
    const stats = await computeCalcStats(ABOMASNOW, ABOMASNOW);
    // Abomasnow: HP 90, SpA 92, SpD 85; IVs 31, EVs y naturaleza neutrales
    // (solo SpA 252). Fórmula: floor((2*base+IV+floor(EV/4))*level/100)+level+5.
    expect(stats.attacker.hp).toBe(321);
    expect(stats.attacker.spa).toBe(283);
    expect(stats.defender.spd).toBe(206);
  });

  it("pantalla de luz reduce el daño especial", async () => {
    const base = await computeMatchups(ABOMASNOW, ABOMASNOW, EMPTY_CALC_FIELD);
    const withScreen = await computeMatchups(ABOMASNOW, ABOMASNOW, {
      ...EMPTY_CALC_FIELD,
      isLightScreen: true,
    });
    expect(withScreen[0]?.damageMax).toBeLessThan(base[0]!.damageMax);
  });

  it("crítico sube el daño máximo", async () => {
    const base = await computeMatchups(ABOMASNOW, ABOMASNOW, EMPTY_CALC_FIELD);
    const crit = await computeMatchups(ABOMASNOW, ABOMASNOW, {
      ...EMPTY_CALC_FIELD,
      critical: true,
    });
    expect(crit[0]?.damageMax).toBeGreaterThan(base[0]!.damageMax);
  });

  it("aplica boosts de atacante al daño", async () => {
    const base = await computeMatchups(ABOMASNOW, ABOMASNOW, EMPTY_CALC_FIELD);
    const boosted = await computeMatchups(
      { ...ABOMASNOW, boosts: { ...ABOMASNOW.boosts, "special-attack": 2 } },
      ABOMASNOW,
      EMPTY_CALC_FIELD,
    );
    expect(boosted[0]?.damageMax).toBeGreaterThan(base[0]!.damageMax);
  });

  it("Meteorobola pega más en sol y se calcula a 100 BP (no 200)", async () => {
    const atk = { ...ABOMASNOW, moves: ["weather-ball"] };
    const none = await computeMatchups(atk, ABOMASNOW, EMPTY_CALC_FIELD);
    const sun = await computeMatchups(atk, ABOMASNOW, { ...EMPTY_CALC_FIELD, weather: "sun" });
    expect(sun[0]?.damageMax).toBeGreaterThan(none[0]!.damageMax);
    expect(sun[0]?.desc).toContain("(100 BP)");
    expect(sun[0]?.desc).not.toContain("(200 BP)");
  });

  it("expone las habilidades de una especie según el dex de Gen 9", async () => {
    const abilities = await getSpeciesAbilities("abomasnow");
    expect(abilities).toContain("Snow Warning");
  });
});

describe("lib/calc/convert", () => {
  it("convierte slugs kebab a slugs compactos de Showdown", () => {
    expect(toSpeciesGenslug("charizard-mega-x")).toBe("charizardmegax");
    expect(titleCase("life-orb")).toBe("Life Orb");
  });

  it("reutiliza un miembro de equipo como entrada", () => {
    const member: TeamMember = {
      pokemonId: 25,
      slot: 0,
      name: "pikachu",
      sprite: null,
      types: ["electric"],
      level: 100,
      nature: "adamant",
      heldItem: "Life Orb",
      ability: "static",
      ivs: { ...DEFAULT_IVS },
      evs: {
        hp: 4,
        attack: 252,
        defense: 0,
        "special-attack": 0,
        "special-defense": 0,
        speed: 252,
      },
      moves: ["thunderbolt"],
    };
    const input = teamMemberToCalcInput(member, 100);
    expect(input.species).toBe("pikachu");
    expect(input.level).toBe(100);
    expect(input.nature).toBe("adamant");
    expect(input.item).toBe("Life Orb");
    expect(input.moves[0]).toBe("thunderbolt");
  });
});
