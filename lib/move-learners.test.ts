import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getOrSetMock = vi.fn(async (_key: string, producer: () => Promise<unknown>, _ttl?: number) =>
  producer(),
);

vi.mock("@/lib/redis", () => ({
  getOrSet: (key: string, producer: () => Promise<unknown>, ttl?: number) =>
    getOrSetMock(key, producer, ttl),
}));

import { getMoveLearnerGames, getMoveLearners, groupMoveLearners } from "@/lib/move-learners";

function graphqlResponse(data: unknown): Response {
  return {
    ok: true,
    json: async () => ({ data }),
  } as Response;
}

const fetchMock = vi.fn();

/** Query GraphQL enviada en la última petición simulada. */
function lastQuery(): string {
  const call = fetchMock.mock.calls.at(-1)!;
  const body = JSON.parse(call[1]!.body as string) as { query: string };
  return body.query;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("groupMoveLearners", () => {
  it("agrupa por Pokémon, ordena métodos y elimina duplicados", () => {
    const learners = groupMoveLearners([
      { pokemonId: 25, pokemonName: "pikachu", method: "machine", level: 0 },
      { pokemonId: 25, pokemonName: "pikachu", method: "level-up", level: 1 },
      { pokemonId: 25, pokemonName: "pikachu", method: "machine", level: 0 },
      { pokemonId: 172, pokemonName: "pichu", method: "egg", level: 0 },
    ]);

    expect(learners.map((l) => l.pokemonId)).toEqual([25, 172]);
    expect(learners[0]!.methods).toEqual([
      { name: "level-up", level: 1 },
      { name: "machine", level: 0 },
    ]);
  });
});

describe("getMoveLearnerGames", () => {
  it("normaliza BDSP, filtra spin-offs/japonesas y ordena por juego", async () => {
    fetchMock.mockResolvedValue(
      graphqlResponse({
        pokemon_v2_versiongroup: [
          {
            name: "red-green-japan",
            order: 1,
            pokemon_v2_pokemonmoves_aggregate: { aggregate: { count: 5 } },
          },
          {
            name: "colosseum",
            order: 9,
            pokemon_v2_pokemonmoves_aggregate: { aggregate: { count: 1 } },
          },
          {
            name: "brilliant-diamond-and-shining-pearl",
            order: 25,
            pokemon_v2_pokemonmoves_aggregate: { aggregate: { count: 2 } },
          },
          {
            name: "scarlet-violet",
            order: 27,
            pokemon_v2_pokemonmoves_aggregate: { aggregate: { count: 3 } },
          },
          {
            name: "the-teal-mask",
            order: 28,
            pokemon_v2_pokemonmoves_aggregate: { aggregate: { count: 0 } },
          },
        ],
      }),
    );

    const games = await getMoveLearnerGames(252);

    expect(games).toEqual([
      { name: "brilliant-diamond-shining-pearl", order: 25, count: 2 },
      { name: "scarlet-violet", order: 27, count: 3 },
    ]);
    expect(getOrSetMock).toHaveBeenCalledWith(
      "pokeapi:move-learner-games:252:v2",
      expect.any(Function),
      604_800,
    );
  });

  it("cuenta las formas regionales y descarta megas y formas de combate", async () => {
    fetchMock.mockResolvedValue(graphqlResponse({ pokemon_v2_versiongroup: [] }));

    await getMoveLearnerGames(779);

    expect(lastQuery()).toContain("is_mega: { _eq: false }");
    expect(lastQuery()).toContain("is_battle_only: { _eq: false }");
    expect(lastQuery()).toContain("-(alola|galar|hisui)(-standard)?$");
  });
});

describe("getMoveLearners", () => {
  it("devuelve los aprendices agrupados con método y nivel", async () => {
    fetchMock.mockResolvedValue(
      graphqlResponse({
        pokemon_v2_move: [
          {
            pokemon_v2_pokemonmoves: [
              {
                level: 1,
                pokemon_v2_movelearnmethod: { name: "level-up" },
                pokemon_v2_pokemon: { id: 25, name: "pikachu" },
              },
              {
                level: 0,
                pokemon_v2_movelearnmethod: { name: "machine" },
                pokemon_v2_pokemon: { id: 25, name: "pikachu" },
              },
            ],
          },
        ],
      }),
    );

    const learners = await getMoveLearners(252, "scarlet-violet");

    expect(learners).toEqual([
      {
        pokemonId: 25,
        pokemonName: "pikachu",
        methods: [
          { name: "level-up", level: 1 },
          { name: "machine", level: 0 },
        ],
      },
    ]);
  });

  it("incluye formas regionales como Stunfisk de Galar (Snap Trap)", async () => {
    fetchMock.mockResolvedValue(
      graphqlResponse({
        pokemon_v2_move: [
          {
            pokemon_v2_pokemonmoves: [
              {
                level: 45,
                pokemon_v2_movelearnmethod: { name: "level-up" },
                pokemon_v2_pokemon: { id: 10180, name: "stunfisk-galar" },
              },
            ],
          },
        ],
      }),
    );

    const learners = await getMoveLearners(779, "sword-shield");

    expect(learners).toEqual([
      {
        pokemonId: 10180,
        pokemonName: "stunfisk-galar",
        methods: [{ name: "level-up", level: 45 }],
      },
    ]);
    expect(lastQuery()).toContain("is_mega: { _eq: false }");
    expect(lastQuery()).toContain("is_battle_only: { _eq: false }");
    expect(lastQuery()).toContain("-(alola|galar|hisui)(-standard)?$");
  });

  it("traduce el alias de BDSP al identificador que espera GraphQL", async () => {
    fetchMock.mockResolvedValue(graphqlResponse({ pokemon_v2_move: [] }));

    await getMoveLearners(252, "brilliant-diamond-shining-pearl");

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as {
      variables: { game: string };
    };
    expect(body.variables.game).toBe("brilliant-diamond-and-shining-pearl");
  });

  it("añade las evoluciones que heredan un movimiento huevo (Pawmot)", async () => {
    fetchMock
      .mockResolvedValueOnce(
        graphqlResponse({
          pokemon_v2_move: [
            {
              pokemon_v2_pokemonmoves: [
                {
                  level: 0,
                  pokemon_v2_movelearnmethod: { name: "egg" },
                  pokemon_v2_pokemon: { id: 921, name: "pawmi" },
                },
              ],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        graphqlResponse({
          pokemon_v2_pokemonspecies: [
            {
              id: 921,
              name: "pawmi",
              evolution_chain_id: 484,
              pokemon_v2_evolutionchain: {
                pokemon_v2_pokemonspecies: [
                  {
                    id: 921,
                    name: "pawmi",
                    evolves_from_species_id: null,
                    pokemon_v2_pokemons: [
                      {
                        id: 921,
                        name: "pawmi",
                        pokemon_v2_pokemonmoves: [{ id: 1 }],
                      },
                    ],
                  },
                  {
                    id: 922,
                    name: "pawmo",
                    evolves_from_species_id: 921,
                    pokemon_v2_pokemons: [
                      {
                        id: 922,
                        name: "pawmo",
                        pokemon_v2_pokemonmoves: [{ id: 1 }],
                      },
                    ],
                  },
                  {
                    id: 923,
                    name: "pawmot",
                    evolves_from_species_id: 922,
                    pokemon_v2_pokemons: [
                      {
                        id: 923,
                        name: "pawmot",
                        pokemon_v2_pokemonmoves: [{ id: 1 }],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }),
      );

    const learners = await getMoveLearners(252, "scarlet-violet");

    expect(learners.map((learner) => learner.pokemonName)).toEqual(["pawmi", "pawmo", "pawmot"]);
    expect(learners.every((learner) => learner.methods[0]!.name === "egg")).toBe(true);
  });
});
