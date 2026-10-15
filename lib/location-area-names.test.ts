import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pokeapi", () => ({
  getLocationArea: vi.fn(async (id: string | number) => {
    const fixtures: Record<string, unknown> = {
      // Hoenn: el área solo trae en/fr/de; la localización padre tiene es/ja.
      "350": {
        id: 350,
        name: "petalburg-city-area",
        game_index: 1,
        location: { name: "petalburg-city", url: "https://pokeapi.co/api/v2/location/429/" },
        names: [
          { name: "Petalburg City", language: { name: "en" } },
          { name: "Clémenti-Ville", language: { name: "fr" } },
          { name: "Blütenburg City", language: { name: "de" } },
        ],
      },
      // Unova: la localización solo tiene japonés como ja-hrkt.
      "623": {
        id: 623,
        name: "unova-route-1-area",
        game_index: 2,
        location: { name: "unova-route-1", url: "https://pokeapi.co/api/v2/location/600/" },
        names: [
          { name: "Road 1", language: { name: "en" } },
          { name: "Route 1", language: { name: "fr" } },
          { name: "Route 1", language: { name: "de" } },
        ],
      },
      // Galar: ni el área ni la localización traen es/ja -> diccionario offline.
      "700": {
        id: 700,
        name: "stony-wilderness-area",
        game_index: 3,
        location: { name: "stony-wilderness", url: "https://pokeapi.co/api/v2/location/800/" },
        names: [
          { name: "Stony Wilderness", language: { name: "en" } },
          { name: "Plaine Rocheuse", language: { name: "fr" } },
          { name: "Steinbruch", language: { name: "de" } },
        ],
      },
    };
    const fixture = fixtures[String(id)];
    if (!fixture) throw new Error("not found");
    return fixture;
  }),
  getLocation: vi.fn(async (idOrName: string | number) => {
    const fixtures: Record<string, unknown> = {
      "petalburg-city": {
        id: 429,
        name: "petalburg-city",
        region: null,
        areas: [],
        names: [
          { name: "Petalburg City", language: { name: "en" } },
          { name: "Clémenti-Ville", language: { name: "fr" } },
          { name: "Blütenburg City", language: { name: "de" } },
          { name: "Ciudad Petalia", language: { name: "es" } },
          { name: "トウカシティ", language: { name: "ja" } },
          { name: "トウカシティ", language: { name: "ja-hrkt" } },
          { name: "Petalipoli", language: { name: "it" } },
        ],
      },
      "unova-route-1": {
        id: 600,
        name: "unova-route-1",
        region: null,
        areas: [],
        names: [
          { name: "Unova Route 1", language: { name: "en" } },
          { name: "１ばんどうろ", language: { name: "ja-hrkt" } },
        ],
      },
      "stony-wilderness": {
        id: 800,
        name: "stony-wilderness",
        region: null,
        areas: [],
        names: [
          { name: "Stony Wilderness", language: { name: "en" } },
          { name: "Plaine Rocheuse", language: { name: "fr" } },
          { name: "Steinbruch", language: { name: "de" } },
        ],
      },
    };
    const fixture = fixtures[String(idOrName)];
    if (!fixture) throw new Error("not found");
    return fixture;
  }),
}));

vi.mock("@/lib/location-names-offline", () => ({
  LOCATION_NAMES_OFFLINE: {
    "stony-wilderness": { es: "Llanura Pétrea", ja: "ストーンズげんや" },
  },
}));

import { getLocalizedLocationNames } from "@/lib/location-area-names";

describe("getLocalizedLocationNames", () => {
  it("combina el área (en/fr/de) con la localización padre (es/ja)", async () => {
    const dict = await getLocalizedLocationNames([350]);
    expect(dict["350"]).toEqual({
      en: "Petalburg City",
      fr: "Clémenti-Ville",
      de: "Blütenburg City",
      es: "Ciudad Petalia",
      ja: "トウカシティ",
    });
  });

  it("usa ja-hrkt como respaldo del japonés", async () => {
    const dict = await getLocalizedLocationNames([623]);
    expect(dict["623"]).toEqual({ en: "Road 1", fr: "Route 1", de: "Route 1", ja: "１ばんどうろ" });
  });

  it("rellena es/ja desde el diccionario offline cuando PokeAPI no los tiene", async () => {
    const dict = await getLocalizedLocationNames([700]);
    expect(dict["700"]).toEqual({
      en: "Stony Wilderness",
      fr: "Plaine Rocheuse",
      de: "Steinbruch",
      es: "Llanura Pétrea",
      ja: "ストーンズげんや",
    });
  });

  it("omite las áreas que fallan sin romper el resto", async () => {
    const dict = await getLocalizedLocationNames([350, 999]);
    expect(dict["999"]).toEqual({});
  });

  it("deduplica identificadores", async () => {
    const dict = await getLocalizedLocationNames([350, 350, "350"]);
    expect(Object.keys(dict)).toEqual(["350"]);
  });
});
