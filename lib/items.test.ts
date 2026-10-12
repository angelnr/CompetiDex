import { describe, it, expect } from "vitest";
import { ITEMS, itemSlug, getItemSpriteUrl, findItem, localizeItem } from "@/lib/items";
import type { Item as PokeItem } from "@/lib/pokeapi";

describe("itemSlug", () => {
  it("normaliza espacios y mayúsculas", () => {
    expect(itemSlug("Life Orb")).toBe("life-orb");
    expect(itemSlug("Choice Scarf")).toBe("choice-scarf");
  });

  it("maneja guiones, apóstrofes y variantes X/Y/Z", () => {
    expect(itemSlug("Never-Melt Ice")).toBe("never-melt-ice");
    expect(itemSlug("King's Rock")).toBe("kings-rock");
    expect(itemSlug("Charizardite X")).toBe("charizardite-x");
    expect(itemSlug("Absolite Z")).toBe("absolite-z");
  });
});

describe("getItemSpriteUrl", () => {
  it("construye la URL del sprite de PokeAPI", () => {
    expect(getItemSpriteUrl("life-orb")).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/life-orb.png",
    );
  });
});

describe("findItem", () => {
  it("encuentra por nombre canónico (case-insensitive)", () => {
    expect(findItem("life orb")?.slug).toBe("life-orb");
    expect(findItem("Never-Melt Ice")?.slug).toBe("never-melt-ice");
  });

  it("encuentra por slug (compatibilidad con equipos antiguos)", () => {
    expect(findItem("life-orb")?.name).toBe("Life Orb");
    expect(findItem("leftovers")?.name).toBe("Leftovers");
  });

  it("devuelve undefined para vacío o desconocido", () => {
    expect(findItem(null)).toBeUndefined();
    expect(findItem("")).toBeUndefined();
    expect(findItem("objeto-inexistente")).toBeUndefined();
  });
});

describe("localizeItem", () => {
  const curated = ITEMS.find((i) => i.slug === "leftovers")!;
  const pokeBase: PokeItem = {
    id: 211,
    name: "leftovers",
    names: [{ name: "Restos", language: { name: "es", url: "" } }],
    flavor_text_entries: [
      {
        text: "La delicadeza del pañuelo fortalece los movimientos de tipo Normal.",
        language: { name: "es", url: "" },
        version_group: { name: "x-y", url: "" },
      },
      {
        text: "Este objeto restaura los PS del Pokémon que lo lleva.",
        language: { name: "es", url: "" },
        version_group: { name: "sun-moon", url: "" },
      },
    ],
    effect_entries: [],
    category: { name: "held-items", url: "" },
  };

  it("localiza el nombre en es", () => {
    const { name } = localizeItem(curated, pokeBase, "es");
    expect(name).toBe("Restos");
  });

  it("usa la descripción del version-group más reciente (no la de X/Y)", () => {
    const { description } = localizeItem(curated, pokeBase, "es");
    expect(description).toBe("Este objeto restaura los PS del Pokémon que lo lleva.");
    expect(description).not.toContain("pañuelo");
  });

  it("en inglés usa la descripción curada del catálogo", () => {
    const { description } = localizeItem(curated, pokeBase, "en");
    expect(description).toBe(curated.description);
  });

  it("cae a la descripción curada si no hay texto localizado", () => {
    const { description } = localizeItem(curated, pokeBase, "fr");
    expect(description).toBe(curated.description);
  });

  it("sin datos de PokeAPI (objeto Champions) usa el nombre y descripción curados", () => {
    const { name, description } = localizeItem(curated, undefined, "es");
    expect(name).toBe(curated.name);
    expect(description).toBe(curated.description);
  });
});

describe("catálogo ITEMS", () => {
  it("no tiene slugs ni nombres duplicados", () => {
    const slugs = ITEMS.map((i) => i.slug);
    const names = ITEMS.map((i) => i.name);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("incluye los objetos populares clave", () => {
    for (const name of ["Life Orb", "Leftovers", "Focus Sash", "Choice Scarf"]) {
      expect(findItem(name)).toBeDefined();
    }
  });

  it("incluye piedras mega nuevas (X/Y/Z)", () => {
    expect(findItem("Charizardite X")?.category).toBe("pokemon");
    expect(findItem("Absolite Z")?.category).toBe("pokemon");
    expect(findItem("Raichunite Y")?.category).toBe("pokemon");
  });

  it("cada objeto tiene descripción no vacía", () => {
    for (const item of ITEMS) {
      expect(item.description.length).toBeGreaterThan(0);
    }
  });
});
