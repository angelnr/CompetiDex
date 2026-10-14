"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpeciesPicker } from "@/components/calc/SpeciesPicker";
import { MoveSelect } from "@/components/calc/MoveSelect";
import { ItemPicker } from "@/components/pokemon/ItemPicker";
import { NATURES, type StatKey } from "@/lib/natures";
import type { StatSpread } from "@/lib/team";
import { useAbilities, useNatures, usePokemonCatalog } from "@/lib/queries";
import { getPixelSpriteById, formatPokedexId, getName } from "@/lib/pokemon-utils";
import { titleCase } from "@/lib/calc/convert";
import { BOOST_STATS, effectiveStat } from "@/lib/calc/stages";
import type { CalcPokemonInput, Level } from "@/lib/calc/types";
import { cn } from "@/lib/utils";

export interface CalcStatsShape {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface CalcSetPanelProps {
  side: "attacker" | "defender";
  input: CalcPokemonInput;
  stats: CalcStatsShape | null;
  abilities: string[];
  level: Level;
  onChange: (patch: Partial<CalcPokemonInput>) => void;
}

const STAT_ROWS: { key: keyof CalcStatsShape; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "Atk" },
  { key: "def", label: "Def" },
  { key: "spa", label: "SpA" },
  { key: "spd", label: "SpD" },
  { key: "spe", label: "Spe" },
];

/** Mapa stat corta → clave de StatSpread (para leer el boost correspondiente). */
const BOOST_BY_STAT: Record<keyof CalcStatsShape, keyof StatSpread> = {
  hp: "hp",
  atk: "attack",
  def: "defense",
  spa: "special-attack",
  spd: "special-defense",
  spe: "speed",
};

const STAT_KEYS: StatKey[] = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
];

const SHORT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "Spe",
};

function abilityKebab(displayName: string): string {
  return displayName.replace(/\s+/g, "-").toLowerCase();
}

/**
 * Panel de set de un lado (atacante o defensor): especie con sprite, stats
 * calculados al nivel seleccionado, naturaleza, habilidad, objeto, IVs/EVs y
 * 4 movimientos.
 */
export function CalcSetPanel({
  side,
  input,
  stats,
  abilities,
  level,
  onChange,
}: CalcSetPanelProps) {
  const t = useTranslations("calc");
  const { data: catalog } = usePokemonCatalog();
  const spriteId = input.species
    ? (catalog?.find((e) => e.name === input.species)?.id ?? null)
    : null;

  const locale = useLocale();
  const natureQueries = useNatures(NATURES.map((n) => n.name));
  const abilitySlugs = abilities.filter((a) => a !== "---").map(abilityKebab);
  const abilityQueries = useAbilities(abilitySlugs);

  const natureLabel = (slug: string, index: number): string => {
    const data = natureQueries[index]?.data;
    return data ? getName(data.names, data.name, locale) : titleCase(slug);
  };

  const abilityOptions = abilitySlugs.map((slug, index) => ({
    value: slug,
    label: abilityQueries[index]?.data
      ? getName(abilityQueries[index]!.data!.names, abilityQueries[index]!.data!.name, locale)
      : titleCase(slug),
  }));

  return (
    <section
      className={cn("rounded-lg border bg-card p-4", side === "attacker" && "border-primary/40")}
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {side === "attacker" ? t("attacker") : t("defender")}
        <span className="text-xs font-normal text-muted-foreground">Lv {level}</span>
      </h3>

      {/* Especie */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted/30">
          {spriteId ? (
            <Image
              src={getPixelSpriteById(spriteId)}
              alt=""
              width={56}
              height={56}
              className="object-contain"
              unoptimized
            />
          ) : (
            <span className="text-[0.6rem] text-muted-foreground/50">?</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <SpeciesPicker value={input.species} onChange={(s) => onChange({ species: s })} />
          {spriteId && (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              {formatPokedexId(spriteId)}
            </p>
          )}
        </div>
      </div>

      {/* Naturaleza */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium">{t("nature")}</label>
        <Select value={input.nature} onValueChange={(value) => onChange({ nature: value })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NATURES.map((n, i) => (
              <SelectItem key={n.name} value={n.name}>
                {natureLabel(n.name, i)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Habilidad */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium">{t("ability")}</label>
        <Select
          value={input.ability ?? ""}
          onValueChange={(value) => onChange({ ability: value || null })}
          disabled={abilityOptions.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("abilityPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {abilityOptions.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Objeto */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium">{t("heldItem")}</label>
        <ItemPicker
          value={input.item}
          onChange={(item) => onChange({ item: item?.name ?? null })}
        />
      </div>

      {/* Stats calculadas */}
      {stats && (
        <div className="mb-3 grid grid-cols-6 gap-1 rounded-md border bg-muted/30 p-2">
          {STAT_ROWS.map((s) => {
            const stage = input.boosts?.[BOOST_BY_STAT[s.key]] ?? 0;
            const value = stage !== 0 ? effectiveStat(stats[s.key], stage) : stats[s.key];
            return (
              <div key={s.key} className="text-center">
                <span className="block text-[9px] uppercase text-muted-foreground">{s.label}</span>
                <span
                  className={cn(
                    "block text-xs font-semibold tabular-nums",
                    stage > 0 && "text-emerald-500",
                    stage < 0 && "text-red-500",
                  )}
                >
                  {value}
                </span>
                {stage !== 0 && (
                  <span className="block text-[8px] leading-none text-muted-foreground">
                    {stage > 0 ? `+${stage}` : stage}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* IVs */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium">{t("ivs")}</label>
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_KEYS.map((k) => (
            <div key={k}>
              <span className="block text-center text-[9px] text-muted-foreground">
                {SHORT_LABELS[k]}
              </span>
              <Input
                type="number"
                min={0}
                max={31}
                value={input.ivs[k]}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) {
                    onChange({
                      ivs: { ...input.ivs, [k]: Math.min(Math.max(n, 0), 31) },
                    });
                  }
                }}
                className="h-8 text-center text-xs"
                aria-label={`IV ${SHORT_LABELS[k]}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* EVs */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium">{t("evs")}</label>
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_KEYS.map((k) => (
            <div key={k}>
              <span className="block text-center text-[9px] text-muted-foreground">
                {SHORT_LABELS[k]}
              </span>
              <Input
                type="number"
                min={0}
                max={252}
                value={input.evs[k]}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) {
                    onChange({
                      evs: { ...input.evs, [k]: Math.min(Math.max(n, 0), 252) },
                    });
                  }
                }}
                className="h-8 text-center text-xs"
                aria-label={`EV ${SHORT_LABELS[k]}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Buffs / debuffs (-6…+6) */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium">{t("boosts")}</label>
        <div className="grid grid-cols-5 gap-1.5">
          {BOOST_STATS.map((k) => (
            <div key={k}>
              <span className="block text-center text-[9px] text-muted-foreground">
                {SHORT_LABELS[k]}
              </span>
              <Input
                type="number"
                min={-6}
                max={6}
                value={input.boosts[k]}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) {
                    onChange({ boosts: { ...input.boosts, [k]: Math.min(Math.max(n, -6), 6) } });
                  }
                }}
                className="h-8 text-center text-xs"
                aria-label={`Boost ${SHORT_LABELS[k]}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Movimientos */}
      <div>
        <label className="mb-1 block text-xs font-medium">{t("moves")}</label>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => {
            const moves = [...input.moves];
            return (
              <MoveSelect
                key={i}
                label={t("moveLabel", { slot: i + 1 })}
                value={moves[i] ?? null}
                onChange={(slug) => {
                  const next = [...input.moves];
                  next[i] = slug;
                  onChange({ moves: next });
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
