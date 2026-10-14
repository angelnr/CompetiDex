"use client";

import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { folderChildren, type Folder } from "@/lib/folders";
import { cn } from "@/lib/utils";

export interface MoveTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  /** Carpeta actual del equipo (`null` = sin carpeta). */
  currentFolderId: string | null;
  teamName: string;
  onSelect: (folderId: string | null) => void;
}

interface Row {
  id: string | null;
  name: string;
  depth: number;
}

function flatten(folders: Folder[], parentId: string | null, depth: number, out: Row[]): void {
  for (const folder of folderChildren(folders, parentId)) {
    out.push({ id: folder.id, name: folder.name, depth });
    flatten(folders, folder.id, depth + 1, out);
  }
}

/** Diálogo para mover un equipo a una carpeta (o a la raíz). */
export function MoveTeamDialog({
  open,
  onOpenChange,
  folders,
  currentFolderId,
  teamName,
  onSelect,
}: MoveTeamDialogProps) {
  const t = useTranslations("teams");

  const rows: Row[] = [{ id: null, name: t("noFolder"), depth: 0 }];
  flatten(folders, null, 0, rows);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("moveTitle", { name: teamName })}</DialogTitle>
        </DialogHeader>
        <ul className="max-h-72 space-y-0.5 overflow-auto">
          {rows.map((row) => {
            const selected = (row.id ?? null) === (currentFolderId ?? null);
            return (
              <li key={row.id ?? "__root__"}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(row.id);
                    onOpenChange(false);
                  }}
                  aria-current={selected ? "true" : undefined}
                  style={{ paddingLeft: `${8 + row.depth * 12}px` }}
                  className={cn(
                    "w-full truncate rounded-md py-1.5 pr-2 text-left text-sm",
                    selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                  )}
                >
                  {row.name}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
