import { describe, expect, it } from "vitest";

import type { PokemonMoveSlot } from "@/lib/pokeapi";
import {
  defaultMoveMethod,
  methodsInGame,
  moveMethodRank,
  pickDefaultMoveGame,
} from "@/lib/move-methods";

function slot(
  name: string,
  details: Array<[game: string, method: string, level?: number]>,
): PokemonMoveSlot {
  return {
    move: { name, url: `https://pokeapi.co/api/v2/move/${name}/` },
    version_group_details: details.map(([game, method, level = 0]) => ({
      level_learned_at: level,
      version_group: { name: game, url: `https://pokeapi.co/api/v2/version-group/${game}/` },
      move_learn_method: {
        name: method,
        url: `https://pokeapi.co/api/v2/move-learn-method/${method}/`,
      },
    })),
  };
}

describe("methodsInGame", () => {
  it("incluye train, el método que usa Champions", () => {
    const slots = [slot("fake-out", [["champions", "train"]])];

    expect(methodsInGame(slots, "champions")).toEqual(["train"]);
    expect(defaultMoveMethod(slots, "champions")).toBe("train");
  });

  it("ordena las pestañas y descarta las que no tienen movimientos en el juego", () => {
    const slots = [
      slot("tackle", [
        ["scarlet-violet", "level-up", 1],
        ["sword-shield", "tutor"],
      ]),
      slot("protect", [
        ["scarlet-violet", "machine"],
        ["champions", "train"],
      ]),
      slot("charm", [["scarlet-violet", "egg"]]),
    ];

    expect(methodsInGame(slots, "scarlet-violet")).toEqual(["level-up", "machine", "egg"]);
    expect(methodsInGame(slots, "sword-shield")).toEqual(["tutor"]);
  });

  it("deja al final los métodos desconocidos", () => {
    const slots = [slot("celebrate", [["scarlet-violet", "special-event"]])];

    expect(methodsInGame(slots, "scarlet-violet")).toEqual(["special-event"]);
    expect(moveMethodRank("special-event")).toBeGreaterThan(moveMethodRank("train"));
  });

  it("devuelve vacío sin juego seleccionado", () => {
    expect(methodsInGame([slot("tackle", [["scarlet-violet", "level-up"]])], undefined)).toEqual(
      [],
    );
  });
});

describe("pickDefaultMoveGame", () => {
  it("prioriza Escarlata/Púrpura sobre Espada/Escudo y Champions", () => {
    expect(pickDefaultMoveGame(["sword-shield", "scarlet-violet", "champions"])).toBe(
      "scarlet-violet",
    );
  });

  it("usa Espada/Escudo antes que Champions cuando no hay SV", () => {
    expect(pickDefaultMoveGame(["sword-shield", "champions"])).toBe("sword-shield");
  });

  it("cae al juego más reciente que no sea Champions", () => {
    expect(pickDefaultMoveGame(["legends-arceus", "champions"])).toBe("legends-arceus");
  });

  it("usa Champions si es el único juego disponible", () => {
    expect(pickDefaultMoveGame(["champions"])).toBe("champions");
  });

  it("devuelve undefined sin juegos", () => {
    expect(pickDefaultMoveGame([])).toBeUndefined();
  });
});
