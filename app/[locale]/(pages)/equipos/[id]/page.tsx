"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

import { TeamSlot } from "@/components/pokemon/TeamSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { useTeams } from "@/hooks/useTeams";
import { usePokemon, usePokemonInfiniteList } from "@/lib/queries";
import { teamTypes } from "@/lib/team";
import { capitalize, extractIdFromUrl } from "@/lib/pokemon-utils";

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
          <PokemonSearch
            onSelect={handleAddById}
            excludeIds={team.members.map((m) => m.pokemonId)}
          />
        </section>
      )}
    </main>
  );
}

function PokemonSearch({
  onSelect,
  excludeIds,
}: {
  onSelect: (id: number) => Promise<void>;
  excludeIds: number[];
}) {
  const tSearch = useTranslations("search");
  const [query, setQuery] = useState("");
  const { data } = usePokemonInfiniteList(1025);

  const suggestions = useMemo(() => {
    if (!query || !data) return [];
    const q = query.toLowerCase();
    const all = data.pages.flatMap((p) => p.results);
    return all
      .filter((r) => r.name.includes(q) && !excludeIds.includes(extractIdFromUrl(r.url)))
      .slice(0, 8);
  }, [query, data, excludeIds]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tSearch("forTeamPlaceholder")}
          className="pl-9"
          aria-label={tSearch("forTeamAria")}
        />
      </div>

      {suggestions.length > 0 && (
        <ul className="divide-y rounded-md border" role="listbox">
          {suggestions.map((r) => (
            <PokemonSearchItem key={r.name} name={r.name} url={r.url} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PokemonSearchItem({
  name,
  url,
  onSelect,
}: {
  name: string;
  url: string;
  onSelect: (id: number) => Promise<void>;
}) {
  const t = useTranslations("teams");
  const id = extractIdFromUrl(url);
  const { data } = usePokemon(id);
  const [adding, setAdding] = useState(false);

  const handleClick = async () => {
    setAdding(true);
    await onSelect(id);
    setAdding(false);
  };

  return (
    <li>
      <button
        type="button"
        disabled={adding}
        onClick={handleClick}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
      >
        {data?.sprites.front_default && (
          <Image
            src={data.sprites.front_default}
            alt=""
            width={32}
            height={32}
            className="size-8 object-contain"
          />
        )}
        <span className="font-mono text-xs text-muted-foreground">
          #{String(id).padStart(4, "0")}
        </span>
        {capitalize(name)}
        {adding && <span className="ml-auto text-xs text-muted-foreground">{t("adding")}</span>}
      </button>
    </li>
  );
}
