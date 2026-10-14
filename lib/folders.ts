/**
 * Carpetas para clasificar equipos (jerarquía de hasta `MAX_FOLDER_DEPTH`
 * niveles mediante autorrelación por `parentId`).
 *
 * Helpers puros (sin React ni red): se testean en `lib/folders.test.ts` y los
 * usan tanto el cliente (árbol de navegación) como el servidor (validación).
 */

export const MAX_FOLDER_DEPTH = 3;
export const MAX_FOLDER_NAME_LENGTH = 30;

export interface Folder {
  id: string;
  name: string;
  /** Carpeta padre; `null` = carpeta raíz. */
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export function validateFolderName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "El nombre de la carpeta no puede estar vacío";
  if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    return `El nombre no puede tener más de ${MAX_FOLDER_NAME_LENGTH} caracteres`;
  }
  return null;
}

export function generateFolderId(): string {
  return crypto.randomUUID?.() ?? `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Normaliza un `parentId` vacío/ausente a `null`. */
export function normalizeParentId(parentId: string | null | undefined): string | null {
  return parentId && parentId.length > 0 ? parentId : null;
}

/** Carpeta por id, o `undefined`. */
export function findFolder(folders: Folder[], id: string | null | undefined): Folder | undefined {
  if (!id) return undefined;
  return folders.find((f) => f.id === id);
}

/** Profundidad de una carpeta (raíz = 1). Devuelve 0 si no existe o hay ciclo. */
export function folderDepth(folders: Folder[], id: string): number {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const seen = new Set<string>();
  let depth = 0;
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    depth++;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return depth;
}

/** Hijos directos de una carpeta (o raíces si `parentId` es `null`), ordenados. */
export function folderChildren(folders: Folder[], parentId: string | null): Folder[] {
  return folders
    .filter((f) => normalizeParentId(f.parentId) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** ¿Se puede crear una subcarpeta dentro de `parentId` sin superar el máximo? */
export function canCreateChild(folders: Folder[], parentId: string | null): boolean {
  if (!parentId) return MAX_FOLDER_DEPTH >= 1;
  const depth = folderDepth(folders, parentId);
  return depth > 0 && depth < MAX_FOLDER_DEPTH;
}

/** Altura del subárbol con raíz en `id` (1 si no tiene hijos). */
export function folderHeight(folders: Folder[], id: string): number {
  const children = folderChildren(folders, id);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((c) => folderHeight(folders, c.id)));
}

/** Ids de `id` y todos sus descendientes (incluye el propio id). */
export function folderSubtreeIds(folders: Folder[], id: string): string[] {
  const childrenByParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const key = normalizeParentId(f.parentId);
    const arr = childrenByParent.get(key) ?? [];
    arr.push(f);
    childrenByParent.set(key, arr);
  }

  const result: string[] = [];
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    result.push(current);
    for (const child of childrenByParent.get(current) ?? []) stack.push(child.id);
  }
  return result;
}

/** ¿`candidateId` está dentro del subárbol de `rootId` (incluido él mismo)? */
export function isInSubtree(folders: Folder[], rootId: string, candidateId: string): boolean {
  return folderSubtreeIds(folders, rootId).includes(candidateId);
}

/** Ruta desde la raíz hasta la carpeta indicada (incluida). */
export function folderBreadcrumb(folders: Folder[], id: string | null): Folder[] {
  if (!id) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: Folder[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

/**
 * Valida mover la carpeta `id` bajo `newParentId`.
 * Rechaza ciclos (destino dentro del propio subárbol) y superar el máximo.
 */
export function validateMove(
  folders: Folder[],
  id: string,
  newParentId: string | null,
): string | null {
  const parent = normalizeParentId(newParentId);
  if (parent === id) return "Una carpeta no puede contenerse a sí misma";
  if (parent && !findFolder(folders, parent)) return "Carpeta destino no encontrada";
  if (parent && isInSubtree(folders, id, parent)) {
    return "No se puede mover una carpeta dentro de sí misma";
  }
  const targetDepth = parent ? folderDepth(folders, parent) : 0;
  if (targetDepth + folderHeight(folders, id) > MAX_FOLDER_DEPTH) {
    return `No se pueden superar ${MAX_FOLDER_DEPTH} niveles de carpetas`;
  }
  return null;
}

/**
 * Nueva lista de carpetas tras borrar `id`, subiendo su contenido directo
 * (subcarpetas hijas) al padre. Devuelve `parentId` para reasignar los equipos
 * que estuvieran en `id`.
 */
export function promoteOnDelete(
  folders: Folder[],
  id: string,
): { folders: Folder[]; parentId: string | null } {
  const target = findFolder(folders, id);
  if (!target) return { folders, parentId: null };
  const parentId = normalizeParentId(target.parentId);
  const remaining = folders
    .filter((f) => f.id !== id)
    .map((f) => (normalizeParentId(f.parentId) === id ? { ...f, parentId } : f));
  return { folders: remaining, parentId };
}
