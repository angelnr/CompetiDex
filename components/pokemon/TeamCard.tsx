"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Check, FolderInput, Pencil, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Team } from "@/lib/team";
import { teamTypes } from "@/lib/team";

export interface TeamCardProps {
  team: Team;
  onDelete?: ((id: string) => void) | undefined;
  onRename?:
    | ((id: string, name: string) => Promise<{ ok: true } | { ok: false; error: string }>)
    | undefined;
  onMove?: ((id: string) => void) | undefined;
}

/**
 * Card resumen de un equipo: nombre (editable), slots con sprites pequeños y
 * tipos únicos. Las acciones (renombrar, mover, borrar) viven en la cabecera,
 * fuera del `<Link>`, para no anidar interactivos.
 */
export function TeamCard({ team, onDelete, onRename, onMove }: TeamCardProps) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const types = teamTypes(team.members);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(team.name);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(team.name);
    setError(null);
    setEditing(true);
  };

  const commit = async () => {
    if (!onRename) return;
    const result = await onRename(team.id, draft);
    if (result.ok) {
      setEditing(false);
      setError(null);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="group relative rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commit();
                  if (e.key === "Escape") setEditing(false);
                }}
                maxLength={30}
                autoFocus
                aria-label={t("renameAria", { name: team.name })}
                className="h-7 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => void commit()}
                aria-label={tc("save")}
              >
                <Check className="size-3 text-primary" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => setEditing(false)}
                aria-label={tc("cancel")}
              >
                <X className="size-3" />
              </Button>
            </div>
          ) : (
            <h3 className="truncate text-sm font-semibold">{team.name}</h3>
          )}
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-muted-foreground">{team.members.length}/6</span>
          {onRename && !editing && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={startEdit}
              aria-label={t("renameAria", { name: team.name })}
            >
              <Pencil className="size-3" />
            </Button>
          )}
          {onMove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => onMove(team.id)}
              aria-label={t("moveAria", { name: team.name })}
            >
              <FolderInput className="size-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => onDelete(team.id)}
              aria-label={t("removeAria", { name: team.name })}
            >
              <Trash2 className="size-3 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <Link href={`/equipos/${team.id}`} className="mt-3 flex flex-col gap-3">
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => {
            const member = team.members.find((m) => m.slot === i);
            return (
              <div
                key={i}
                className="flex size-14 items-center justify-center overflow-hidden rounded-md border bg-muted/30"
              >
                {member?.sprite ? (
                  <Image
                    src={member.sprite}
                    alt={member.name}
                    width={48}
                    height={48}
                    className="size-12 object-contain"
                  />
                ) : (
                  <span className="text-[0.5rem] text-muted-foreground/50">#{i + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        {types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {types.map((ty) => (
              <TypeBadge key={ty} type={ty} />
            ))}
          </div>
        )}
      </Link>
    </div>
  );
}
