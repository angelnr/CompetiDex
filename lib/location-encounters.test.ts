import { describe, expect, it } from "vitest";

import {
  getLocationAreaEncounterRows,
  getLocationAreaVersions,
  groupLocationEncounters,
} from "@/lib/location-encounters";
import type { LocationArea, NamedAPIResource } from "@/lib/pokeapi";

function resource(name: string, url = `/${name}`): NamedAPIResource {
  return { name, url };
}

function area(): LocationArea {
  return {
    id: 1,
    name: "route-29-area",
    game_index: 1,
    names: [],
    location: resource("route-29"),
    pokemon_encounters: [
      {
        pokemon: resource("hoothoot", "https://pokeapi.co/api/v2/pokemon/163/"),
        version_details: [
          {
            version: resource("gold"),
            max_chance: 30,
            encounter_details: [
              {
                chance: 30,
                min_level: 2,
                max_level: 2,
                method: resource("walk"),
                condition_values: [resource("time-night")],
              },
              {
                chance: 30,
                min_level: 2,
                max_level: 2,
                method: resource("walk"),
                condition_values: [resource("time-night")],
              },
            ],
          },
          {
            version: resource("crystal"),
            max_chance: 20,
            encounter_details: [
              {
                chance: 20,
                min_level: 3,
                max_level: 3,
                method: resource("walk"),
                condition_values: [resource("time-morning")],
              },
            ],
          },
        ],
      },
      {
        pokemon: resource("rattata", "https://pokeapi.co/api/v2/pokemon/19/"),
        version_details: [
          {
            version: resource("gold"),
            max_chance: 10,
            encounter_details: [
              {
                chance: 10,
                min_level: 2,
                max_level: 3,
                method: resource("walk"),
                condition_values: [],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("getLocationAreaVersions", () => {
  it("devuelve las versiones con encuentros en orden cronológico", () => {
    expect(getLocationAreaVersions(area())).toEqual(["gold", "crystal"]);
  });
});

describe("getLocationAreaEncounterRows", () => {
  it("filtra por juego, deduplica y conserva las condiciones horarias", () => {
    const rows = getLocationAreaEncounterRows(area(), "gold");

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.pokemonName)).toEqual(["rattata", "hoothoot"]);
    expect(rows.find((row) => row.pokemonName === "hoothoot")!.time).toEqual(["time-night"]);
  });

  it("no mezcla encuentros de otra versión", () => {
    const rows = getLocationAreaEncounterRows(area(), "crystal");

    expect(rows).toHaveLength(1);
    expect(rows[0]!.pokemonName).toBe("hoothoot");
    expect(rows[0]!.minLevel).toBe(3);
  });

  it("devuelve vacío para una versión sin datos", () => {
    expect(getLocationAreaEncounterRows(area(), "silver")).toEqual([]);
  });
});

describe("groupLocationEncounters", () => {
  it("agrupa por especie métodos, horarios, niveles y probabilidades", () => {
    const grouped = groupLocationEncounters([
      {
        pokemonId: 16,
        pokemonName: "pidgey",
        method: "walk",
        minLevel: 2,
        maxLevel: 2,
        chance: 30,
        time: [],
      },
      {
        pokemonId: 16,
        pokemonName: "pidgey",
        method: "headbutt",
        minLevel: 2,
        maxLevel: 3,
        chance: 20,
        time: ["time-morning", "time-night"],
      },
      {
        pokemonId: 19,
        pokemonName: "rattata",
        method: "walk",
        minLevel: 2,
        maxLevel: 3,
        chance: 10,
        time: [],
      },
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]).toEqual({
      pokemonId: 16,
      pokemonName: "pidgey",
      methods: ["walk", "headbutt"],
      hasAnyTime: true,
      times: ["time-morning", "time-night"],
      minLevel: 2,
      maxLevel: 3,
      chances: [30, 20],
    });
  });
});
