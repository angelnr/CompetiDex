import type { CalcFieldInput } from "./types";

/**
 * Movimientos con potencia/tipo dinámicos según clima o terreno.
 * `@smogon/calc` no los implementa (Weather Ball queda en 50 Normal), así que
 * se calculan aquí y se inyectan como `overrides` en el motor.
 */

export type WeatherMoveType =
  "Fire" | "Water" | "Rock" | "Ice" | "Electric" | "Grass" | "Psychic" | "Fairy";

export interface MoveOverride {
  basePower: number;
  type: WeatherMoveType;
}

const WEATHER_TYPES: Record<string, WeatherMoveType> = {
  sun: "Fire",
  rain: "Water",
  sand: "Rock",
  snow: "Ice",
};

const TERRAIN_TYPES: Record<string, WeatherMoveType> = {
  electric: "Electric",
  grassy: "Grass",
  psychic: "Psychic",
  misty: "Fairy",
};

/** Weather Ball: 100 de potencia y tipo según clima; null si no hay clima. */
export function weatherBallOverride(field: CalcFieldInput): MoveOverride | null {
  const type = WEATHER_TYPES[field.weather];
  return type ? { basePower: 100, type } : null;
}

/** Terrain Pulse: 100 de potencia y tipo según terreno; null si no hay. */
export function terrainPulseOverride(field: CalcFieldInput): MoveOverride | null {
  const type = TERRAIN_TYPES[field.terrain];
  return type ? { basePower: 100, type } : null;
}

/** Override para un movimiento por su slug compacto de Showdown. */
export function moveOverride(moveGenslug: string, field: CalcFieldInput): MoveOverride | null {
  if (moveGenslug === "weatherball") return weatherBallOverride(field);
  if (moveGenslug === "terrainpulse") return terrainPulseOverride(field);
  return null;
}
