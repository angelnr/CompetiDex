import { describe, it, expect } from "vitest";
import {
  formatHeight,
  formatWeight,
  extractIdFromUrl,
  formatPokedexId,
  capitalize,
  computeStatTotal,
  computeStat,
  getFlavorText,
  getGenus,
  getDisplayName,
  getOfficialArtworkById,
  isMegaName,
  getMegaSuffix,
  getMegaFormLabel,
  getMegaVarieties,
  type MegaVarietyInfo,
} from "@/lib/pokemon-utils";
import type { PokemonSpecies } from "@/lib/pokeapi";

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

describe("computeStat", () => {
  it("calcula HP correctamente", () => {
    // Pikachu lv 100, IV 31, EV 0, neutral nature
    const stat = computeStat({
      base: 35,
      iv: 31,
      ev: 0,
      level: 100,
      isHp: true,
      natureMultiplier: 1,
    });
    // HP: floor((2*35 + 31 + 0) * 100 / 100) + 100 + 10 = floor(101) + 110 = 211
    expect(stat).toBe(211);
  });

  it("calcula stat no-HP con naturaleza neutra", () => {
    // Pikachu lv 100, attack 55, IV 31, EV 0, neutral
    const stat = computeStat({
      base: 55,
      iv: 31,
      ev: 0,
      level: 100,
      isHp: false,
      natureMultiplier: 1,
    });
    // floor((2*55 + 31 + 0) * 100 / 100 + 5) * 1 = floor(141 + 5) = 146
    expect(stat).toBe(146);
  });

  it("aplica naturaleza que aumenta +10%", () => {
    // Pikachu lv 100, attack 55, IV 31, EV 252, nature +attack
    const stat = computeStat({
      base: 55,
      iv: 31,
      ev: 252,
      level: 100,
      isHp: false,
      natureMultiplier: 1.1,
    });
    // floor((110 + 31 + 63) * 1 + 5) * 1.1 = floor(209) * 1.1 = 229
    expect(stat).toBe(229);
  });

  it("aplica naturaleza que disminuye -10%", () => {
    const stat = computeStat({
      base: 55,
      iv: 31,
      ev: 0,
      level: 100,
      isHp: false,
      natureMultiplier: 0.9,
    });
    // floor((110 + 31 + 0) * 1 + 5) * 0.9 = floor(146) * 0.9 = 131
    expect(stat).toBe(131);
  });

  it("calcula a nivel 50", () => {
    // Pikachu lv 50, HP 35, IV 31, EV 0, neutral
    const stat = computeStat({
      base: 35,
      iv: 31,
      ev: 0,
      level: 50,
      isHp: true,
      natureMultiplier: 1,
    });
    // floor((70 + 31 + 0) * 0.5) + 50 + 10 = floor(50) + 60 = 110
    expect(stat).toBe(110);
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

describe("isMegaName", () => {
  it("detecta nombres mega", () => {
    expect(isMegaName("charizard-mega-x")).toBe(true);
    expect(isMegaName("charizard-mega-y")).toBe(true);
    expect(isMegaName("venusaur-mega")).toBe(true);
    expect(isMegaName("rayquaza-mega")).toBe(true);
    expect(isMegaName("mewtwo-mega-x")).toBe(true);
  });

  it("rechaza nombres no-mega", () => {
    expect(isMegaName("charizard")).toBe(false);
    expect(isMegaName("pikachu")).toBe(false);
    expect(isMegaName("gengar-gmax")).toBe(false);
    expect(isMegaName("alola-raichu")).toBe(false);
  });
});

describe("getMegaSuffix", () => {
  it("extrae el sufijo correcto", () => {
    expect(getMegaSuffix("charizard-mega-x")).toBe("mega-x");
    expect(getMegaSuffix("charizard-mega-y")).toBe("mega-y");
    expect(getMegaSuffix("venusaur-mega")).toBe("mega");
  });

  it("null para nombres sin mega", () => {
    expect(getMegaSuffix("charizard")).toBeNull();
  });
});

describe("getMegaFormLabel", () => {
  it("genera etiqueta legible", () => {
    expect(getMegaFormLabel("charizard-mega-x")).toBe("Mega Charizard X");
    expect(getMegaFormLabel("charizard-mega-y")).toBe("Mega Charizard Y");
    expect(getMegaFormLabel("venusaur-mega")).toBe("Mega Venusaur");
    expect(getMegaFormLabel("mewtwo-mega-x")).toBe("Mega Mewtwo X");
    expect(getMegaFormLabel("rayquaza-mega")).toBe("Mega Rayquaza");
  });

  it("fallback a capitalize si no coincide", () => {
    expect(getMegaFormLabel("pikachu")).toBe("Pikachu");
  });
});

describe("getMegaVarieties", () => {
  const species: PokemonSpecies = {
    id: 6,
    name: "charizard",
    order: 6,
    gender_rate: 1,
    capture_rate: 45,
    base_happiness: 50,
    is_baby: false,
    is_legendary: false,
    is_mythical: false,
    hatch_counter: 20,
    color: { name: "red", url: "" },
    evolution_chain: { url: "" },
    evolves_from_species: { name: "charmeleon", url: "" },
    generation: { name: "generation-i", url: "" },
    names: [],
    genera: [],
    flavor_text_entries: [],
    habitat: null,
    varieties: [
      {
        is_default: true,
        pokemon: { name: "charizard", url: "https://pokeapi.co/api/v2/pokemon/6/" },
      },
      {
        is_default: false,
        pokemon: { name: "charizard-mega-x", url: "https://pokeapi.co/api/v2/pokemon/10034/" },
      },
      {
        is_default: false,
        pokemon: { name: "charizard-mega-y", url: "https://pokeapi.co/api/v2/pokemon/10035/" },
      },
    ],
  };

  it("extrae variedades mega de una especie", () => {
    const result = getMegaVarieties(species);
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("charizard-mega-x");
    expect(result[0]!.id).toBe(10034);
    expect(result[0]!.label).toBe("Mega Charizard X");
    expect(result[1]!.name).toBe("charizard-mega-y");
    expect(result[1]!.id).toBe(10035);
    expect(result[1]!.label).toBe("Mega Charizard Y");
  });

  it("retorna vacio si no hay variedades mega", () => {
    const noMega: PokemonSpecies = {
      ...species,
      name: "pikachu",
      varieties: [
        {
          is_default: true,
          pokemon: { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/" },
        },
      ],
    };
    expect(getMegaVarieties(noMega)).toHaveLength(0);
  });
});
