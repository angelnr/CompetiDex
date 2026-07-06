"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { TeamCard } from "@/components/pokemon/TeamCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeams } from "@/hooks/useTeams";

export default function EquiposPage() {
  const { teams, loaded, createTeam, deleteTeam } = useTeams();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    const result = createTeam(newName);
    if (result.ok) {
      setNewName("");
    } else {
      setError(result.error);
    }
  };

  return (
    <main className="container mx-auto py-10">
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Mis Equipos</h1>
        <p className="text-muted-foreground">Crea y gestiona equipos de hasta 6 Pokémon.</p>

        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Nombre del equipo…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            maxLength={30}
            className="max-w-xs"
            aria-label="Nombre del nuevo equipo"
          />
          <Button type="button" disabled={!newName.trim()} onClick={handleCreate}>
            <Plus className="size-4" />
            Crear equipo
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Cargando equipos…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no tienes equipos. ¡Crea uno!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} onDelete={(id) => void deleteTeam(id)} />
          ))}
        </div>
      )}
    </main>
  );
}
