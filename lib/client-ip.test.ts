import { describe, expect, it } from "vitest";

import { getClientIp } from "@/lib/client-ip";

function headersWith(xff?: string): Headers {
  const headers = new Headers();
  if (xff !== undefined) headers.set("x-forwarded-for", xff);
  return headers;
}

describe("getClientIp", () => {
  it("devuelve unknown si no hay X-Forwarded-For", () => {
    expect(getClientIp(headersWith())).toBe("unknown");
  });

  it("devuelve la única IP de la cadena", () => {
    expect(getClientIp(headersWith("203.0.113.42"))).toBe("203.0.113.42");
  });

  it("usa el último valor (el añadido por el proxy de confianza)", () => {
    expect(getClientIp(headersWith("8.8.8.8, 203.0.113.42"))).toBe("203.0.113.42");
  });

  it("recorta espacios y descarta entradas vacías", () => {
    expect(getClientIp(headersWith(" 8.8.8.8 ,, 203.0.113.42 ,"))).toBe("203.0.113.42");
  });

  it("soporta IPv6", () => {
    expect(getClientIp(headersWith("2001:db8::1"))).toBe("2001:db8::1");
  });
});
