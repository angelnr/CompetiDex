"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTeams } from "@/hooks/useTeams";
import { capitalize } from "@/lib/pokemon-utils";
import type { TeamMember } from "@/lib/team";
import { TeamSlot } from "@/components/pokemon/TeamSlot";

export interface AddToTeamButtonProps {
  pokemonId: number;
  name: string;
  sprite: string | null;
  types: string[];
}

/**
 * Botón "Añadir a equipo" en la ficha del Pokémon.
 * Al hacer clic abre un Dialog con los equipos existentes y permite
 * elegir en cuál añadirlo.
 */
export function AddToTeamButton({ pokemonId, name, sprite, types }: AddToTeamButtonProps) {
  const [open, setOpen] = useState(false);
  const { teams, createTeam, addPokemon, removePokemon } = useTeams();
  const [newTeamName, setNewTeamName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const member: Omit<TeamMember, "slot"> = {
    pokemonId,
    name,
    sprite,
    types,
  };

  const handleAdd = async (teamId: string) => {
    setStatus(null);
    const result = await addPokemon(teamId, member);
    if (result.ok) {
      setStatus(`✓ ${capitalize(name)} añadido`);
    } else {
      setStatus(result.error);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newTeamName.trim()) return;
    const created = createTeam(newTeamName);
    if (created.ok) {
      setNewTeamName("");
      await handleAdd(created.team.id);
    } else {
      setStatus(created.error);
    }
  };

  const activeMembers = (teamId: string) => teams.find((t) => t.id === teamId)?.members ?? [];

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Añadir a equipo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir {capitalize(name)} a un equipo</DialogTitle>
          </DialogHeader>

          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aún no tienes equipos. Crea uno para empezar.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{team.name}</span>
                  {activeMembers(team.id).length > 0 && (
                    <div className="flex -space-x-2">
                      {activeMembers(team.id)
                        .slice(0, 3)
                        .map((m) => (
                          <div
                            key={m.slot}
                            className="size-6 overflow-hidden rounded-full border-2 border-background"
                          >
                            {m.sprite && (
                              <Image
                                src={m.sprite}
                                alt=""
                                width={24}
                                height={24}
                                className="size-full object-contain"
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {activeMembers(team.id).length}/6
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={activeMembers(team.id).length >= 6}
                    onClick={() => handleAdd(team.id)}
                  >
                    Añadir
                  </Button>
                  {activeMembers(team.id).some((m) => m.pokemonId === pokemonId) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removePokemon(team.id, pokemonId)}
                    >
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t pt-3">
            <input
              type="text"
              placeholder="Nuevo equipo…"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              maxLength={30}
            />
            <Button
              type="button"
              size="sm"
              disabled={!newTeamName.trim()}
              onClick={handleCreateAndAdd}
            >
              + Crear
            </Button>
          </div>

          {status && <p className="text-sm text-muted-foreground">{status}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
