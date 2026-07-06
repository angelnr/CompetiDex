import { describe, it, expect } from "vitest";
import {
  formatHeight,
  formatWeight,
  extractIdFromUrl,
  formatPokedexId,
  capitalize,
  computeStatTotal,
  getFlavorText,
  getGenus,
  getDisplayName,
  getOfficialArtworkById,
} from "@/lib/pokemon-utils";

describe("formatHeight", () => {
  it("convierte decimetros a metros", () => {
    expect(formatHeight(4)).toBe("0.4 m");
    expect(formatHeight(10)).toBe("1 m");
    expect(formatHeight(17)).toBe("1.7 m");
  });
});

describe("formatWeight", () => {
  it("convierte hectogramos a kilogramos", () => {
    expect(formatWeight(60)).toBe("6.0 kg");
    expect(formatWeight(1000)).toBe("100.0 kg");
  });
});

describe("extractIdFromUrl", () => {
  it("extrae id de URL de PokeAPI", () => {
    expect(extractIdFromUrl("https://pokeapi.co/api/v2/pokemon/25/")).toBe(25);
    expect(extractIdFromUrl("https://pokeapi.co/api/v2/pokemon-species/1/")).toBe(1);
  });

  it("lanza si la URL no tiene id", () => {
    expect(() => extractIdFromUrl("https://pokeapi.co/api/v2/pokemon/")).toThrow();
  });
});

describe("formatPokedexId", () => {
  it("rellena con ceros a 4 digitos", () => {
    expect(formatPokedexId(1)).toBe("#0001");
    expect(formatPokedexId(25)).toBe("#0025");
    expect(formatPokedexId(1025)).toBe("#1025");
  });
});

describe("capitalize", () => {
  it("capitaliza la primera letra", () => {
    expect(capitalize("pikachu")).toBe("Pikachu");
    expect(capitalize("")).toBe("");
  });
});

describe("computeStatTotal", () => {
  it("suma los base_stats", () => {
    const stats = [
      { base_stat: 35, effort: 0, stat: { name: "hp", url: "" } },
      { base_stat: 55, effort: 0, stat: { name: "attack", url: "" } },
      { base_stat: 40, effort: 0, stat: { name: "defense", url: "" } },
    ];
    expect(computeStatTotal(stats)).toBe(130);
  });
});

describe("getFlavorText", () => {
  it("prefiere español", () => {
    const entries = [
      { flavor_text: "When several", language: { name: "en" } },
      { flavor_text: "Cuando varios", language: { name: "es" } },
    ];
    expect(getFlavorText(entries)).toBe("Cuando varios");
  });

  it("fallback a inglés", () => {
    const entries = [{ flavor_text: "When several of these", language: { name: "en" } }];
    expect(getFlavorText(entries)).toBe("When several of these");
  });

  it("limpia saltos de linea y columnas", () => {
    const entries = [{ flavor_text: "Line1\fLine2\nLine3", language: { name: "en" } }];
    expect(getFlavorText(entries)).toBe("Line1 Line2 Line3");
  });

  it("null si no hay entradas", () => {
    expect(getFlavorText([])).toBeNull();
  });
});

describe("getGenus", () => {
  it("prefiere español", () => {
    const genera = [
      { genus: "Mouse", language: { name: "en" } },
      { genus: "Ratón", language: { name: "es" } },
    ];
    expect(getGenus(genera)).toBe("Ratón");
  });
});

describe("getDisplayName", () => {
  it("prefiere español, fallback ingles, fallback capitalizado", () => {
    expect(getDisplayName([{ name: "Pikachu", language: { name: "es" } }], "pikachu")).toBe(
      "Pikachu",
    );
    expect(getDisplayName([{ name: "Pikachu", language: { name: "en" } }], "pikachu")).toBe(
      "Pikachu",
    );
    expect(getDisplayName([], "pikachu")).toBe("Pikachu");
  });
});

describe("getOfficialArtworkById", () => {
  it("construye URL determinista", () => {
    const url = getOfficialArtworkById(25);
    expect(url).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    );
    expect(url).toContain("official-artwork");
  });
});
