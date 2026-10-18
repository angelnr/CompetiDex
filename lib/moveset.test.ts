import { beforeEach, describe, expect, it, vi } from "vitest";

// getOrSet ejecuta el producer siempre (no nos interesa el caché aquí).
const getOrSetMock = vi.fn(async (_key: string, producer: () => Promise<unknown>, _ttl?: number) =>
  producer(),
);

vi.mock("@/lib/redis", () => ({
  getOrSet: (key: string, producer: () => Promise<unknown>, ttl?: number) =>
    getOrSetMock(key, producer, ttl),
}));

const getPokemonMock = vi.fn();
const getMoveMock = vi.fn();

vi.mock("@/lib/pokeapi", () => ({
  getPokemon: (...args: unknown[]) => getPokemonMock(...args),
  getMove: (...args: unknown[]) => getMoveMock(...args),
}));

import { getMovepool } from "@/lib/moveset";

const MYSTICAL_FIRE = {
  name: "mystical-fire",
  names: [
    { name: "Llama Embrujada", language: { name: "es" } },
    { name: "Mystical Fire", language: { name: "en" } },
  ],
  type: { name: "fire" },
  damage_class: { name: "special" },
  power: 75,
  accuracy: 100,
  pp: 10,
  priority: 0,
};

const FOLLOW_ME = {
  name: "follow-me",
  names: [
    { name: "Señuelo", language: { name: "es" } },
    { name: "Follow Me", language: { name: "en" } },
  ],
  type: { name: "normal" },
  damage_class: { name: "status" },
  power: null,
  accuracy: null,
  pp: 20,
  priority: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getMovepool", () => {
  it("ensambla el pool con metadatos y nombres localizados", async () => {
    getPokemonMock.mockResolvedValue({
      id: 10186,
      moves: [
        {
          move: { name: "mystical-fire" },
          version_group_details: [
            { version_group: { name: "sword-shield" } },
            { version_group: { name: "scarlet-violet" } },
          ],
        },
      ],
    });
    getMoveMock.mockResolvedValue(MYSTICAL_FIRE);

    const pool = await getMovepool(10186);

    expect(pool.id).toBe(10186);
    expect(pool.moves).toHaveLength(1);
    expect(pool.moves[0]).toMatchObject({
      slug: "mystical-fire",
      type: "fire",
      category: "special",
      power: 75,
      accuracy: 100,
      pp: 10,
    });
    expect(pool.moves[0]!.names.es).toBe("Llama Embrujada");
    expect(pool.moves[0]!.names.en).toBe("Mystical Fire");
    // Orden cronológico: sword-shield antes que scarlet-violet.
    expect(pool.versionGroups).toEqual(["sword-shield", "scarlet-violet"]);

    const [key, , ttl] = getOrSetMock.mock.calls[0]!;
    expect(key).toBe("pokeapi:moveset:10186:v3");
    expect(ttl).toBe(604_800);
  });

  it("incluye movimientos presentes solo en el version-group champions", async () => {
    getPokemonMock.mockResolvedValue({
      id: 1,
      moves: [
        {
          move: { name: "mystical-fire" },
          version_group_details: [{ version_group: { name: "scarlet-violet" } }],
        },
        {
          move: { name: "follow-me" },
          version_group_details: [{ version_group: { name: "champions" } }],
        },
      ],
    });
    getMoveMock.mockImplementation((slug: string) =>
      Promise.resolve(slug === "mystical-fire" ? MYSTICAL_FIRE : FOLLOW_ME),
    );

    const pool = await getMovepool(1);

    expect(pool.moves.map((m) => m.slug)).toEqual(["follow-me", "mystical-fire"]);
    expect(pool.moves.find((m) => m.slug === "follow-me")!.vgs).toEqual(["champions"]);
    expect(pool.versionGroups).toContain("champions");
  });

  it("descarta movimientos solo presentes en versiones excluidas", async () => {
    getPokemonMock.mockResolvedValue({
      id: 1,
      moves: [
        {
          move: { name: "mystical-fire" },
          version_group_details: [{ version_group: { name: "scarlet-violet" } }],
        },
        {
          move: { name: "follow-me" },
          version_group_details: [{ version_group: { name: "colosseum" } }],
        },
      ],
    });
    getMoveMock.mockImplementation((slug: string) =>
      Promise.resolve(slug === "mystical-fire" ? MYSTICAL_FIRE : FOLLOW_ME),
    );

    const pool = await getMovepool(1);

    expect(pool.moves.map((m) => m.slug)).toEqual(["mystical-fire"]);
    expect(getMoveMock).toHaveBeenCalledTimes(1);
  });

  it("mantiene el slug aunque falle el detalle del movimiento", async () => {
    getPokemonMock.mockResolvedValue({
      id: 1,
      moves: [
        {
          move: { name: "mystical-fire" },
          version_group_details: [{ version_group: { name: "scarlet-violet" } }],
        },
      ],
    });
    getMoveMock.mockRejectedValue(new Error("429"));

    const pool = await getMovepool(1);

    expect(pool.moves).toHaveLength(1);
    expect(pool.moves[0]!.slug).toBe("mystical-fire");
    expect(pool.moves[0]!.type).toBe("normal");
  });

  it("devuelve pool vacío para formas sin movimientos", async () => {
    getPokemonMock.mockResolvedValue({ id: 10076, moves: [] });

    const pool = await getMovepool(10076);

    expect(pool.moves).toEqual([]);
    expect(pool.versionGroups).toEqual([]);
    expect(getMoveMock).not.toHaveBeenCalled();
  });

  it("une el learnset de una mega con el de su especie base", async () => {
    getPokemonMock.mockImplementation((id: string) => {
      if (id === "charizard-mega-y") {
        return Promise.resolve({
          id: 10035,
          name: "charizard-mega-y",
          moves: [
            {
              move: { name: "dragon-dance" },
              version_group_details: [{ version_group: { name: "champions" } }],
            },
          ],
        });
      }
      return Promise.resolve({
        id: 6,
        name: "charizard",
        moves: [
          {
            move: { name: "dragon-dance" },
            version_group_details: [{ version_group: { name: "scarlet-violet" } }],
          },
        ],
      });
    });
    getMoveMock.mockResolvedValue(MYSTICAL_FIRE);

    const pool = await getMovepool("charizard-mega-y");
    const dd = pool.moves.find((m) => m.slug === "dragon-dance");

    expect(dd).toBeDefined();
    // El learnset propio (champions) se une al de la especie base.
    expect(dd!.vgs).toContain("champions");
    expect(dd!.vgs).toContain("scarlet-violet");
  });
});
