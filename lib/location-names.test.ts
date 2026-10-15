import { describe, expect, it } from "vitest";

import {
  getCuratedLocationName,
  humanizeLocationSlug,
  resolveLocationName,
  splitLocationName,
} from "@/lib/location-names";

/** Traductor de sufijos de prueba (solo "-area" y "-1f"). */
const suffixLabel = (suffix: string): string | null => {
  const map: Record<string, string> = { "-area": "área", "-1f": "1F" };
  return map[suffix] ?? null;
};

describe("splitLocationName", () => {
  it("separa el sufijo de zona del slug", () => {
    expect(splitLocationName("kanto-route-7-area")).toEqual({
      base: "kanto-route-7",
      suffix: "-area",
    });
  });

  it("devuelve el slug completo cuando no hay sufijo conocido", () => {
    expect(splitLocationName("pallet-town")).toEqual({ base: "pallet-town", suffix: null });
  });
});

describe("getCuratedLocationName", () => {
  it("traduce localizaciones conocidas del diccionario", () => {
    expect(getCuratedLocationName("pallet-town")).toBe("Pueblo Paleta");
    expect(getCuratedLocationName("route-7")).toBe("Ruta 7");
  });

  it("ignora el prefijo de región de PokeAPI", () => {
    expect(getCuratedLocationName("kanto-route-7")).toBe("Ruta 7");
  });

  it("devuelve null para placeholders o desconocidos", () => {
    // "vaniville-town" es una entrada placeholder: el valor repite el slug.
    expect(getCuratedLocationName("vaniville-town")).toBeNull();
    expect(getCuratedLocationName("totally-unknown-place")).toBeNull();
  });
});

describe("humanizeLocationSlug", () => {
  it("capitaliza cada palabra del slug", () => {
    expect(humanizeLocationSlug("mt-moon")).toBe("Mt Moon");
  });
});

describe("resolveLocationName", () => {
  it("en español usa el diccionario curado y el sufijo localizado", () => {
    expect(resolveLocationName({ areaName: "kanto-route-7-area", locale: "es", suffixLabel })).toBe(
      "Ruta 7 (área)",
    );
  });

  it("en español cae al slug humanizado cuando no hay traducción", () => {
    expect(
      resolveLocationName({ areaName: "totally-unknown-place-area", locale: "es", suffixLabel }),
    ).toBe("Totally Unknown Place (área)");
  });

  it("prioriza el nombre localizado de PokeAPI en en/fr/de", () => {
    expect(
      resolveLocationName({
        areaName: "canalave-city-area",
        locale: "fr",
        localized: { fr: "Joliberges" },
      }),
    ).toBe("Joliberges");

    expect(
      resolveLocationName({
        areaName: "pallet-town",
        locale: "en",
        localized: { en: "Pallet Town" },
      }),
    ).toBe("Pallet Town");
  });

  it("cae al slug humanizado en japonés (PokeAPI no tiene ja)", () => {
    expect(resolveLocationName({ areaName: "pallet-town", locale: "ja" })).toBe("Pallet Town");
    expect(resolveLocationName({ areaName: "mt-moon-1f", locale: "ja", suffixLabel })).toBe(
      "Mt Moon (1F)",
    );
  });
});
