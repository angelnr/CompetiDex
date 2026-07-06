import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/lib/team";
import { formatPokedexId, capitalize } from "@/lib/pokemon-utils";

export interface TeamSlotProps {
  /** Miembro asignado al slot, o null si vacío. */
  member: TeamMember | null;
  /** Elimina al Pokémon del slot. */
  onRemove?: ((pokemonId: number) => void) | undefined;
}

/**
 * Slot individual de un equipo (0..5). Muestra el sprite, nombre, #id y tipos
 * si está ocupado, o un placeholder "vacío" si no.
 */
export function TeamSlot({ member, onRemove }: TeamSlotProps) {
  if (!member) {
    return (
      <div className="flex size-28 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30">
        <span className="text-sm text-muted-foreground/50">Vacío</span>
      </div>
    );
  }

  return (
    <div className="group relative flex size-28 flex-col items-center justify-center rounded-lg border bg-card p-1">
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 size-5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onRemove(member.pokemonId)}
          aria-label={`Quitar a ${capitalize(member.name)} del equipo`}
        >
          <X className="size-3" />
        </Button>
      )}
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
        <div className="flex gap-0.5">
          {member.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
      </Link>
    </div>
  );
}
