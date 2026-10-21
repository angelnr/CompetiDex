import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock se hoistea: el mock debe crearse con vi.hoisted.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    folder: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { saveFolder, FolderLimitError } from "@/lib/server/folders";
import { MAX_FOLDERS_PER_USER } from "@/lib/folders";

const newFolder = {
  id: "nueva",
  name: "Nueva carpeta",
  parentId: null,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveFolder", () => {
  it("rechaza crear una carpeta si se alcanzó el límite por usuario", async () => {
    prismaMock.folder.findMany.mockResolvedValueOnce(
      Array.from({ length: MAX_FOLDERS_PER_USER }, (_, i) => ({
        id: `f${i}`,
        userId: "user-1",
        name: `Carpeta ${i}`,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );

    await expect(saveFolder("user-1", newFolder)).rejects.toBeInstanceOf(FolderLimitError);
  });

  it("permite crear mientras no se alcance el límite", async () => {
    prismaMock.folder.findMany.mockResolvedValueOnce([]);

    // Sin mock de create, el fallo esperado es de Prisma, nunca el de límite.
    await expect(saveFolder("user-1", newFolder)).rejects.not.toBeInstanceOf(FolderLimitError);
  });
});
