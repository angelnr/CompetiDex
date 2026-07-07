"use client";

import { useMemo } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamMember, TeamMemberPatch } from "@/lib/team";
import { STAT_KEYS, MAX_EV_TOTAL, totalEvs } from "@/lib/team";
import type { Pokemon } from "@/lib/pokeapi";
import { capitalize, formatPokedexId, getPixelSpriteById } from "@/lib/pokemon-utils";
import { NATURES } from "@/lib/natures";

export interface TeamMemberEditorProps {
  member: TeamMember;
  pokemon: Pokemon;
  onChange: (patch: TeamMemberPatch) => void;
  onRemove: () => void;
}

const STAT_LABEL_KEYS: Record<string, string> = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
};

const MAX_EV_PER_STAT = 252;

export function TeamMemberEditor({ member, pokemon, onChange, onRemove }: TeamMemberEditorProps) {
  const t = useTranslations("teams.member");
  const tTeams = useTranslations("teams");
  const evTotal = totalEvs(
    member.evs ?? {
      hp: 0,
      attack: 0,
      defense: 0,
      "special-attack": 0,
      "special-defense": 0,
      speed: 0,
    },
  );
  const evOver = evTotal > MAX_EV_TOTAL;

  const abilities = useMemo(
    () =>
      pokemon.abilities.map((a) => ({
        name: a.ability.name,
        is_hidden: a.is_hidden,
      })),
    [pokemon.abilities],
  );

  const availableMoves = useMemo(() => {
    const seen = new Set<string>();
    return pokemon.moves
      .map((m) => m.move.name)
      .filter((name) => {
        const lower = name.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      })
      .sort();
  }, [pokemon.moves]);

  const patch = (p: TeamMemberPatch) => onChange(p);

  const handleLevel = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n)) patch({ level: Math.min(Math.max(n, 1), 100) });
  };

  const handleIV = (stat: string, val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return;
    const clamped = Math.min(Math.max(n, 0), 31);
    patch({ ivs: { ...member.ivs!, [stat]: clamped } });
  };

  const handleEV = (stat: string, val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return;
    const clamped = Math.min(Math.max(n, 0), MAX_EV_PER_STAT);
    patch({ evs: { ...member.evs!, [stat]: clamped } });
  };

  const handleMove = (index: number, value: string) => {
    const moves = [...(member.moves ?? [])];
    moves[index] = value;
    patch({ moves });
  };

  const removeMove = (index: number) => {
    const moves = [...(member.moves ?? [])];
    moves.splice(index, 1);
    patch({ moves });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      {/* ── Cabecera ── */}
      <div className="flex items-center gap-3">
        <Image
          src={getPixelSpriteById(member.pokemonId)}
          alt={member.name}
          width={48}
          height={48}
          className="size-12 shrink-0 object-contain"
        />
        <div className="flex-1">
          <span className="font-semibold">{capitalize(member.name)}</span>
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            {formatPokedexId(member.pokemonId)}
          </span>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onRemove}
          aria-label={tTeams("removeAria", { name: capitalize(member.name) })}
        >
          <X className="mr-1 size-4" />
          {tTeams("removeMember")}
        </Button>
      </div>

      {/* ── Nivel ── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium">{t("level")}</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={member.level ?? 100}
            onChange={(e) => handleLevel(e.target.value)}
            aria-label={t("level")}
          />
        </div>

        {/* ── Objeto equipado ── */}
        <div>
          <label className="mb-1 block text-xs font-medium">{t("heldItem")}</label>
          <Input
            type="text"
            value={member.heldItem ?? ""}
            onChange={(e) => patch({ heldItem: e.target.value || null })}
            placeholder={t("heldItemPlaceholder")}
            aria-label={t("heldItem")}
          />
        </div>
      </div>

      {/* ── Habilidad ── */}
      <div>
        <label className="mb-1 block text-xs font-medium">{t("ability")}</label>
        <Select
          value={member.ability ?? ""}
          onValueChange={(val) => patch({ ability: val || null })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("abilityPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {abilities.map((a) => (
              <SelectItem key={a.name} value={a.name}>
                {capitalize(a.name.replace(/-/g, " "))}
                {a.is_hidden && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {t("hidden")}
                  </Badge>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Naturaleza ── */}
      <div>
        <label className="mb-1 block text-xs font-medium">{t("nature")}</label>
        <Select value={member.nature ?? "hardy"} onValueChange={(val) => patch({ nature: val })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NATURES.map((n) => (
              <SelectItem key={n.name} value={n.name}>
                {n.nameEs} ({capitalize(n.name)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── IVs ── */}
      <div>
        <label className="mb-1 block text-xs font-medium">{t("ivs")}</label>
        <div className="grid grid-cols-6 gap-2">
          {STAT_KEYS.map((k) => (
            <div key={k}>
              <span className="block text-center text-[10px] text-muted-foreground">
                {STAT_LABEL_KEYS[k]}
              </span>
              <Input
                type="number"
                min={0}
                max={31}
                value={member.ivs?.[k] ?? 31}
                onChange={(e) => handleIV(k, e.target.value)}
                className="h-8 text-center text-xs"
                aria-label={`IV ${k}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── EVs ── */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium">{t("evs")}</label>
          <span
            className={`text-xs ${evOver ? "font-bold text-destructive" : "text-muted-foreground"}`}
          >
            {evTotal}/{MAX_EV_TOTAL}
          </span>
        </div>
        {evOver && <p className="mb-1 text-[10px] text-destructive">{t("evOver")}</p>}
        <div className="grid grid-cols-6 gap-2">
          {STAT_KEYS.map((k) => (
            <div key={k}>
              <span className="block text-center text-[10px] text-muted-foreground">
                {STAT_LABEL_KEYS[k]}
              </span>
              <Input
                type="number"
                min={0}
                max={MAX_EV_PER_STAT}
                value={member.evs?.[k] ?? 0}
                onChange={(e) => handleEV(k, e.target.value)}
                className="h-8 text-center text-xs"
                aria-label={`EV ${k}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Movimientos ── */}
      <div>
        <label className="mb-1 block text-xs font-medium">{t("moves")}</label>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => {
            const moveVal = member.moves?.[i] ?? "";
            return (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={moveVal}
                  onChange={(e) => handleMove(i, e.target.value)}
                  placeholder={t("movePlaceholder")}
                  list={`move-list-${member.pokemonId}`}
                  className="flex-1"
                  aria-label={t("moveLabel", { slot: i + 1 })}
                />
                {moveVal && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => removeMove(i)}
                    aria-label={t("removeMove")}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            );
          })}
          <datalist id={`move-list-${member.pokemonId}`}>
            {availableMoves.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}
