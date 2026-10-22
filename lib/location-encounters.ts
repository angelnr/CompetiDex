/**
 * Encuentros de un área de localización (`location-area`), filtrados por juego.
 *
 * PokeAPI devuelve en `/location-area/{id}` todos los Pokémon del área con sus
 * version-details. La misma zona puede tener tablas distintas en cada juego
 * (p. ej. Blanco y Blanco 2), por eso el filtro por versión es obligatorio.
 */

import type { LocationArea } from "@/lib/pokeapi";
import { extractIdFromUrl } from "@/lib/pokemon-utils";
import { isExcludedVersion, versionOrder } from "@/lib/version-names";

export interface LocationEncounterRow {
  pokemonId: number;
  pokemonName: string;
  method: string;
  minLevel: number;
  maxLevel: number;
  chance: number;
  /** Condiciones horarias (`time-day`, `time-night`...). */
  time: string[];
}

/** Una fila agregada: todos los encuentros de una misma especie. */
export interface LocationSpeciesRow {
  pokemonId: number;
  pokemonName: string;
  methods: string[];
  /** `true` si algún encuentro no tiene restricción horaria. */
  hasAnyTime: boolean;
  times: string[];
  minLevel: number;
  maxLevel: number;
  chances: number[];
}

const METHOD_ORDER = [
  "walk",
  "surf",
  "old-rod",
  "good-rod",
  "super-rod",
  "rock-smash",
  "headbutt",
  "overworld",
  "max-raid",
  "gift",
];

const TIME_ORDER = ["time-morning", "time-day", "time-evening", "time-night"];

function methodRank(name: string): number {
  const index = METHOD_ORDER.indexOf(name);
  return index === -1 ? METHOD_ORDER.length : index;
}

function timeRank(name: string): number {
  const index = TIME_ORDER.indexOf(name);
  return index === -1 ? TIME_ORDER.length : index;
}

/** Versiones con encuentros en el área, en orden cronológico. */
export function getLocationAreaVersions(area: LocationArea): string[] {
  const versions = new Set<string>();
  for (const encounter of area.pokemon_encounters ?? []) {
    for (const detail of encounter.version_details) {
      if (!isExcludedVersion(detail.version.name)) versions.add(detail.version.name);
    }
  }
  return [...versions].sort(versionOrder);
}

/**
 * Filas de encuentro para un juego concreto. Elimina duplicados exactos que
 * PokeAPI repite en algunas tablas (misma especie, método, niveles y hora).
 */
export function getLocationAreaEncounterRows(
  area: LocationArea,
  version: string,
): LocationEncounterRow[] {
  const rows: LocationEncounterRow[] = [];
  const seen = new Set<string>();

  for (const encounter of area.pokemon_encounters ?? []) {
    const pokemonId = extractIdFromUrl(encounter.pokemon.url);

    for (const versionDetail of encounter.version_details) {
      if (versionDetail.version.name !== version) continue;

      for (const detail of versionDetail.encounter_details) {
        const time = detail.condition_values
          .map((condition) => condition.name)
          .filter((name) => name.startsWith("time-"));
        const key = [
          pokemonId,
          detail.method.name,
          detail.min_level,
          detail.max_level,
          detail.chance,
          time.join(","),
        ].join("|");
        if (seen.has(key)) continue;
        seen.add(key);

        rows.push({
          pokemonId,
          pokemonName: encounter.pokemon.name,
          method: detail.method.name,
          minLevel: detail.min_level,
          maxLevel: detail.max_level,
          chance: detail.chance,
          time,
        });
      }
    }
  }

  return rows.sort(
    (a, b) =>
      a.pokemonId - b.pokemonId || a.method.localeCompare(b.method) || a.minLevel - b.minLevel,
  );
}

/**
 * Agrupa las filas por especie: una sola fila con métodos, horarios, rango de
 * niveles y probabilidades únicas. Es la vista compacta por defecto.
 */
export function groupLocationEncounters(rows: LocationEncounterRow[]): LocationSpeciesRow[] {
  const bySpecies = new Map<
    number,
    {
      pokemonId: number;
      pokemonName: string;
      methods: Set<string>;
      hasAnyTime: boolean;
      times: Set<string>;
      minLevel: number;
      maxLevel: number;
      chances: Set<number>;
    }
  >();

  for (const row of rows) {
    let entry = bySpecies.get(row.pokemonId);
    if (!entry) {
      entry = {
        pokemonId: row.pokemonId,
        pokemonName: row.pokemonName,
        methods: new Set<string>(),
        hasAnyTime: false,
        times: new Set<string>(),
        minLevel: row.minLevel,
        maxLevel: row.maxLevel,
        chances: new Set<number>(),
      };
      bySpecies.set(row.pokemonId, entry);
    }

    entry.methods.add(row.method);
    entry.chances.add(row.chance);
    entry.minLevel = Math.min(entry.minLevel, row.minLevel);
    entry.maxLevel = Math.max(entry.maxLevel, row.maxLevel);

    if (row.time.length === 0) {
      entry.hasAnyTime = true;
    } else {
      for (const time of row.time) entry.times.add(time);
    }
  }

  return [...bySpecies.values()]
    .map((entry) => ({
      pokemonId: entry.pokemonId,
      pokemonName: entry.pokemonName,
      methods: [...entry.methods].sort((a, b) => methodRank(a) - methodRank(b)),
      hasAnyTime: entry.hasAnyTime,
      times: [...entry.times].sort((a, b) => timeRank(a) - timeRank(b)),
      minLevel: entry.minLevel,
      maxLevel: entry.maxLevel,
      chances: [...entry.chances].sort((a, b) => b - a),
    }))
    .sort((a, b) => a.pokemonId - b.pokemonId);
}
