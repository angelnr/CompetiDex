"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

import { SearchBar } from "@/components/pokemon/SearchBar";
import { TeamSlot } from "@/components/pokemon/TeamSlot";
import { TeamMemberEditor } from "@/components/pokemon/TeamMemberEditor";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTeams } from "@/hooks/useTeams";
import { usePokemon } from "@/lib/queries";
import { teamTypes } from "@/lib/team";
import { teamToPokepaste } from "@/lib/pokepaste";

export default function TeamEditorPage() {
  const t = useTranslations("teams");
  const tNav = useTranslations("nav");
  const params = useParams();
  const teamId = params?.id as string | undefined;
  const { teams, loaded, addPokemon, removePokemon, updateMember } = useTeams();
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const team = teams.find((t) => t.id === teamId);
  const types = team ? teamTypes(team.members) : [];

  const handleAddById = useCallback(
    async (pokemonId: number) => {
      if (!team) return;
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

  const activeMember = useMemo(() => {
    if (activeSlot === null || !team) return null;
    return team.members.find((m) => m.slot === activeSlot) ?? null;
  }, [activeSlot, team]);

  const { data: activePokemon } = usePokemon(activeMember?.pokemonId);

  const handleCopyPaste = useCallback(async () => {
    if (!team) return;
    const paste = teamToPokepaste(team);
    await navigator.clipboard.writeText(paste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [team]);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/equipos">
                <ArrowLeft className="size-4" />
                {tNav("teams")}
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{team.name}</h1>
          </div>

          {/* ── Botón Exportar ── */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-1 size-4" />
                {t("export")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{t("export")}</DialogTitle>
              </DialogHeader>
              <textarea
                readOnly
                value={teamToPokepaste(team)}
                className="h-80 w-full resize-none rounded-md border bg-muted p-3 font-mono text-xs"
                aria-label={t("export")}
              />
              <Button onClick={handleCopyPaste} className="w-full">
                <Copy className="mr-1 size-4" />
                {copied ? t("copied") : t("copy")}
              </Button>
            </DialogContent>
          </Dialog>
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
            const isActive = activeSlot === i;
            return (
              <div
                key={i}
                className={`rounded-lg transition-all ${isActive ? "ring-2 ring-primary" : ""}`}
              >
                <TeamSlot
                  member={member ?? null}
                  onClick={member ? () => setActiveSlot(isActive ? null : i) : undefined}
                  onRemove={
                    member
                      ? (id) => {
                          removePokemon(team.id, id);
                          setActiveSlot(null);
                        }
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Panel editor del miembro activo */}
      {activeMember && activePokemon && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">
            {t("editMember", { name: activeMember.name })}
          </h2>
          <TeamMemberEditor
            member={activeMember}
            pokemon={activePokemon}
            onChange={(patch) => {
              updateMember(team.id, activeMember.pokemonId, patch);
            }}
            onRemove={() => {
              removePokemon(team.id, activeMember.pokemonId);
              setActiveSlot(null);
            }}
          />
        </section>
      )}

      {/* Buscador para añadir */}
      {team.members.length < 6 && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("addPokemon")}</h2>
          <SearchBar
            showSprite
            onSelect={(id) => {
              handleAddById(id);
              setActiveSlot(null);
            }}
            excludeIds={team.members.map((m) => m.pokemonId)}
            placeholderKey="forTeamPlaceholder"
            ariaKey="forTeamAria"
          />
        </section>
      )}
    </main>
  );
}
