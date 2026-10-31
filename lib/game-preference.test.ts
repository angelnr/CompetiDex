import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GAME_PREFERENCE_EVENT,
  preferredVersion,
  preferredVersionGroup,
  readGamePreference,
  saveVersion,
  saveVersionGroup,
  subscribeGamePreference,
} from "@/lib/game-preference";

beforeEach(() => {
  localStorage.clear();
});

describe("saveVersion", () => {
  it("guarda la versión exacta y su version-group base", () => {
    saveVersion("shield");

    expect(readGamePreference()).toEqual({
      version: "shield",
      versionGroup: "sword-shield",
    });
  });

  it("resuelve el juego base aunque la versión sea de un DLC", () => {
    saveVersion("violet");

    expect(readGamePreference().versionGroup).toBe("scarlet-violet");
  });
});

describe("saveVersionGroup", () => {
  it("conserva la versión si pertenece al nuevo grupo", () => {
    saveVersion("shield");
    saveVersionGroup("the-isle-of-armor");

    expect(readGamePreference()).toEqual({
      version: "shield",
      versionGroup: "the-isle-of-armor",
    });
  });

  it("cambia de versión si la actual no pertenece al grupo", () => {
    saveVersion("violet");
    saveVersionGroup("sword-shield");

    expect(readGamePreference()).toEqual({
      version: "sword",
      versionGroup: "sword-shield",
    });
  });
});

describe("preferredVersion", () => {
  it("prefiere la versión exacta si está disponible", () => {
    saveVersion("shield");

    expect(preferredVersion(["sword", "shield"])).toBe("shield");
  });

  it("cae a la otra versión de la familia si la exacta no existe", () => {
    saveVersion("shield");

    expect(preferredVersion(["sword"])).toBe("sword");
  });

  it("devuelve undefined si el juego no está disponible", () => {
    saveVersion("violet");

    expect(preferredVersion(["sword", "shield"])).toBeUndefined();
  });
});

describe("preferredVersionGroup", () => {
  it("prefiere el version-group guardado si está disponible", () => {
    saveVersionGroup("the-indigo-disk");

    expect(preferredVersionGroup(["scarlet-violet", "the-indigo-disk"])).toBe("the-indigo-disk");
  });

  it("cae al juego base cuando la especie no tiene el DLC", () => {
    saveVersionGroup("the-indigo-disk");

    expect(preferredVersionGroup(["scarlet-violet"])).toBe("scarlet-violet");
  });

  it("usa la versión guardada para resolver el grupo", () => {
    saveVersion("shield");

    expect(preferredVersionGroup(["sword-shield", "champions"])).toBe("sword-shield");
  });

  it("cae al DLC si la especie no tiene el juego base", () => {
    saveVersion("scarlet");

    expect(preferredVersionGroup(["the-teal-mask"])).toBe("the-teal-mask");
  });
});

describe("subscribeGamePreference", () => {
  it("avisa a los suscriptores al guardar y permite desuscribirse", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeGamePreference(listener);

    saveVersion("scarlet");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    saveVersion("violet");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("emite el evento interno esperado", () => {
    const listener = vi.fn();
    window.addEventListener(GAME_PREFERENCE_EVENT, listener);

    saveVersion("red");

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(GAME_PREFERENCE_EVENT, listener);
  });
});
