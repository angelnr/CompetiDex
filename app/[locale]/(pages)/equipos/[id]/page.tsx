"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

import { SearchBar } from "@/components/pokemon/SearchBar";
import { TeamSlot } from "@/components/pokemon/TeamSlot";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { useTeams } from "@/hooks/useTeams";
import { teamTypes } from "@/lib/team";

export default function TeamEditorPage() {
  const t = useTranslations("teams");
  const tNav = useTranslations("nav");
  const tSearch = useTranslations("search");
  const params = useParams();
  const teamId = params?.id as string | undefined;
  const { teams, loaded, addPokemon, removePokemon } = useTeams();
  const [search, setSearch] = useState("");

  const team = teams.find((t) => t.id === teamId);

  const types = team ? teamTypes(team.members) : [];

  const handleAddById = useCallback(
    async (pokemonId: number) => {
      if (!team) return;
      // Fetch básico desde el proxy para obtener sprite + tipos
      const res = await fetch(`/api/pokemon?id=${pokemonId}`);
      if (!res.ok) return;
      const data: {
        name: string;
        sprites: { front_default: string | null };
        types: { type: { name: string } }[];
      } = await res.json();
      await addPokemon(team.id, {
        pokemonId,
        name: data.name,
        sprite: data.sprites.front_default,
        types: data.types.map((t) => t.type.name),
      });
    },
    [team, addPokemon],
  );

  if (!loaded) {
    return (
      <main className="container mx-auto py-10">
        <p className="text-muted-foreground">{t("loading")}</p>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="container mx-auto py-10">
        <p className="text-muted-foreground">
          {t("notFound")}
          <Link href="/equipos" className="underline">
            {t("backToTeams")}
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl py-10">
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/equipos">
              <ArrowLeft className="size-4" />
              {tNav("teams")}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{team.name}</h1>
        </div>

        {types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>
        )}
      </div>

      {/* Slots del equipo */}
      <section className="mb-8 rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t("members", { count: team.members.length })}
        </h2>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 6 }).map((_, i) => {
            const member = team.members.find((m) => m.slot === i);
            return (
              <TeamSlot
                key={i}
                member={member ?? null}
                onRemove={member ? (id) => void removePokemon(team.id, id) : undefined}
              />
            );
          })}
        </div>
      </section>

      {/* Buscador para añadir */}
      {team.members.length < 6 && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("addPokemon")}</h2>
          <SearchBar
            showSprite
            onSelect={handleAddById}
            excludeIds={team.members.map((m) => m.pokemonId)}
            placeholderKey="forTeamPlaceholder"
            ariaKey="forTeamAria"
          />
        </section>
      )}
    </main>
  );
}
