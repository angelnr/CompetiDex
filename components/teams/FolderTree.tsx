"use client";

import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { canCreateChild, folderChildren, type Folder } from "@/lib/folders";
import { cn } from "@/lib/utils";

/** Selección de "todos los equipos" (frente a `null` = sin carpeta / raíz). */
export const ALL_FOLDERS = "__all__";

export interface FolderTreeProps {
  folders: Folder[];
  current: string | null;
  /** Nº de equipos por clave de carpeta (`""` = raíz). */
  counts: Record<string, number>;
  onSelect: (id: string | null) => void;
  onCreateChild: (parentId: string) => void;
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
}

function FolderNode({
  folder,
  depth,
  folders,
  current,
  counts,
  onSelect,
  onCreateChild,
  onRename,
  onDelete,
}: { folder: Folder; depth: number } & Omit<FolderTreeProps, "folders" | "current" | "counts"> & {
    folders: Folder[];
    current: string | null;
    counts: Record<string, number>;
  }) {
  const t = useTranslations("teams");
  const children = folderChildren(folders, folder.id);
  const selected = current === folder.id;
  const count = counts[folder.id] ?? 0;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1",
          selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <button
          type="button"
          onClick={() => onSelect(folder.id)}
          aria-current={selected ? "true" : undefined}
          className="min-w-0 flex-1 truncate px-2 py-1 text-left text-sm"
        >
          {folder.name}
          {count > 0 && <span className="ml-1 text-xs text-muted-foreground">({count})</span>}
        </button>
        {canCreateChild(folders, folder.id) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
            onClick={() => onCreateChild(folder.id)}
            aria-label={t("newSubfolder")}
            title={t("newSubfolder")}
          >
            <FolderPlus className="size-3" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
          onClick={() => onRename(folder)}
          aria-label={t("renameFolderAria", { name: folder.name })}
          title={t("renameFolder")}
        >
          <Pencil className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
          onClick={() => onDelete(folder)}
          aria-label={t("deleteFolderAria", { name: folder.name })}
          title={t("deleteFolder")}
        >
          <Trash2 className="size-3 text-destructive" />
        </Button>
      </div>

      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              folders={folders}
              current={current}
              counts={counts}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Árbol lateral de carpetas (expandido; máx. 3 niveles). */
export function FolderTree({
  folders,
  current,
  counts,
  onSelect,
  onCreateChild,
  onRename,
  onDelete,
}: FolderTreeProps) {
  const t = useTranslations("teams");
  const roots = folderChildren(folders, null);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <nav aria-label={t("foldersTitle")} className="space-y-1">
      <ul className="space-y-0.5">
        <li>
          <div
            className={cn(
              "flex items-center gap-1 rounded-md pr-1",
              current === ALL_FOLDERS ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(ALL_FOLDERS)}
              className="min-w-0 flex-1 truncate px-2 py-1 text-left text-sm font-medium"
            >
              {t("allTeams")}
              {total > 0 && <span className="ml-1 text-xs text-muted-foreground">({total})</span>}
            </button>
          </div>
        </li>
        <li>
          <div
            className={cn(
              "flex items-center gap-1 rounded-md pr-1",
              current === null ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="min-w-0 flex-1 truncate px-2 py-1 text-left text-sm"
            >
              {t("noFolder")}
              {(counts[""] ?? 0) > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({counts[""]})</span>
              )}
            </button>
          </div>
        </li>
      </ul>

      {roots.length > 0 && (
        <ul className="space-y-0.5">
          {roots.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              depth={0}
              folders={folders}
              current={current}
              counts={counts}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </nav>
  );
}
