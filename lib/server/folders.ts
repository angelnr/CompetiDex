import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { MAX_FOLDER_DEPTH, validateFolderName, type Folder } from "@/lib/folders";

export class FolderOwnershipError extends Error {
  constructor() {
    super("Carpeta no encontrada");
    this.name = "FolderOwnershipError";
  }
}

export class FolderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FolderValidationError";
  }
}

type FolderRow = Prisma.FolderGetPayload<Record<string, never>>;

export function toFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId ?? null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export async function listFolders(userId: string): Promise<Folder[]> {
  const rows = await prisma.folder.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return rows.map(toFolder);
}

/** Mapa id→profundidad (raíz = 1) a partir de las filas del usuario. */
function depthMap(rows: FolderRow[]): Map<string, number> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const memo = new Map<string, number>();

  const depthOf = (id: string): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const seen = new Set<string>();
    let depth = 0;
    let current: FolderRow | undefined = byId.get(id);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      depth++;
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    memo.set(id, depth);
    return depth;
  };

  const map = new Map<string, number>();
  for (const row of rows) map.set(row.id, depthOf(row.id));
  return map;
}

/** Altura del subárbol con raíz en `id` (1 si no tiene hijas). */
function heightOf(rows: FolderRow[], id: string): number {
  const children = rows.filter((r) => r.parentId === id);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((c) => heightOf(rows, c.id)));
}

/** Ids de `id` y sus descendientes, para detectar ciclos al mover. */
function subtreeIds(rows: FolderRow[], id: string): Set<string> {
  const byParent = new Map<string | null, FolderRow[]>();
  for (const row of rows) {
    const key = row.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(row);
    byParent.set(key, arr);
  }
  const result = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    for (const child of byParent.get(current) ?? []) stack.push(child.id);
  }
  return result;
}

/**
 * Crea o actualiza una carpeta. Valida nombre, pertenencia del padre, ciclos y
 * que no se superen los `MAX_FOLDER_DEPTH` niveles.
 */
export async function saveFolder(userId: string, folder: Folder): Promise<Folder> {
  const nameError = validateFolderName(folder.name);
  if (nameError) throw new FolderValidationError(nameError);

  const rows = await prisma.folder.findMany({ where: { userId } });
  const existing = rows.find((r) => r.id === folder.id);
  const parentId = folder.parentId && folder.parentId.length > 0 ? folder.parentId : null;

  if (parentId) {
    const parent = rows.find((r) => r.id === parentId);
    if (!parent) throw new FolderValidationError("Carpeta padre no encontrada");
    if (parentId === folder.id)
      throw new FolderValidationError("Una carpeta no puede contenerse a sí misma");
  }

  if (existing) {
    // Comprueba ciclos: el nuevo padre no puede estar dentro del propio subárbol.
    if (parentId && subtreeIds(rows, folder.id).has(parentId)) {
      throw new FolderValidationError("No se puede mover una carpeta dentro de sí misma");
    }
    const depths = depthMap(rows);
    const targetDepth = parentId ? (depths.get(parentId) ?? 0) : 0;
    if (targetDepth + heightOf(rows, folder.id) > MAX_FOLDER_DEPTH) {
      throw new FolderValidationError(
        `No se pueden superar ${MAX_FOLDER_DEPTH} niveles de carpetas`,
      );
    }
  } else if (parentId) {
    const depths = depthMap(rows);
    if ((depths.get(parentId) ?? 0) + 1 > MAX_FOLDER_DEPTH) {
      throw new FolderValidationError(
        `No se pueden superar ${MAX_FOLDER_DEPTH} niveles de carpetas`,
      );
    }
  }

  const data = {
    name: folder.name.trim(),
    parentId,
  };

  const saved = existing
    ? await prisma.folder.update({ where: { id: folder.id }, data })
    : await prisma.folder.create({
        data: {
          id: folder.id,
          userId,
          ...data,
          createdAt: new Date(folder.createdAt ?? Date.now()),
        },
      });

  return toFolder(saved);
}

/**
 * Borra una carpeta subiendo su contenido directo al padre: las subcarpetas
 * hijas y los equipos de la carpeta pasan a `parentId`.
 */
export async function deleteFolder(userId: string, id: string): Promise<void> {
  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder || folder.userId !== userId) throw new FolderOwnershipError();

  const parentId = folder.parentId ?? null;

  await prisma.$transaction([
    prisma.folder.updateMany({ where: { parentId: id, userId }, data: { parentId } }),
    prisma.team.updateMany({ where: { folderId: id, userId }, data: { folderId: parentId } }),
    prisma.folder.delete({ where: { id } }),
  ]);
}
