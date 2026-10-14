import type {
  CalcFieldInput,
  CalcPokemonInput,
  CalcResult,
  CalcStats,
  TerrainKey,
  WeatherKey,
} from "./types";
import { fullBoosts, fullSpread, toGenslug, toSpeciesGenslug, titleCase } from "./convert";
import { DEFAULT_IVS, DEFAULT_EVS } from "@/lib/team";
import { EMPTY_BOOSTS } from "./stages";
import { moveOverride } from "./weather";

/**
 * Motor de cálculo basado en `@smogon/calc` (Gen 9). Se importa dinámicamente
 * para no cargar sus datos (~MB) salvo cuando se usa la calculadora.
 */

type CalcModule = typeof import("@smogon/calc");

let calcPromise: Promise<CalcModule> | null = null;

function loadCalc(): Promise<CalcModule> {
  calcPromise ??= import("@smogon/calc");
  return calcPromise;
}

const WEATHER_MAP: Record<
  Exclude<WeatherKey, "none">,
  "Sun" | "Rain" | "Sand" | "Snow" | "Hail"
> = {
  sun: "Sun",
  rain: "Rain",
  sand: "Sand",
  snow: "Snow",
};

const TERRAIN_MAP: Record<
  Exclude<TerrainKey, "none">,
  "Electric" | "Grassy" | "Psychic" | "Misty"
> = {
  electric: "Electric",
  grassy: "Grassy",
  psychic: "Psychic",
  misty: "Misty",
};

function buildField(calc: CalcModule, field: CalcFieldInput) {
  type FieldOptions = NonNullable<ConstructorParameters<typeof calc.Field>[0]>;
  const weather = field.weather === "none" ? undefined : WEATHER_MAP[field.weather];
  const terrain = field.terrain === "none" ? undefined : TERRAIN_MAP[field.terrain];

  const options: FieldOptions = {
    gameType: "Singles",
    defenderSide: {
      isReflect: field.isReflect,
      isLightScreen: field.isLightScreen,
      isAuroraVeil: field.isAuroraVeil,
      isSR: field.isSR,
      spikes: field.spikes,
    },
  };
  if (weather) options.weather = weather;
  if (terrain) options.terrain = terrain;
  return new calc.Field(options);
}

function buildPokemon(calc: CalcModule, input: CalcPokemonInput, curHP?: number) {
  type PokemonOptions = NonNullable<ConstructorParameters<typeof calc.Pokemon>[2]>;
  const gen = calc.Generations.get(9);
  // Nombre canónico del motor: las formas -male/-female, mega, regionales, etc.
  // no coinciden con el slug de PokeAPI. `desc()` usa este nombre tal cual.
  const species = input.species
    ? gen.species.get(toSpeciesGenslug(input.species) as never)
    : undefined;
  const displayName = species?.name ?? (input.species ? titleCase(input.species) : "");

  const options: PokemonOptions = {
    level: input.level,
    nature: input.nature ? titleCase(input.nature) : "Hardy",
    ivs: fullSpread(input.ivs ?? DEFAULT_IVS),
    evs: fullSpread(input.evs ?? DEFAULT_EVS),
    boosts: fullBoosts(input.boosts ?? EMPTY_BOOSTS),
  };
  if (input.ability) options.ability = toGenslug(input.ability);
  if (input.item) options.item = toGenslug(input.item);
  if (curHP !== undefined) options.curHP = curHP;

  return new calc.Pokemon(gen, displayName, options);
}

function moveExists(calc: CalcModule, moveGenslug: string): boolean {
  const lookup = calc.Generations.get(9).moves.get.bind(calc.Generations.get(9).moves);
  return lookup(moveGenslug as never) !== undefined;
}

/** Stats finales (base + IV + EV + naturaleza al nivel) de ambos lados. */
export async function computeCalcStats(
  attacker: CalcPokemonInput,
  defender: CalcPokemonInput,
): Promise<CalcStats> {
  const calc = await loadCalc();
  const a = buildPokemon(calc, attacker);
  const d = buildPokemon(calc, defender);
  return {
    attacker: {
      hp: a.stats.hp,
      atk: a.stats.atk,
      def: a.stats.def,
      spa: a.stats.spa,
      spd: a.stats.spd,
      spe: a.stats.spe,
    },
    defender: {
      hp: d.stats.hp,
      atk: d.stats.atk,
      def: d.stats.def,
      spa: d.stats.spa,
      spd: d.stats.spd,
      spe: d.stats.spe,
    },
  };
}

function fallbackDesc(move: string, pctMin: number, pctMax: number): string {
  return `${move}: ${Math.round(pctMin)} - ${Math.round(pctMax)}%`;
}

/**
 * Calcula el matchup de todos los movimientos del atacante contra el
 * defensor. Cada resultado usa `result.desc()` (notación Smogon canónica) y,
 * si el motor lanza (ej. daño 0 por inmunidad), degrada a un resumen mínimo.
 */
export async function computeMatchups(
  attacker: CalcPokemonInput,
  defender: CalcPokemonInput,
  field: CalcFieldInput,
): Promise<CalcResult[]> {
  const calc = await loadCalc();

  const gen = calc.Generations.get(9);
  const def = buildPokemon(calc, defender);
  const defMaxHp = def.maxHP();
  const curHp = Math.max(1, Math.round((defMaxHp * field.defenderHpPct) / 100));

  const atk = buildPokemon(calc, attacker);
  const fieldObj = buildField(calc, field);

  const results: CalcResult[] = [];
  for (const moveSlug of attacker.moves) {
    if (!moveSlug) continue;
    const moveGenslug = toGenslug(moveSlug);

    if (!moveExists(calc, moveGenslug)) {
      results.push({
        move: moveSlug,
        desc: `${titleCase(moveSlug)}: no disponible en Gen 9`,
        damageMin: 0,
        damageMax: 0,
        pctMin: 0,
        pctMax: 0,
        koText: null,
      });
      continue;
    }

    let result: ReturnType<typeof calc.calculate>;
    try {
      // El HP actual del defensor se fija por movimiento para que el KO text
      // de `desc()` refleje el HP ajustado del defensor.
      const defForMove = buildPokemon(calc, defender, Math.min(curHp, defMaxHp));
      const override = moveOverride(moveGenslug, field);
      const move = new calc.Move(gen, moveGenslug as never, {
        isCrit: field.critical,
        ...(override
          ? {
              overrides: {
                ...(override.basePower !== undefined ? { basePower: override.basePower } : {}),
                type: override.type,
              },
            }
          : {}),
      });
      result = calc.calculate(gen, atk, defForMove, move, fieldObj);
    } catch {
      results.push({
        move: moveSlug,
        desc: `${titleCase(moveSlug)}: no aplicable`,
        damageMin: 0,
        damageMax: 0,
        pctMin: 0,
        pctMax: 0,
        koText: null,
      });
      continue;
    }

    const [damageMin, damageMax] = result.range();
    const pctMin = (damageMin / defMaxHp) * 100;
    const pctMax = (damageMax / defMaxHp) * 100;

    let desc: string;
    try {
      desc = result.desc();
    } catch {
      desc = fallbackDesc(titleCase(moveSlug), pctMin, pctMax);
    }

    results.push({
      move: moveSlug,
      desc,
      damageMin,
      damageMax,
      pctMin,
      pctMax,
      koText: null,
    });
  }

  return results;
}
