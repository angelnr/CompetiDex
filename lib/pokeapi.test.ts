import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks: pokeapiFetch delega en lib/redis.getOrSet ---
// Interceptamos el módulo redis para que el producer se ejecute siempre
// (no nos interesa el caché, sino la lógica de URL + parseo).

const getOrSetMock = vi.fn(async <T>(_key: string, producer: () => Promise<T>, _ttl?: number) =>
  producer(),
);

vi.mock("@/lib/redis", () => ({
  getOrSet: (key: string, producer: () => Promise<unknown>, ttl?: number) =>
    getOrSetMock(key, producer, ttl),
}));

// Mock global de fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import {
  getPokemon,
  getPokemonList,
  getPokemonSpecies,
  getEvolutionChain,
  getType,
  getTypeList,
  PokeAPIError,
} from "@/lib/pokeapi";

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

describe("getPokemonList", () => {
  it("construye la URL con offset/limit y cachea con ttl list", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ count: 1025, next: null, previous: null, results: [] }),
    );

    const data = await getPokemonList({ offset: 20, limit: 10 });

    expect(data).toEqual({ count: 1025, next: null, previous: null, results: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/pokemon?");
    expect(url).toContain("offset=20");
    expect(url).toContain("limit=10");

    const [key, , ttl] = getOrSetMock.mock.calls[0]!;
    expect(key).toBe("pokeapi:/pokemon?offset=20&limit=10");
    expect(ttl).toBe(86_400);
  });

  it("sin opts usa limit default 20", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ count: 0, next: null, previous: null, results: [] }),
    );
    await getPokemonList();
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("limit=20");
  });
});

describe("getPokemon", () => {
  it("acepta número y construye /pokemon/{id}", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 25, name: "pikachu" }));

    const data = await getPokemon(25);

    expect(data).toEqual({ id: 25, name: "pikachu" });
    const [key] = getOrSetMock.mock.calls[0]!;
    expect(key).toBe("pokeapi:/pokemon/25");
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toMatch(/\/pokemon\/25$/);
  });

  it("acepta string (nombre)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 25, name: "pikachu" }));

    await getPokemon("pikachu");

    const [key] = getOrSetMock.mock.calls[0]!;
    expect(key).toBe("pokeapi:/pokemon/pikachu");
  });
});

describe("getPokemonSpecies", () => {
  it("construye /pokemon-species/{id}", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 25, name: "pikachu", is_legendary: false }));

    const data = await getPokemonSpecies(25);

    expect(data).toEqual(expect.objectContaining({ id: 25 }));
    const [key] = getOrSetMock.mock.calls[0]!;
    expect(key).toBe("pokeapi:/pokemon-species/25");
  });
});

describe("getEvolutionChain", () => {
  it("construye /evolution-chain/{id}", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 10, chain: { species: { name: "pichu" }, evolves_to: [] } }),
    );

    const data = await getEvolutionChain(10);

    expect(data).toEqual(expect.objectContaining({ id: 10 }));
    const [key] = getOrSetMock.mock.calls[0]!;
    expect(key).toBe("pokeapi:/evolution-chain/10");
  });
});

describe("getType", () => {
  it("usa TTL de 7 días (types)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 13, name: "electric", damage_relations: {} }),
    );

    await getType("electric");

    const [key, , ttl] = getOrSetMock.mock.calls[0]!;
    expect(key).toBe("pokeapi:/type/electric");
    expect(ttl).toBe(604_800);
  });
});

describe("getTypeList", () => {
  it("construye /type con query", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ count: 19, next: null, previous: null, results: [] }),
    );

    await getTypeList({ limit: 20 });

    const [key, , ttl] = getOrSetMock.mock.calls[0]!;
    expect(key).toBe("pokeapi:/type?limit=20");
    expect(ttl).toBe(604_800);
  });
});

describe("PokeAPIError en upstream no-ok", async () => {
  it("lanza PokeAPIError con status y endpoint en 404", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    await expect(getPokemon(999)).rejects.toMatchObject({
      name: "PokeAPIError",
      status: 404,
      endpoint: "/pokemon/999",
    });
  });

  it("lanza PokeAPIError en 500", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(getPokemon("missingno")).rejects.toBeInstanceOf(PokeAPIError);
  });
});
