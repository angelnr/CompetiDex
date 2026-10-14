import { describe, expect, it } from "vitest";

import {
  canCreateChild,
  folderBreadcrumb,
  folderChildren,
  folderDepth,
  folderHeight,
  folderSubtreeIds,
  isInSubtree,
  promoteOnDelete,
  validateFolderName,
  validateMove,
  type Folder,
} from "@/lib/folders";

function folder(id: string, name: string, parentId: string | null = null): Folder {
  return { id, name, parentId, createdAt: 0, updatedAt: 0 };
}

// a > b > c  (3 niveles); a > d
const TREE: Folder[] = [
  folder("a", "Alpha"),
  folder("b", "Beta", "a"),
  folder("c", "Gamma", "b"),
  folder("d", "Delta", "a"),
];

describe("validateFolderName", () => {
  it("rechaza vacío y demasiado largo", () => {
    expect(validateFolderName("")).not.toBeNull();
    expect(validateFolderName("   ")).not.toBeNull();
    expect(validateFolderName("x".repeat(31))).not.toBeNull();
    expect(validateFolderName("VGC")).toBeNull();
  });
});

describe("folderDepth", () => {
  it("cuenta niveles desde la raíz", () => {
    expect(folderDepth(TREE, "a")).toBe(1);
    expect(folderDepth(TREE, "b")).toBe(2);
    expect(folderDepth(TREE, "c")).toBe(3);
    expect(folderDepth(TREE, "missing")).toBe(0);
  });
});

describe("canCreateChild", () => {
  it("permite crear hasta 3 niveles", () => {
    expect(canCreateChild(TREE, null)).toBe(true);
    expect(canCreateChild(TREE, "a")).toBe(true);
    expect(canCreateChild(TREE, "b")).toBe(true);
    expect(canCreateChild(TREE, "c")).toBe(false); // ya en el nivel 3
  });
});

describe("folderChildren", () => {
  it("devuelve hijos directos ordenados por nombre", () => {
    expect(folderChildren(TREE, null).map((f) => f.id)).toEqual(["a"]);
    expect(folderChildren(TREE, "a").map((f) => f.id)).toEqual(["b", "d"]);
  });
});

describe("subárbol", () => {
  it("incluye descendientes y detecta pertenencia", () => {
    expect(new Set(folderSubtreeIds(TREE, "a"))).toEqual(new Set(["a", "b", "c", "d"]));
    expect(isInSubtree(TREE, "a", "c")).toBe(true);
    expect(isInSubtree(TREE, "b", "d")).toBe(false);
  });

  it("calcula la altura del subárbol", () => {
    expect(folderHeight(TREE, "a")).toBe(3);
    expect(folderHeight(TREE, "d")).toBe(1);
  });
});

describe("folderBreadcrumb", () => {
  it("devuelve la ruta raíz→carpeta", () => {
    expect(folderBreadcrumb(TREE, "c").map((f) => f.id)).toEqual(["a", "b", "c"]);
    expect(folderBreadcrumb(TREE, null)).toEqual([]);
  });
});

describe("validateMove", () => {
  it("rechaza mover una carpeta dentro de sí misma o su subárbol", () => {
    expect(validateMove(TREE, "a", "b")).not.toBeNull();
    expect(validateMove(TREE, "a", "a")).not.toBeNull();
  });

  it("rechaza superar la profundidad máxima", () => {
    // "d" (altura 1) bajo "b" (profundidad 2) → 3, permitido…; pero "a" (altura 3)
    // no cabe bajo nada.
    expect(validateMove(TREE, "a", null)).toBeNull();
    expect(validateMove(TREE, "b", "d")).not.toBeNull();
  });

  it("permite mover a raíz", () => {
    expect(validateMove(TREE, "b", null)).toBeNull();
  });
});

describe("promoteOnDelete", () => {
  it("sube hijos directos al padre y devuelve el parentId", () => {
    const { folders, parentId } = promoteOnDelete(TREE, "b");
    expect(parentId).toBe("a");
    expect(folders.find((f) => f.id === "c")?.parentId).toBe("a");
    expect(folders.find((f) => f.id === "b")).toBeUndefined();
    // El resto intacto.
    expect(folders.map((f) => f.id).sort()).toEqual(["a", "c", "d"]);
  });
});
