import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mock de ioredis antes de importar el módulo bajo test ---
// El constructor devuelve una instancia compartida con métodos mocked.
const redisCommands = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
};

vi.mock("ioredis", () => {
  const MockedRedis = vi.fn(() => redisCommands);
  return { default: MockedRedis };
});

import { closeRedis, getOrSet, invalidate, invalidatePattern } from "@/lib/redis";

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.__competidexRedis = redisCommands as unknown as never;
});

afterEach(async () => {
  // Limpia el singleton entre tests
  globalThis.__competidexRedis = undefined;
});

describe("getOrSet", () => {
  it("devuelve valor cacheado si existe (hit)", async () => {
    redisCommands.get.mockResolvedValueOnce(JSON.stringify({ id: 25 }));
    redisCommands.setex.mockResolvedValueOnce("OK");

    const result = await getOrSet("pokeapi:pokemon:25", async () => ({ id: 999 }), 60);

    expect(result).toEqual({ id: 25 });
    expect(redisCommands.get).toHaveBeenCalledWith("pokeapi:pokemon:25");
    expect(redisCommands.setex).not.toHaveBeenCalled();
  });

  it("computa y almacena en miss", async () => {
    redisCommands.get.mockResolvedValueOnce(null);
    redisCommands.setex.mockResolvedValueOnce("OK");

    const producer = vi.fn(async () => ({ name: "pikachu" }));
    const result = await getOrSet("pokeapi:pokemon:25", producer, 60);

    expect(result).toEqual({ name: "pikachu" });
    expect(producer).toHaveBeenCalledTimes(1);
    expect(redisCommands.setex).toHaveBeenCalledWith(
      "pokeapi:pokemon:25",
      60,
      JSON.stringify({ name: "pikachu" }),
    );
  });

  it("invalida y re-computa si el payload cacheado es corrupto", async () => {
    redisCommands.get.mockResolvedValueOnce("{no es json");
    redisCommands.del.mockResolvedValueOnce(1);
    redisCommands.setex.mockResolvedValueOnce("OK");

    const producer = vi.fn(async () => ({ recovered: true }));
    const result = await getOrSet("k", producer, 60);

    expect(result).toEqual({ recovered: true });
    expect(redisCommands.del).toHaveBeenCalledWith("k");
    expect(redisCommands.setex).toHaveBeenCalled();
  });
});

describe("invalidate", () => {
  it("borra la clave con DEL", async () => {
    redisCommands.del.mockResolvedValueOnce(1);
    const removed = await invalidate("pokeapi:pokemon:1");
    expect(removed).toBeUndefined();
    expect(redisCommands.del).toHaveBeenCalledWith("pokeapi:pokemon:1");
  });
});

describe("invalidatePattern", () => {
  it("hace SCAN paginado y borra coincidencias", async () => {
    // Primera página: 2 keys, cursor parcial; segunda: 0 keys, cursor final
    redisCommands.scan
      .mockResolvedValueOnce(["1", ["a:1", "a:2"]])
      .mockResolvedValueOnce(["0", []]);
    redisCommands.del.mockResolvedValueOnce(2);

    const deleted = await invalidatePattern("a:*");

    expect(deleted).toBe(2);
    expect(redisCommands.scan).toHaveBeenCalledTimes(2);
    expect(redisCommands.del).toHaveBeenCalledWith("a:1", "a:2");
  });
});

describe("closeRedis", () => {
  it("llama a quit y limpia el singleton", async () => {
    redisCommands.quit.mockResolvedValueOnce("OK");
    await closeRedis();
    expect(redisCommands.quit).toHaveBeenCalled();
    expect(globalThis.__competidexRedis).toBeUndefined();
  });
});
