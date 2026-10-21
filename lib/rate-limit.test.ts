import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.REDIS_URL = "redis://test:6379";

const redisCommands = {
  incr: vi.fn(),
  expire: vi.fn(),
  on: vi.fn(),
};

vi.mock("ioredis", () => {
  const MockedRedis = vi.fn(() => redisCommands);
  return { default: MockedRedis };
});

import { checkRateLimit } from "@/lib/rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.REDIS_URL = "redis://test:6379";
  globalThis.__competidexRedis = redisCommands as unknown as never;
});

afterEach(() => {
  delete process.env.REDIS_URL;
  globalThis.__competidexRedis = undefined;
});

describe("checkRateLimit", () => {
  it("permite la petición si no hay Redis", async () => {
    delete process.env.REDIS_URL;
    globalThis.__competidexRedis = undefined;

    await expect(checkRateLimit("pokemon:1.2.3.4", 10, 60)).resolves.toBe(true);
    expect(redisCommands.incr).not.toHaveBeenCalled();
  });

  it("permite mientras el contador no supera el límite", async () => {
    redisCommands.incr.mockResolvedValueOnce(5);
    redisCommands.expire.mockResolvedValueOnce(1);

    await expect(checkRateLimit("pokemon:1.2.3.4", 10, 60)).resolves.toBe(true);
    expect(redisCommands.incr).toHaveBeenCalledWith("ratelimit:pokemon:1.2.3.4");
    // Solo se fija TTL al crear la clave (count === 1).
    expect(redisCommands.expire).not.toHaveBeenCalled();
  });

  it("fija la expiración en la primera petición de la ventana", async () => {
    redisCommands.incr.mockResolvedValueOnce(1);
    redisCommands.expire.mockResolvedValueOnce(1);

    await checkRateLimit("pokemon:1.2.3.4", 10, 60);

    expect(redisCommands.expire).toHaveBeenCalledWith("ratelimit:pokemon:1.2.3.4", 60);
  });

  it("bloquea cuando se supera el límite", async () => {
    redisCommands.incr.mockResolvedValueOnce(11);

    await expect(checkRateLimit("pokemon:1.2.3.4", 10, 60)).resolves.toBe(false);
  });

  it("degrada abierto si Redis lanza un error", async () => {
    redisCommands.incr.mockRejectedValueOnce(new Error("redis caído"));

    await expect(checkRateLimit("pokemon:1.2.3.4", 10, 60)).resolves.toBe(true);
  });
});
