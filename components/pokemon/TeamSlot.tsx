"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { ItemSprite } from "@/components/pokemon/ItemSprite";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/lib/team";
import { formatPokedexId } from "@/lib/pokemon-utils";
import { useLocalizedSpeciesName } from "@/hooks/useLocalizedSpeciesName";
import { findItem, itemSlug } from "@/lib/items";

export interface TeamSlotProps {
  /** Miembro asignado al slot, o null si vacío. */
  member: TeamMember | null;
  /** Elimina al Pokémon del slot. */
  onRemove?: ((pokemonId: number) => void) | undefined;
  /** Callback al hacer click en el slot (para selección). */
  onClick?: (() => void) | undefined;
  /**
   * Variante circular y compacta: solo el sprite, con el objeto equipado en la
   * esquina. Pensada para el editor de equipos, donde el espacio es escaso.
   */
  compact?: boolean;
}

/**
 * Slot individual de un equipo (0..5). Muestra el sprite, nombre, #id y el
 * icono del objeto equipado en la esquina, o un placeholder "vacío" si no.
 */
export function TeamSlot({ member, onRemove, onClick, compact = false }: TeamSlotProps) {
  const t = useTranslations("teams");
  const localizedName = useLocalizedSpeciesName(member?.name);

  if (!member) {
    return (
      <div
        className={
          compact
            ? "flex size-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30"
            : "flex size-28 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30"
        }
        aria-label={compact ? t("emptySlot") : undefined}
      >
        {compact ? (
          <Plus className="size-5 text-muted-foreground/40" aria-hidden />
        ) : (
          <span className="text-sm text-muted-foreground/50">{t("emptySlot")}</span>
        )}
      </div>
    );
  }

  const rootClass = compact
    ? `group relative flex size-16 items-center justify-center rounded-full border bg-card ${onClick ? "cursor-pointer" : ""}`
    : `group relative flex size-28 flex-col items-center justify-center rounded-lg border bg-card p-1 ${onClick ? "cursor-pointer" : ""}`;

  return (
    <div
      className={rootClass}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={compact && onClick ? localizedName : undefined}
      title={compact ? localizedName : undefined}
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
          className={
            compact
              ? "absolute -right-1 -top-1 size-5 rounded-full bg-background/80 opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              : "absolute right-0 top-0 size-5 opacity-0 transition-opacity group-hover:opacity-100"
          }
          onClick={(e) => {
            e.stopPropagation();
            onRemove(member.pokemonId);
          }}
          aria-label={t("removeAria", { name: localizedName })}
        >
          <X className="size-3" />
        </Button>
      )}

      {compact ? (
        member.sprite && (
          <Image
            src={member.sprite}
            alt={localizedName}
            width={48}
            height={48}
            className="size-12 object-contain"
            draggable={false}
            unoptimized
          />
        )
      ) : onClick ? (
        <div className="flex flex-col items-center gap-0.5">
          {member.sprite && (
            <Image
              src={member.sprite}
              alt={member.name}
              width={48}
              height={48}
              className="size-12 object-contain"
              draggable={false}
              unoptimized
            />
          )}
          <span className="text-[0.6rem] font-medium leading-tight">{localizedName}</span>
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
              draggable={false}
              unoptimized
            />
          )}
          <span className="text-[0.6rem] font-medium leading-tight">{localizedName}</span>
          <span className="text-[0.55rem] text-muted-foreground">
            {formatPokedexId(member.pokemonId)}
          </span>
        </Link>
      )}

      {member.heldItem && (
        <span
          className={
            compact
              ? "absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5 shadow-sm"
              : "absolute bottom-0.5 right-0.5 rounded bg-background/70 p-px"
          }
        >
          <ItemSprite
            slug={findItem(member.heldItem)?.slug ?? itemSlug(member.heldItem)}
            alt={member.heldItem}
            className={compact ? "size-4" : "size-6"}
          />
        </span>
      )}
    </div>
  );
}
