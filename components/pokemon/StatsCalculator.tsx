"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatBar } from "@/components/pokemon/StatBar";
import { computeStat } from "@/lib/pokemon-utils";
import { NATURES, type StatKey } from "@/lib/natures";
import { cn } from "@/lib/utils";
import type { PokemonStat } from "@/lib/pokeapi";

const EV_STEP = 4;
const STAT_ORDER: StatKey[] = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
];
const DEFAULT_IV = 31;
const DEFAULT_EV = 0;

interface StatsCalculatorProps {
  stats: PokemonStat[];
}

export function StatsCalculator({ stats }: StatsCalculatorProps) {
  const t = useTranslations("statCalc");

  const [level, setLevel] = useState<50 | 100>(100);
  const [natureName, setNatureName] = useState("serious");
  const [ivs, setIvs] = useState<Partial<Record<StatKey, number>>>({});
  const [evs, setEvs] = useState<Partial<Record<StatKey, number>>>({});

  const selectedNature = NATURES.find((n) => n.name === natureName);

  const statMap = useMemo(() => {
    const map: Partial<Record<StatKey, number>> = {};
    for (const s of stats) {
      if (STAT_ORDER.includes(s.stat.name as StatKey)) {
        map[s.stat.name as StatKey] = s.base_stat;
      }
    }
    return map;
  }, [stats]);

  const computed = useMemo(() => {
    return STAT_ORDER.map((key) => {
      const base = statMap[key] ?? 50;
      const iv = ivs[key] ?? DEFAULT_IV;
      const ev = evs[key] ?? DEFAULT_EV;
      let natureMultiplier = 1;
      if (selectedNature) {
        if (selectedNature.increased === key) natureMultiplier = 1.1;
        if (selectedNature.decreased === key) natureMultiplier = 0.9;
      }
      const value = computeStat({ base, iv, ev, level, isHp: key === "hp", natureMultiplier });
      return { key, base, iv, ev, value, natureMultiplier };
    });
  }, [statMap, ivs, evs, level, selectedNature]);

  const handleIvChange = (key: StatKey, raw: string) => {
    const n = Math.min(31, Math.max(0, Number(raw) || 0));
    setIvs((prev) => ({ ...prev, [key]: n }));
  };
  const handleEvChange = (key: StatKey, raw: string) => {
    const n = Math.min(252, Math.max(0, Math.round(Number(raw) || 0)));
    setEvs((prev) => ({ ...prev, [key]: n }));
  };

  const reset = () => {
    setIvs({});
    setEvs({});
    setNatureName("serious");
    setLevel(100);
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">{t("title")}</h3>
        <Button variant="ghost" size="sm" onClick={reset} aria-label={t("reset")}>
          <RotateCcw className="mr-1 size-3" />
          {t("reset")}
        </Button>
      </div>

      {/* Controles globales: nivel + naturaleza */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <fieldset>
          <legend className="mb-1 text-xs text-muted-foreground">{t("level")}</legend>
          <div className="flex gap-1">
            {([50, 100] as const).map((lv) => (
              <Button
                key={lv}
                type="button"
                variant={level === lv ? "default" : "outline"}
                size="sm"
                onClick={() => setLevel(lv)}
                aria-pressed={level === lv}
              >
                Lv. {lv}
              </Button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="nature-select" className="mb-1 block text-xs text-muted-foreground">
            {t("nature")}
          </label>
          <select
            id="nature-select"
            value={natureName}
            onChange={(e) => setNatureName(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            {NATURES.map((n) => {
              const suffix =
                n.increased && n.decreased ? ` (+${n.increased} -${n.decreased})` : " (—)";
              return (
                <option key={n.id} value={n.name}>
                  {n.nameEs}
                  {suffix}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Tabla de stats */}
      <div className="space-y-3">
        {computed.map((row) => {
          const isIncreased = selectedNature?.increased === row.key;
          const isDecreased = selectedNature?.decreased === row.key;
          const statNameLabel = t(`stats.${row.key}`);
          return (
            <div
              key={row.key}
              className="grid grid-cols-[7rem_1fr_4rem_5rem_4rem] items-center gap-2 text-sm"
            >
              <span
                className={cn(
                  "font-medium",
                  isIncreased && "text-green-600",
                  isDecreased && "text-red-500",
                )}
              >
                {statNameLabel}
                {isIncreased && " ↑"}
                {isDecreased && " ↓"}
              </span>

              {/* Barra de base */}
              <div className="min-w-0">
                <StatBar statName={row.key} value={row.base} />
              </div>

              {/* IV */}
              <div>
                <Input
                  type="number"
                  min={0}
                  max={31}
                  value={row.iv}
                  onChange={(e) => handleIvChange(row.key, e.target.value)}
                  className="h-7 w-full text-center text-xs tabular-nums"
                  aria-label={`IV ${statNameLabel}`}
                />
              </div>

              {/* EV */}
              <div>
                <Input
                  type="number"
                  min={0}
                  max={252}
                  step={EV_STEP}
                  value={row.ev}
                  onChange={(e) => handleEvChange(row.key, e.target.value)}
                  className="h-7 w-full text-center text-xs tabular-nums"
                  aria-label={`EV ${statNameLabel}`}
                />
              </div>

              {/* Valor calculado */}
              <div className="text-right font-mono text-sm font-bold tabular-nums">{row.value}</div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t("hint")}</p>
    </div>
  );
}
