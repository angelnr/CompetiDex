"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { X, Plus } from "lucide-react";

import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { TypeCoverageMatrix } from "@/components/pokemon/TypeCoverageMatrix";
import { StatBar } from "@/components/pokemon/StatBar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompareSelection } from "@/hooks/useCompareSelection";
import { useDebounce } from "@/hooks/useDebounce";
import { usePokemon, usePokemonInfiniteList } from "@/lib/queries";
import { compareStats, compareTypes, summarizeAdvantage } from "@/lib/compare";
import { computeDefensiveBreakdownFromTypes } from "@/lib/type-chart";
import {
  capitalize,
  extractIdFromUrl,
  formatHeight,
  formatWeight,
  getOfficialArtwork,
} from "@/lib/pokemon-utils";
import { formatMultiplier } from "@/lib/type-effectiveness";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function PokemonCompare() {
  const t = useTranslations("compare");
  const tc = useTranslations("common");
  const tStats = useTranslations("stats");
  const tSearch = useTranslations("search");
  const { ids, add, remove, clear, isFull } = useCompareSelection();

  if (ids.length === 0) {
    return <EmptyState onAdd={add} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <SlotAdder onAdd={add} disabled={isFull} />
        </div>
        <Button variant="ghost" size="sm" onClick={clear}>
          <X className="mr-1 size-3" />
          {tc("clear")}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((slot) => {
          const id = ids[slot];
          if (!id) return <EmptySlot key={slot} onAdd={add} />;
          return <CompareColumn key={id} id={id} slot={slot} onRemove={remove} />;
        })}
      </div>

      {ids.length === 2 && ids[0] && ids[1] && (
        <>
          <CompareStatsPanel idA={ids[0]} idB={ids[1]} />
          <CompareEffectivenessPanel idA={ids[0]} idB={ids[1]} />
          <div>
            <h3 className="mb-3 text-lg font-semibold">{t("coverageMatrix")}</h3>
            <TypeCoverageMatrix
              columns={[
                { name: `#${ids[0]}`, types: [] },
                { name: `#${ids[1]}`, types: [] },
              ]}
            />
            <p className="mt-2 text-xs text-muted-foreground">{t("coverageHint")}</p>
          </div>
        </>
      )}
    </div>
  );
}

function SlotAdder({ onAdd: add, disabled }: { onAdd: (id: number) => void; disabled: boolean }) {
  const tSearch = useTranslations("search");
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query.trim().toLowerCase(), 300);
  const { data } = usePokemonInfiniteList(1025);

  const suggestions = useMemo(() => {
    if (!debounced || !data) return [];
    const all = data.pages.flatMap((p) => p.results);
    return all
      .filter((r) => r.name.includes(debounced))
      .slice(0, 6)
      .map((r) => ({ name: r.name, url: r.url, id: extractIdFromUrl(r.url) }));
  }, [debounced, data]);

  const submit = (id: number) => {
    add(id);
    setQuery("");
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tSearch("addPlaceholder")}
          className="max-w-xs"
          aria-label={tSearch("addAria")}
          disabled={disabled}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={tSearch("clearAria")}
            className="rounded-sm p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 w-full max-w-xs overflow-hidden rounded-md border bg-popover py-1 shadow-md"
        >
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => submit(s.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  #{String(s.id).padStart(4, "0")}
                </span>
                {capitalize(s.name)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ onAdd: add }: { onAdd: (id: number) => void }) {
  const t = useTranslations("compare");
  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <div className="text-center">
        <Plus className="mx-auto mb-2 size-12 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
      </div>
      <SlotAdder onAdd={add} disabled={false} />
    </div>
  );
}

function EmptySlot({ onAdd: add }: { onAdd: (id: number) => void }) {
  const t = useTranslations("compare");
  return (
    <Card className="flex items-center justify-center p-8">
      <div className="text-center">
        <p className="mb-3 text-sm text-muted-foreground">{t("emptySlot")}</p>
        <SlotAdder onAdd={add} disabled={false} />
      </div>
    </Card>
  );
}

function CompareColumn({
  id,
  slot,
  onRemove,
}: {
  id: number;
  slot: number;
  onRemove: (slot: number) => void;
}) {
  const t = useTranslations("compare");
  const tc = useTranslations("common");
  const tStats = useTranslations("stats");
  const { data: pokemon, isLoading, isError } = usePokemon(id);

  if (isError) {
    return (
      <Card className="flex flex-col items-center justify-center p-6">
        <p className="text-sm text-destructive">{t("loadError", { id })}</p>
        <Button variant="ghost" size="sm" onClick={() => onRemove(slot)} className="mt-2">
          <X className="mr-1 size-3" /> {tc("remove")}
        </Button>
      </Card>
    );
  }

  if (isLoading || !pokemon) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="mx-auto size-32 rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const artwork = getOfficialArtwork(pokemon);
  const effectiveness = computeDefensiveBreakdownFromTypes(pokemon.types.map((t) => t.type.name));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <span className="font-mono text-xs text-muted-foreground">
            #{String(pokemon.id).padStart(4, "0")}
          </span>
          <h3 className="text-lg font-bold">{capitalize(pokemon.name)}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {pokemon.types.map(({ type }) => (
              <TypeBadge key={type.name} type={type.name} size="sm" />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(slot)}
            aria-label={t("removeAria")}
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {artwork && (
          <div className="flex justify-center">
            <Image
              src={artwork}
              alt={capitalize(pokemon.name)}
              width={128}
              height={128}
              className="size-32 object-contain"
            />
          </div>
        )}

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">{tStats("height")}</dt>
            <dd className="font-medium">{formatHeight(pokemon.height)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tStats("weight")}</dt>
            <dd className="font-medium">{formatWeight(pokemon.weight)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tStats("baseExperience")}</dt>
            <dd className="font-medium">{pokemon.base_experience ?? "—"}</dd>
          </div>
        </dl>

        <div>
          <h4 className="mb-2 text-sm font-semibold">{tStats("baseStats")}</h4>
          {pokemon.stats.map((s) => (
            <StatBar key={s.stat.name} statName={s.stat.name} value={s.base_stat} />
          ))}
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">{tStats("effectiveness")}</h4>
          {effectiveness.weaknesses.length > 0 && (
            <div className="mb-1">
              <span className="text-xs text-muted-foreground">{t("weaknesses")}: </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {effectiveness.weaknesses.slice(0, 4).map((w) => (
                  <div key={w.type} className="flex items-center gap-0.5">
                    <TypeBadge type={w.type} size="sm" />
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatMultiplier(w.multiplier)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {effectiveness.immunities.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {effectiveness.immunities.map((t) => (
                <div key={t} className="flex items-center gap-0.5">
                  <TypeBadge type={t} size="sm" />
                  <span className="font-mono text-xs text-muted-foreground">x0</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CompareStatsPanel({ idA, idB }: { idA: number; idB: number }) {
  const t = useTranslations("compare");
  const tStats = useTranslations("stats");
  const a = usePokemon(idA);
  const b = usePokemon(idB);

  if (!a.data || !b.data) return null;

  const stats = compareStats(a.data, b.data);

  return (
    <section>
      <h3 className="mb-3 text-lg font-semibold">{t("statsComparison")}</h3>
      <p className="mb-3 text-sm text-muted-foreground">{summarizeAdvantage(a.data, b.data)}</p>
      <Card>
        <CardContent className="p-4">
          <table className="w-full text-sm" aria-label={tStats("comparisonTable")}>
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 text-left font-medium">{tStats("stat")}</th>
                <th className="pb-2 text-center font-medium">A</th>
                <th className="pb-2 text-center font-medium">B</th>
                <th className="pb-2 text-right font-medium">{tStats("difference")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.statKey} className="border-b border-muted/30 last:border-0">
                  <td className="py-1.5 text-muted-foreground">{s.label.replace(/-/g, " ")}</td>
                  <td
                    className={cn(
                      "py-1.5 text-center font-mono tabular-nums",
                      s.winner === "a" ? "font-bold text-green-600" : "",
                    )}
                  >
                    {s.a}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 text-center font-mono tabular-nums",
                      s.winner === "b" ? "font-bold text-green-600" : "",
                    )}
                  >
                    {s.b}
                  </td>
                  <td className="py-1.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {s.diff > 0 ? `+${s.diff}` : s.diff === 0 ? "—" : String(s.diff)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function CompareEffectivenessPanel({ idA, idB }: { idA: number; idB: number }) {
  const t = useTranslations("compare");
  const a = usePokemon(idA);
  const b = usePokemon(idB);

  if (!a.data || !b.data) return null;

  const typesA = a.data.types.map((t) => t.type.name);
  const typesB = b.data.types.map((t) => t.type.name);
  const { shared, onlyA, onlyB } = compareTypes(a.data, b.data);
  const effA = computeDefensiveBreakdownFromTypes(typesA);
  const effB = computeDefensiveBreakdownFromTypes(typesB);

  return (
    <section>
      <h3 className="mb-3 text-lg font-semibold">{t("typesComparison")}</h3>
      <Card>
        <CardContent className="space-y-3 p-4">
          {shared.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                {t("sharedTypes")}:{" "}
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {shared.map((t) => (
                  <TypeBadge key={t} type={t} size="sm" />
                ))}
              </div>
            </div>
          )}
          {onlyA.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">{t("onlyA")}: </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {onlyA.map((t) => (
                  <TypeBadge key={t} type={t} size="sm" />
                ))}
              </div>
            </div>
          )}
          {onlyB.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">{t("onlyB")}: </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {onlyB.map((t) => (
                  <TypeBadge key={t} type={t} size="sm" />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <MiniEffectiveness title={capitalize(a.data.name)} breakdown={effA} />
        <MiniEffectiveness title={capitalize(b.data.name)} breakdown={effB} />
      </div>
    </section>
  );
}

function MiniEffectiveness({
  title,
  breakdown,
}: {
  title: string;
  breakdown: {
    weaknesses: { type: string; multiplier: number }[];
    resistances: { type: string; multiplier: number }[];
    immunities: string[];
  };
}) {
  const t = useTranslations("compare");
  return (
    <Card>
      <CardContent className="p-3">
        <h4 className="mb-2 text-sm font-semibold">{title}</h4>
        {breakdown.weaknesses.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-muted-foreground">{t("weaknesses")}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {breakdown.weaknesses.map((w) => (
                <div key={w.type} className="flex items-center gap-0.5">
                  <TypeBadge type={w.type} size="sm" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatMultiplier(w.multiplier)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {breakdown.immunities.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">{t("immunities")}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {breakdown.immunities.map((t) => (
                <div key={t} className="flex items-center gap-0.5">
                  <TypeBadge type={t} size="sm" />
                  <span className="font-mono text-xs text-muted-foreground">x0</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
