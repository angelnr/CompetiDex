"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Copy, Download, Pencil, Swords, X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

import { SearchBar } from "@/components/pokemon/SearchBar";
import { TeamSlot } from "@/components/pokemon/TeamSlot";
import { TeamMemberEditor } from "@/components/pokemon/TeamMemberEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatSpeciesLabel } from "@/lib/pokemon-utils";
import { cn } from "@/lib/utils";

export default function TeamEditorPage() {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const tNav = useTranslations("nav");
  const params = useParams();
  const teamId = params?.id as string | undefined;
  const { teams, loaded, addPokemon, removePokemon, updateMember, swapPokemonSlots, setChampions, renameTeam } =
    useTeams();
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [dragSlot, setDragSlot] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

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

  const commitName = useCallback(async () => {
    if (!team) return;
    const result = await renameTeam(team.id, nameDraft);
    if (result.ok) setEditingName(false);
  }, [team, renameTeam, nameDraft]);

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
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href="/equipos">
                <ArrowLeft className="size-4" />
                {tNav("teams")}
              </Link>
            </Button>
            {editingName ? (
              <div className="flex min-w-0 items-center gap-1">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  maxLength={30}
                  autoFocus
                  aria-label={t("renameAria", { name: team.name })}
                  className="h-8 max-w-64"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => void commitName()}
                  aria-label={tc("save")}
                >
                  <Check className="size-4 text-primary" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => setEditingName(false)}
                  aria-label={tc("cancel")}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <h1 className="truncate text-xl font-bold sm:text-2xl">{team.name}</h1>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => {
                    setNameDraft(team.name);
                    setEditingName(true);
                  }}
                  aria-label={t("renameAria", { name: team.name })}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:shrink-0">
            <div
              role="radiogroup"
              aria-label={t("formatLabel")}
              className="flex flex-1 items-center gap-1 rounded-lg border bg-muted/50 p-1 sm:flex-none"
            >
              <Swords className="ml-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <button
                type="button"
                role="radio"
                aria-checked={!team.champions}
                onClick={() => setChampions(team.id, false)}
                className={cn(
                  "flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:flex-none",
                  !team.champions
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("standardMode")}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={team.champions}
                onClick={() => setChampions(team.id, true)}
                className={cn(
                  "flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:flex-none",
                  team.champions
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("championsMode")}
              </button>
            </div>

            {/* ── Botón Exportar ── */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
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
        </div>

        {types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>
        )}
      </div>

      {/* Añadir Pokémon: fila propia justo debajo de los tipos. */}
      {team.members.length < 6 && (
        <section className="mb-6 rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">{t("addPokemon")}</h2>
          <div className="max-w-xl">
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
          </div>
        </section>
      )}

      {/* Miembros y editor del miembro activo en la misma fila. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {t("members", { count: team.members.length })}
          </h2>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 6 }).map((_, i) => {
              const member = team.members.find((m) => m.slot === i);
              const isActive = activeSlot === i;
              const isDragging = dragSlot === i;
              const isDragOver = dragOverSlot === i && dragSlot !== i;
              return (
                <div
                  key={i}
                  draggable={!!member}
                  onDragStart={(e) => {
                    if (!member) return;
                    setDragSlot(i);
                    e.dataTransfer.effectAllowed = "move";
                    // Firefox exige setData para iniciar el arrastre.
                    e.dataTransfer.setData("text/plain", String(i));
                  }}
                  onDragOver={(e) => {
                    if (dragSlot === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverSlot !== i) setDragOverSlot(i);
                  }}
                  onDragLeave={() => {
                    if (dragOverSlot === i) setDragOverSlot(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragSlot !== null) void swapPokemonSlots(team.id, dragSlot, i);
                    setDragSlot(null);
                    setDragOverSlot(null);
                  }}
                  onDragEnd={() => {
                    setDragSlot(null);
                    setDragOverSlot(null);
                  }}
                  className={cn(
                    "rounded-lg transition-all",
                    isActive && "ring-2 ring-primary",
                    isDragOver && "bg-muted/60 ring-2 ring-primary/60",
                    isDragging && "opacity-50",
                  )}
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

        {/* Panel editor del miembro activo, junto a los miembros. */}
        {activeMember && activePokemon && (
          <section className="min-w-0 flex-1">
            <h2 className="mb-4 text-lg font-semibold">
              {t("editMember", { name: formatSpeciesLabel(activeMember.name) })}
            </h2>
            <TeamMemberEditor
              member={activeMember}
              pokemon={activePokemon}
              champions={!!team.champions}
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
      </div>
    </main>
  );
}
