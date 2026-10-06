"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { ItemSprite } from "@/components/pokemon/ItemSprite";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/lib/team";
import { formatPokedexId, capitalize } from "@/lib/pokemon-utils";
import { findItem, itemSlug } from "@/lib/items";

export interface TeamSlotProps {
  /** Miembro asignado al slot, o null si vacío. */
  member: TeamMember | null;
  /** Elimina al Pokémon del slot. */
  onRemove?: ((pokemonId: number) => void) | undefined;
  /** Callback al hacer click en el slot (para selección). */
  onClick?: (() => void) | undefined;
}

/**
 * Slot individual de un equipo (0..5). Muestra el sprite, nombre, #id y el
 * icono del objeto equipado en la esquina, o un placeholder "vacío" si no.
 */
export function TeamSlot({ member, onRemove, onClick }: TeamSlotProps) {
  const t = useTranslations("teams");

  if (!member) {
    return (
      <div className="flex size-28 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30">
        <span className="text-sm text-muted-foreground/50">{t("emptySlot")}</span>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex size-28 flex-col items-center justify-center rounded-lg border bg-card p-1 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 size-5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(member.pokemonId);
          }}
          aria-label={t("removeAria", { name: capitalize(member.name) })}
        >
          <X className="size-3" />
        </Button>
      )}
      {onClick ? (
        <div className="flex flex-col items-center gap-0.5">
          {member.sprite && (
            <Image
              src={member.sprite}
              alt={member.name}
              width={48}
              height={48}
              className="size-12 object-contain"
            />
          )}
          <span className="text-[0.6rem] font-medium leading-tight">{capitalize(member.name)}</span>
          <span className="text-[0.55rem] text-muted-foreground">
            {formatPokedexId(member.pokemonId)}
          </span>
        </div>
      ) : (
        <Link href={`/pokemon/${member.pokemonId}`} className="flex flex-col items-center gap-0.5">
          {member.sprite && (
            <Image
              src={member.sprite}
              alt={member.name}
              width={48}
              height={48}
              className="size-12 object-contain"
            />
          )}
          <span className="text-[0.6rem] font-medium leading-tight">{capitalize(member.name)}</span>
          <span className="text-[0.55rem] text-muted-foreground">
            {formatPokedexId(member.pokemonId)}
          </span>
        </Link>
      )}

      {member.heldItem && (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-background/70 p-px">
          <ItemSprite
            slug={findItem(member.heldItem)?.slug ?? itemSlug(member.heldItem)}
            alt={member.heldItem}
            className="size-6"
          />
        </span>
      )}
    </div>
  );
}
