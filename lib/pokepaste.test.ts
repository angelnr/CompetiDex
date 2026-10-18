import { describe, it, expect } from "vitest";
import {
  buildMoveLookup,
  buildSpeciesLookup,
  lookupSpecies,
  moveLookupKey,
  normalizeToken,
  parsePokepaste,
  teamToPokepaste,
  slugToTitle,
} from "@/lib/pokepaste";
import type { Team } from "@/lib/team";

const fullTeam: Team = {
  id: "test-1",
  name: "My Competitive Team",
  members: [
    {
      pokemonId: 6,
      name: "charizard",
      slot: 0,
      sprite: null,
      types: ["fire", "flying"],
      level: 100,
      heldItem: "life-orb",
      ability: "blaze",
      nature: "timid",
      ivs: {
        hp: 31,
        attack: 0,
        defense: 31,
        "special-attack": 31,
        "special-defense": 31,
        speed: 31,
      },
      evs: {
        hp: 0,
        attack: 0,
        defense: 0,
        "special-attack": 252,
        "special-defense": 0,
        speed: 252,
      },
      moves: ["fire-blast", "solar-beam", "focus-blast", "air-slash"],
    },
    {
      pokemonId: 448,
      name: "lucario",
      slot: 1,
      sprite: null,
      types: ["fighting", "steel"],
      level: 50,
      heldItem: "life-orb",
      ability: "justified",
      nature: "jolly",
      ivs: {
        hp: 30,
        attack: 31,
        defense: 30,
        "special-attack": 0,
        "special-defense": 30,
        speed: 31,
      },
      evs: {
        hp: 6,
        attack: 252,
        defense: 0,
        "special-attack": 0,
        "special-defense": 6,
        speed: 246,
      },
      moves: ["close-combat", "extreme-speed", "swords-dance", "bullet-punch"],
    },
  ],
  createdAt: 0,
  updatedAt: 0,
};

const minimalTeam: Team = {
  id: "test-2",
  name: "Minimal",
  members: [
    {
      pokemonId: 25,
      name: "pikachu",
      slot: 0,
      sprite: null,
      types: ["electric"],
    },
  ],
  createdAt: 0,
  updatedAt: 0,
};

const emptyNameTeam: Team = {
  id: "test-3",
  name: "",
  members: [],
  createdAt: 0,
  updatedAt: 0,
};

describe("slugToTitle", () => {
  it("convierte guiones a espacios y capitaliza", () => {
    expect(slugToTitle("close-combat")).toBe("Close Combat");
    expect(slugToTitle("thunder-bolt")).toBe("Thunder Bolt");
    expect(slugToTitle("fire-blast")).toBe("Fire Blast");
    expect(slugToTitle("charizard")).toBe("Charizard");
  });
});

describe("teamToPokepaste", () => {
  it("serializa equipo completo correctamente", () => {
    const output = teamToPokepaste(fullTeam);
    const expected = [
      "Charizard @ Life Orb",
      "Ability: Blaze",
      "Timid Nature",
      "EVs: 252 SpA / 252 Spe",
      "IVs: 0 Atk",
      "- Fire Blast",
      "- Solar Beam",
      "- Focus Blast",
      "- Air Slash",
      "",
      "Lucario @ Life Orb",
      "Ability: Justified",
      "Level: 50",
      "Jolly Nature",
      "EVs: 6 HP / 252 Atk / 6 SpD / 246 Spe",
      "IVs: 30 HP / 30 Def / 0 SpA / 30 SpD",
      "- Close Combat",
      "- Extreme Speed",
      "- Swords Dance",
      "- Bullet Punch",
    ].join("\n");
    expect(output).toBe(expected);
  });

  it("serializa miembro minimalista sin campos extra", () => {
    const output = teamToPokepaste(minimalTeam);
    expect(output).toBe("Pikachu");
  });

  it("equipo vacío produce cadena vacía", () => {
    const output = teamToPokepaste(emptyNameTeam);
    expect(output).toBe("");
  });

  it("exporta formas de género con identificador de Showdown", () => {
    const team: Team = {
      id: "test-5",
      name: "",
      members: [
        {
          pokemonId: 902,
          name: "basculegion-male",
          slot: 0,
          sprite: null,
          types: ["water"],
        },
        {
          pokemonId: 10248,
          name: "basculegion-female",
          slot: 1,
          sprite: null,
          types: ["water"],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    const output = teamToPokepaste(team);
    const lines = output.split("\n");
    expect(lines[0]).toBe("Basculegion (M)");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("Basculegion-F (F)");
  });

  it("exporta siempre en inglés aunque la UI esté localizada", () => {
    // Los valores guardados son slugs en inglés; el export no localiza.
    const team: Team = {
      id: "test-6",
      name: "",
      members: [
        {
          pokemonId: 6,
          name: "charizard",
          slot: 0,
          sprite: null,
          types: ["fire", "flying"],
          ability: "adaptability",
          heldItem: "Leftovers",
          moves: ["flame-burst"],
          ivs: {
            hp: 31,
            attack: 31,
            defense: 31,
            "special-attack": 31,
            "special-defense": 31,
            speed: 31,
          },
          evs: {
            hp: 0,
            attack: 0,
            defense: 0,
            "special-attack": 252,
            "special-defense": 0,
            speed: 252,
          },
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    const output = teamToPokepaste(team).split("\n");
    expect(output[0]).toBe("Charizard @ Leftovers");
    expect(output[1]).toBe("Ability: Adaptability");
    expect(output).toContain("- Flame Burst");
  });

  it("exporta Slowking-Galar con guion y mayúsculas", () => {
    const team: Team = {
      id: "test-7",
      name: "",
      members: [
        {
          pokemonId: 10172,
          name: "slowking-galar",
          slot: 0,
          sprite: null,
          types: ["poison", "psychic"],
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    expect(teamToPokepaste(team).split("\n")[0]).toBe("Slowking-Galar");
  });

  it("preserva el nombre canónico de objetos con guion o variante", () => {
    const team: Team = {
      id: "test-4",
      name: "",
      members: [
        {
          pokemonId: 6,
          name: "charizard",
          slot: 0,
          sprite: null,
          types: ["fire"],
          heldItem: "Never-Melt Ice",
        },
        {
          pokemonId: 6,
          name: "charizard",
          slot: 1,
          sprite: null,
          types: ["fire"],
          heldItem: "Charizardite X",
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    const output = teamToPokepaste(team);
    expect(output).toContain("Charizard @ Never-Melt Ice");
    expect(output).toContain("Charizard @ Charizardite X");
  });
});

describe("parsePokepaste", () => {
  it("parsea un set completo", () => {
    const text = [
      "Charizard @ Life Orb",
      "Ability: Blaze",
      "Timid Nature",
      "EVs: 252 SpA / 252 Spe",
      "IVs: 0 Atk",
      "- Fire Blast",
      "- Solar Beam",
    ].join("\n");

    const sets = parsePokepaste(text);

    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({
      speciesToken: "Charizard",
      nickname: null,
      heldItemName: "Life Orb",
      abilitySlug: "blaze",
      natureName: "timid",
      level: null,
      moveNames: ["Fire Blast", "Solar Beam"],
    });
    expect(sets[0]!.evs).toEqual({ "special-attack": 252, speed: 252 });
    expect(sets[0]!.ivs).toEqual({ attack: 0 });
  });

  it("parsea nickname entre paréntesis", () => {
    const sets = parsePokepaste("Charly (Charizard) @ Life Orb\n- Fire Blast");

    expect(sets[0]!.nickname).toBe("Charly");
    expect(sets[0]!.speciesToken).toBe("Charizard");
    expect(sets[0]!.heldItemName).toBe("Life Orb");
  });

  it("interpreta (F)/(M) como marcador de género, no como nickname", () => {
    const sets = parsePokepaste("Basculegion-F (F) @ Choice Specs\n\nBasculegion (M)");

    expect(sets).toHaveLength(2);
    expect(sets[0]).toMatchObject({ speciesToken: "Basculegion-F", genderMarker: "F" });
    expect(sets[1]).toMatchObject({ speciesToken: "Basculegion", genderMarker: "M" });
  });

  it("separa sets por línea en blanco", () => {
    const text = [
      "Pikachu @ Light Ball",
      "Level: 50",
      "",
      "Charizard",
      "- Fly",
    ].join("\n");

    const sets = parsePokepaste(text);

    expect(sets.map((s) => s.speciesToken)).toEqual(["Pikachu", "Charizard"]);
    expect(sets[0]!.level).toBe(50);
    expect(sets[0]!.heldItemName).toBe("Light Ball");
  });

  it("trata una línea suelta sin datos como un set (la resolución avisa)", () => {
    const text = ["Mi equipo", "", "Pikachu", "- Thunderbolt"].join("\n");

    const sets = parsePokepaste(text);

    expect(sets.map((s) => s.speciesToken)).toEqual(["Mi equipo", "Pikachu"]);
  });

  it("acepta la variante 'Nature: X' y deja de lado propiedades desconocidas", () => {
    const text = [
      "Charizard",
      "Nature: Adamant",
      "Shiny: Yes",
      "Tera Type: Fire",
      "Happiness: 255",
      "- Fire Blast",
    ].join("\n");

    const sets = parsePokepaste(text);

    expect(sets[0]!.natureName).toBe("adamant");
    expect(sets[0]!.moveNames).toEqual(["Fire Blast"]);
  });

  it("devuelve lista vacía con texto vacío", () => {
    expect(parsePokepaste("")).toEqual([]);
    expect(parsePokepaste("   \n\n  ")).toEqual([]);
  });
});

describe("lookups de importación", () => {
  const catalog = [
    { name: "charizard", id: 6 },
    { name: "basculegion-male", id: 902 },
    { name: "basculegion-female", id: 10248 },
    { name: "farfetchd", id: 83 },
    { name: "type-null", id: 772 },
    { name: "tauros-paldea-combat-breed", id: 10250 },
  ];

  it("resuelve formas de género con y sin marcador", () => {
    const lookup = buildSpeciesLookup(catalog);

    expect(lookupSpecies(lookup, "Basculegion-F", "F")?.slug).toBe("basculegion-female");
    expect(lookupSpecies(lookup, "Basculegion", "M")?.slug).toBe("basculegion-male");
  });

  it("resuelve nombres con apóstrofo, dos puntos y sufijos internos", () => {
    const lookup = buildSpeciesLookup(catalog);

    expect(lookupSpecies(lookup, "Farfetch'd", null)?.slug).toBe("farfetchd");
    expect(lookupSpecies(lookup, "Type: Null", null)?.slug).toBe("type-null");
    expect(lookupSpecies(lookup, "Tauros-Paldea-Combat", null)?.slug).toBe(
      "tauros-paldea-combat-breed",
    );
  });

  it("normaliza tokens sin acentos ni signos", () => {
    expect(normalizeToken("Flabébé")).toBe("flabebe");
    expect(normalizeToken("Ho-Oh")).toBe("hooh");
    expect(normalizeToken("Zygarde-10%")).toBe("zygarde10%");
  });

  it("resuelve movimientos por nombre display y oculta Hidden Power", () => {
    const lookup = buildMoveLookup([{ name: "ice-shard" }, { name: "close-combat" }, { name: "hidden-power" }]);

    expect(lookup.get(moveLookupKey("Ice Shard"))).toBe("ice-shard");
    expect(lookup.get(moveLookupKey("Close Combat"))).toBe("close-combat");
    expect(lookup.get(moveLookupKey("Hidden Power [Ice]"))).toBe("hidden-power");
    expect(lookup.get(moveLookupKey("Hidden Power Fire"))).toBe("hidden-power");
  });

  it("hace round-trip con el export", () => {
    const sets = parsePokepaste(teamToPokepaste(fullTeam));

    expect(sets.map((s) => s.speciesToken)).toEqual(["Charizard", "Lucario"]);
    expect(sets[0]!.moveNames).toEqual(["Fire Blast", "Solar Beam", "Focus Blast", "Air Slash"]);
    expect(sets[0]!.abilitySlug).toBe("blaze");
    expect(sets[1]!.level).toBe(50);
    expect(sets[1]!.evs).toEqual({ hp: 6, attack: 252, "special-defense": 6, speed: 246 });
    expect(sets[1]!.ivs).toEqual({ hp: 30, defense: 30, "special-attack": 0, "special-defense": 30 });
  });
});
