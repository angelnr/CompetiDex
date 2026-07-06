import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/team";
import { teamTypes } from "@/lib/team";
import { capitalize } from "@/lib/pokemon-utils";

export interface TeamCardProps {
  team: Team;
  onDelete?: ((id: string) => void) | undefined;
}

/**
 * Card resumen de un equipo: nombre, slots con sprites pequeños y tipos
 * únicos del equipo.
 */
export function TeamCard({ team, onDelete }: TeamCardProps) {
  const types = teamTypes(team.members);

  return (
    <div className="group relative rounded-lg border bg-card p-4">
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 size-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onDelete(team.id)}
          aria-label={`Eliminar equipo ${team.name}`}
        >
          <Trash2 className="size-3 text-destructive" />
        </Button>
      )}

      <Link href={`/equipos/${team.id}`} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{team.name}</h3>
          <span className="text-xs text-muted-foreground">{team.members.length}/6</span>
        </div>

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
            {types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>
        )}
      </Link>
    </div>
  );
}
