import { describe, expect, it } from "vitest";

import { mergeInheritedEggMoves } from "@/lib/move-inheritance";
import type { PokemonMoveSlot } from "@/lib/pokeapi";

function slot(name: string, method: string, versionGroups: string[]): PokemonMoveSlot {
  return {
    move: { name, url: `/move/${name}` },
    version_group_details: versionGroups.map((vg) => ({
      level_learned_at: method === "egg" ? 0 : 1,
      version_group: { name: vg, url: `/version-group/${vg}` },
      move_learn_method: { name: method, url: `/move-learn-method/${method}` },
    })),
  };
}

describe("mergeInheritedEggMoves", () => {
  it("añade los huevos de la raíz para el version-group de la evolución", () => {
    const current = [slot("thunder-shock", "level-up", ["scarlet-violet"])];
    const root = [
      slot("fake-out", "egg", ["scarlet-violet"]),
      slot("mach-punch", "egg", ["scarlet-violet"]),
      slot("sweet-kiss", "egg", ["scarlet-violet"]),
      slot("wish", "egg", ["scarlet-violet"]),
      slot("thunder-shock", "level-up", ["scarlet-violet"]),
    ];

    const merged = mergeInheritedEggMoves(current, root);

    expect(merged.map((m) => m.move.name).sort()).toEqual([
      "fake-out",
      "mach-punch",
      "sweet-kiss",
      "thunder-shock",
      "wish",
    ]);
    const fakeOut = merged.find((m) => m.move.name === "fake-out")!;
    expect(fakeOut.version_group_details).toEqual([
      {
        level_learned_at: 0,
        version_group: { name: "scarlet-violet", url: "/version-group/scarlet-violet" },
        move_learn_method: { name: "egg", url: "/move-learn-method/egg" },
      },
    ]);
  });

  it("no añade version-groups en los que la evolución no existía", () => {
    const current = [slot("scratch", "level-up", ["scarlet-violet"])];
    const root = [
      slot("counter", "egg", ["gold-silver", "scarlet-violet"]),
      slot("beat-up", "egg", ["gold-silver"]),
    ];

    const merged = mergeInheritedEggMoves(current, root);

    expect(merged.find((m) => m.move.name === "counter")!.version_group_details).toHaveLength(1);
    expect(
      merged
        .find((m) => m.move.name === "counter")!
        .version_group_details.map((d) => d.version_group.name),
    ).toEqual(["scarlet-violet"]);
    expect(merged.some((m) => m.move.name === "beat-up")).toBe(false);
  });

  it("no duplica el movimiento si ya está aprendido en ese juego", () => {
    const current = [slot("fake-out", "machine", ["scarlet-violet"])];
    const root = [slot("fake-out", "egg", ["scarlet-violet"])];

    const merged = mergeInheritedEggMoves(current, root);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.version_group_details).toHaveLength(1);
    expect(merged[0]!.version_group_details[0]!.move_learn_method.name).toBe("machine");
  });

  it("devuelve la misma referencia si no hay nada que añadir", () => {
    const current = [slot("thunder-shock", "level-up", ["scarlet-violet"])];
    const root = [slot("fake-out", "egg", ["sword-shield"])];

    expect(mergeInheritedEggMoves(current, root)).toBe(current);
  });

  it("no muta el learnset original", () => {
    const current = [slot("thunder-shock", "level-up", ["scarlet-violet"])];
    const root = [slot("fake-out", "egg", ["scarlet-violet"])];

    const merged = mergeInheritedEggMoves(current, root);

    expect(current).toHaveLength(1);
    expect(merged).toHaveLength(2);
  });
});
