import { describe, it, expect } from "vitest";

import {
  compareAlphanumeric,
  filterMovepool,
  isMovepoolFilterEmpty,
  normalizeQuery,
  parseMovepoolQuery,
  sortMovepool,
  type MovepoolLabels,
  type MovepoolSortColumn,
} from "@/lib/movepool-filter";
import type { MovepoolMove } from "@/lib/moveset";

function move(slug: string, overrides: Partial<MovepoolMove> = {}): MovepoolMove {
  return {
    slug,
    names: { es: slug, en: slug },
    type: "normal",
    category: "physical",
    power: 50,
    accuracy: 100,
    pp: 20,
    priority: 0,
    vgs: ["scarlet-violet"],
    ...overrides,
  };
}

const LABELS: MovepoolLabels = {
  name: (m) => m.names.es ?? m.slug,
  type: (m) => m.type,
  category: (m) => m.category,
};

const slugs = (moves: MovepoolMove[]) => moves.map((m) => m.slug);

describe("normalizeQuery", () => {
  it("quita acentos, pasa a minúsculas y recorta", () => {
    expect(normalizeQuery("  Eléctrico ")).toBe("electrico");
    expect(normalizeQuery("FÍSICO")).toBe("fisico");
  });
});

describe("compareAlphanumeric", () => {
  it("ordena dígitos antes que letras y números por valor", () => {
    const sorted = ["Zap Cannon", "1Move", "10Move", "Absorb", "2Move"].sort(compareAlphanumeric);
    expect(sorted).toEqual(["1Move", "2Move", "10Move", "Absorb", "Zap Cannon"]);
  });
});

describe("sortMovepool", () => {
  const moves = [
    move("tackle", { names: { es: "Placaje" }, power: 40, accuracy: 100, pp: 35, type: "normal" }),
    move("ember", { names: { es: "Ascuas" }, power: 40, accuracy: 100, pp: 25, type: "fire" }),
    move("sing", {
      names: { es: "Canto" },
      power: null,
      accuracy: 55,
      pp: 15,
      category: "status",
      type: "normal",
    }),
    move("hyper-beam", {
      names: { es: "Hiperrayo" },
      power: 150,
      accuracy: 90,
      pp: 5,
      category: "special",
      type: "normal",
    }),
  ];

  it("sin estado de ordenación devuelve el mismo array", () => {
    expect(sortMovepool(moves, null, LABELS)).toBe(moves);
  });

  it("primer clic en Nombre ordena de A a Z y el segundo invierte", () => {
    expect(slugs(sortMovepool(moves, { column: "name", reverse: false }, LABELS))).toEqual([
      "ember",
      "sing",
      "hyper-beam",
      "tackle",
    ]);
    expect(slugs(sortMovepool(moves, { column: "name", reverse: true }, LABELS))).toEqual([
      "tackle",
      "hyper-beam",
      "sing",
      "ember",
    ]);
  });

  it("primer clic en Poder ordena de mayor a menor y deja los nulos al final", () => {
    expect(slugs(sortMovepool(moves, { column: "power", reverse: false }, LABELS))).toEqual([
      "hyper-beam",
      "ember",
      "tackle",
      "sing",
    ]);
    // Invertido: los nulos siguen al final.
    expect(slugs(sortMovepool(moves, { column: "power", reverse: true }, LABELS))).toEqual([
      "ember",
      "tackle",
      "hyper-beam",
      "sing",
    ]);
  });

  it("ordena por precisión, pp y tipo", () => {
    expect(slugs(sortMovepool(moves, { column: "accuracy", reverse: false }, LABELS))).toEqual([
      "ember",
      "tackle",
      "hyper-beam",
      "sing",
    ]);
    expect(slugs(sortMovepool(moves, { column: "pp", reverse: false }, LABELS))).toEqual([
      "tackle",
      "ember",
      "sing",
      "hyper-beam",
    ]);
    expect(slugs(sortMovepool(moves, { column: "type", reverse: false }, LABELS))).toEqual([
      "ember",
      "sing",
      "hyper-beam",
      "tackle",
    ]);
  });

  it("desempata por nombre alfanumérico cuando la columna coincide", () => {
    const tied = [move("b", { names: { es: "Beta" } }), move("a", { names: { es: "Alfa" } })];
    expect(slugs(sortMovepool(tied, { column: "power", reverse: false }, LABELS))).toEqual(["a", "b"]);
  });

  it("no muta el array original", () => {
    const original = [...moves];
    sortMovepool(moves, { column: "name", reverse: false }, LABELS);
    expect(moves).toEqual(original);
  });
});

describe("parseMovepoolQuery", () => {
  const typeByToken = new Map([
    ["hada", "fairy"],
    ["electrico", "electric"],
    ["fuego", "fire"],
    ["fire", "fire"],
  ]);
  const categoryByToken = new Map([
    ["fisico", "physical"],
    ["especial", "special"],
    ["estado", "status"],
  ]);

  it("reconoce tipos y categorías, y deja el resto como texto", () => {
    const filter = parseMovepoolQuery("Hada, Eléctrico", typeByToken, categoryByToken);
    expect(filter.types).toEqual(["fairy", "electric"]);
    expect(filter.categories).toEqual([]);
    expect(filter.terms).toEqual([]);
  });

  it("reconoce una categoría", () => {
    const filter = parseMovepoolQuery("Físico", typeByToken, categoryByToken);
    expect(filter).toEqual({ types: [], categories: ["physical"], terms: [] });
  });

  it("combina tipos, categoría y texto y deduplica", () => {
    const filter = parseMovepoolQuery("Fuego, Físico, danza, danza", typeByToken, categoryByToken);
    expect(filter).toEqual({ types: ["fire"], categories: ["physical"], terms: ["danza"] });
  });

  it("ignora trozos vacíos y normaliza acentos y mayúsculas", () => {
    const filter = parseMovepoolQuery(" , ELÉCTRICO ,, ", typeByToken, categoryByToken);
    expect(filter).toEqual({ types: ["electric"], categories: [], terms: [] });
  });

  it("marca el filtro vacío", () => {
    expect(isMovepoolFilterEmpty(parseMovepoolQuery("", typeByToken, categoryByToken))).toBe(true);
    expect(isMovepoolFilterEmpty(parseMovepoolQuery("Hada", typeByToken, categoryByToken))).toBe(
      false,
    );
  });
});

describe("filterMovepool", () => {
  const moves = [
    move("moonblast", { names: { es: "Fuerza Lunar", en: "Moonblast" }, type: "fairy", category: "special" }),
    move("play-rough", { names: { es: "Carantoña", en: "Play Rough" }, type: "fairy", category: "physical" }),
    move("thunderbolt", { names: { es: "Rayo", en: "Thunderbolt" }, type: "electric", category: "special" }),
    move("dragon-dance", { names: { es: "Danza Dragón", en: "Dragon Dance" }, type: "dragon", category: "status" }),
  ];
  const names = (m: MovepoolMove) => ({ name: m.names.es ?? m.slug, englishName: m.names.en ?? "" });

  it("devuelve todo sin filtros", () => {
    expect(filterMovepool(moves, { types: [], categories: [], terms: [] }, names)).toBe(moves);
  });

  it("filtra por varios tipos con OR", () => {
    const result = filterMovepool(moves, { types: ["fairy", "electric"], categories: [], terms: [] }, names);
    expect(slugs(result)).toEqual(["moonblast", "play-rough", "thunderbolt"]);
  });

  it("filtra por categoría", () => {
    const result = filterMovepool(moves, { types: [], categories: ["physical"], terms: [] }, names);
    expect(slugs(result)).toEqual(["play-rough"]);
  });

  it("combina tipo y categoría (AND entre grupos)", () => {
    const result = filterMovepool(
      moves,
      { types: ["fairy"], categories: ["special"], terms: [] },
      names,
    );
    expect(slugs(result)).toEqual(["moonblast"]);
  });

  it("busca por nombre localizado o inglés y por slug", () => {
    expect(
      slugs(filterMovepool(moves, { types: [], categories: [], terms: ["lunar"] }, names)),
    ).toEqual(["moonblast"]);
    expect(
      slugs(filterMovepool(moves, { types: [], categories: [], terms: ["play"] }, names)),
    ).toEqual(["play-rough"]);
    expect(
      slugs(filterMovepool(moves, { types: [], categories: [], terms: ["dragon dance"] }, names)),
    ).toEqual(["dragon-dance"]);
  });
});
