import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pokeapi", () => ({
  getLocationArea: vi.fn(async (id: string | number) => {
    if (String(id) !== "1") throw new Error("not found");
    return {
      id: 1,
      name: "canalave-city-area",
      game_index: 1,
      location: { name: "canalave-city", url: "https://pokeapi.co/api/v2/location/1/" },
      names: [
        { name: "Canalave City", language: { name: "en", url: "https://l/9/" } },
        { name: "Joliberges", language: { name: "fr", url: "https://l/5/" } },
        { name: "Fleetburg", language: { name: "de", url: "https://l/6/" } },
        { name: "Ciudad Canal", language: { name: "it", url: "https://l/8/" } },
      ],
    };
  }),
}));

import { getLocalizedLocationNames } from "@/lib/location-area-names";

describe("getLocalizedLocationNames", () => {
  it("devuelve en/fr/de claveados por id e ignora idiomas no soportados", async () => {
    const dict = await getLocalizedLocationNames([1]);
    expect(dict).toEqual({
      "1": { en: "Canalave City", fr: "Joliberges", de: "Fleetburg" },
    });
  });

  it("omite las áreas que fallan sin romper el resto", async () => {
    const dict = await getLocalizedLocationNames([1, 999]);
    expect(dict["1"]).toEqual({ en: "Canalave City", fr: "Joliberges", de: "Fleetburg" });
    expect(dict["999"]).toEqual({});
  });

  it("deduplica identificadores", async () => {
    const dict = await getLocalizedLocationNames([1, 1, "1"]);
    expect(Object.keys(dict)).toEqual(["1"]);
  });
});
