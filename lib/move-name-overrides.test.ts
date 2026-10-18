import { describe, it, expect } from "vitest";

import { applyMoveNameOverrides } from "@/lib/move-name-overrides";
import type { Move } from "@/lib/pokeapi";

function makeMove(slug: string, names: { name: string; language: string }[]): Move {
  return {
    id: 1,
    name: slug,
    names: names.map((n) => ({ name: n.name, language: { name: n.language, url: "" } })),
    flavor_text_entries: [],
    effect_entries: [],
    effect_chance: null,
    power: null,
    pp: null,
    accuracy: null,
    priority: 0,
    type: { name: "ice", url: "" },
    damage_class: { name: "physical", url: "" },
    meta: null,
    target: { name: "selected-pokemon", url: "" },
    generation: { name: "generation-iv", url: "" },
  };
}

describe("applyMoveNameOverrides", () => {
  it("corrige el nombre es desactualizado de ice-shard", () => {
    const move = makeMove("ice-shard", [
      { name: "Esquirla Helada", language: "es" },
      { name: "Ice Shard", language: "en" },
    ]);

    const result = applyMoveNameOverrides(move);

    expect(result.names.find((n) => n.language.name === "es")?.name).toBe("Canto Helado");
  });

  it("no toca los demás idiomas", () => {
    const move = makeMove("ice-shard", [
      { name: "Esquirla Helada", language: "es" },
      { name: "Ice Shard", language: "en" },
      { name: "Éclats Glace", language: "fr" },
    ]);

    const result = applyMoveNameOverrides(move);

    expect(result.names.find((n) => n.language.name === "en")?.name).toBe("Ice Shard");
    expect(result.names.find((n) => n.language.name === "fr")?.name).toBe("Éclats Glace");
  });

  it("añade la entrada del idioma si no existe", () => {
    const move = makeMove("ice-shard", [{ name: "Ice Shard", language: "en" }]);

    const result = applyMoveNameOverrides(move);

    expect(result.names.find((n) => n.language.name === "es")?.name).toBe("Canto Helado");
    expect(result.names).toHaveLength(2);
  });

  it("no muta el movimiento original", () => {
    const move = makeMove("ice-shard", [
      { name: "Esquirla Helada", language: "es" },
    ]);

    applyMoveNameOverrides(move);

    expect(move.names[0]!.name).toBe("Esquirla Helada");
  });

  it("devuelve el mismo objeto si el slug no tiene override", () => {
    const move = makeMove("thunderbolt", [{ name: "Thunderbolt", language: "en" }]);

    expect(applyMoveNameOverrides(move)).toBe(move);
  });
});
