import { describe, expect, it } from "vitest";

import { LOCATION_NAMES_OFFLINE } from "@/lib/location-names-offline";

/**
 * El diccionario es autogenerado; estos tests actúan como red de seguridad
 * frente a una regeneración rota o vacía.
 */
describe("LOCATION_NAMES_OFFLINE", () => {
  it("cubre regiones sin es/ja en PokeAPI", () => {
    expect(LOCATION_NAMES_OFFLINE["stony-wilderness"]?.es).toBe("Llanura Pétrea");
    expect(LOCATION_NAMES_OFFLINE["jubilife-village"]?.es).toBe("Villa Jubileo");
    expect(LOCATION_NAMES_OFFLINE["mesagoza"]?.es).toBe("Ciudad Meseta");
  });

  it("incluye japonés de Kanto, Johto y Sinnoh", () => {
    expect(LOCATION_NAMES_OFFLINE["pallet-town"]?.ja).toBe("マサラタウン");
    expect(LOCATION_NAMES_OFFLINE["kanto-route-7"]?.ja).toBe("７ばんどうろ");
    expect(LOCATION_NAMES_OFFLINE["eterna-city"]?.ja).toBe("ハクタイシティ");
  });

  it("tiene una cobertura mínima razonable", () => {
    expect(Object.keys(LOCATION_NAMES_OFFLINE).length).toBeGreaterThan(900);
  });
});
