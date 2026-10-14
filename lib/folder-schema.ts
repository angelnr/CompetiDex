import { z } from "zod";

import { MAX_FOLDER_NAME_LENGTH, type Folder } from "@/lib/folders";

export const folderSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(MAX_FOLDER_NAME_LENGTH),
  parentId: z.string().min(1).max(64).nullable().default(null),
  createdAt: z.number().int().positive().optional(),
  updatedAt: z.number().int().positive().optional(),
});

/** Valida el payload de una carpeta y lo normaliza al tipo cliente. */
export function parseFolderPayload(payload: unknown): Folder {
  const parsed = folderSchema.parse(payload);
  return {
    id: parsed.id,
    name: parsed.name,
    parentId: parsed.parentId ?? null,
    createdAt: parsed.createdAt ?? Date.now(),
    updatedAt: parsed.updatedAt ?? Date.now(),
  };
}
