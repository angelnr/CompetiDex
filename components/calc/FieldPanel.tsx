"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CalcFieldInput, Level, TerrainKey, WeatherKey } from "@/lib/calc/types";
import { cn } from "@/lib/utils";

export interface FieldPanelProps {
  field: CalcFieldInput;
  onChange: (patch: Partial<CalcFieldInput>) => void;
}

const WEATHERS: { value: WeatherKey; labelKey: string }[] = [
  { value: "none", labelKey: "none" },
  { value: "sun", labelKey: "sun" },
  { value: "rain", labelKey: "rain" },
  { value: "sand", labelKey: "sand" },
  { value: "snow", labelKey: "snow" },
];

const TERRAINS: { value: TerrainKey; labelKey: string }[] = [
  { value: "none", labelKey: "none" },
  { value: "electric", labelKey: "electric" },
  { value: "grassy", labelKey: "grassy" },
  { value: "psychic", labelKey: "psychic" },
  { value: "misty", labelKey: "misty" },
];

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/** Panel central de condiciones de campo: nivel, clima, terreno, púas,
 * tramparrocas, pantallas y crítico. */
export function FieldPanel({ field, onChange }: FieldPanelProps) {
  const t = useTranslations("calc");

  const setLevel = (level: Level) => onChange({ level });

  return (
    <section className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{t("field")}</h3>

      {/* Nivel global 50/100 */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium">{t("level")}</label>
        <div role="radiogroup" aria-label={t("level")} className="flex gap-1">
          {([50, 100] as Level[]).map((lv) => (
            <button
              key={lv}
              type="button"
              role="radio"
              aria-checked={field.level === lv}
              onClick={() => setLevel(lv)}
              className={cn(
                "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                field.level === lv
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              Lv {lv}
            </button>
          ))}
        </div>
      </div>

      {/* Clima */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium">{t("weatherLabel")}</label>
        <Select value={field.weather} onValueChange={(v) => onChange({ weather: v as WeatherKey })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEATHERS.map((w) => (
              <SelectItem key={w.value} value={w.value}>
                {t(`weather.${w.labelKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Terreno */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium">{t("terrainLabel")}</label>
        <Select value={field.terrain} onValueChange={(v) => onChange({ terrain: v as TerrainKey })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TERRAINS.map((tr) => (
              <SelectItem key={tr.value} value={tr.value}>
                {t(`terrain.${tr.labelKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Púas 0-3 */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium">{t("spikes")}</label>
        <div role="radiogroup" aria-label={t("spikes")} className="flex gap-1">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={field.spikes === n}
              onClick={() => onChange({ spikes: n as 0 | 1 | 2 | 3 })}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                field.spikes === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Toggle
          active={field.isSR}
          onClick={() => onChange({ isSR: !field.isSR })}
          label={t("stealthRock")}
        />
        <Toggle
          active={field.isReflect}
          onClick={() => onChange({ isReflect: !field.isReflect })}
          label={t("reflect")}
        />
        <Toggle
          active={field.isLightScreen}
          onClick={() => onChange({ isLightScreen: !field.isLightScreen })}
          label={t("lightScreen")}
        />
        <Toggle
          active={field.isAuroraVeil}
          onClick={() => onChange({ isAuroraVeil: !field.isAuroraVeil })}
          label={t("auroraVeil")}
        />
      </div>

      <div className="mb-3">
        <Toggle
          active={field.critical}
          onClick={() => onChange({ critical: !field.critical })}
          label={t("critical")}
        />
      </div>

      {/* HP del defensor */}
      <div>
        <label htmlFor="def-hp" className="mb-1 block text-xs font-medium">
          {t("defenderHp")}
        </label>
        <Input
          id="def-hp"
          type="number"
          min={1}
          max={100}
          value={field.defenderHpPct}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n)) {
              onChange({ defenderHpPct: Math.min(Math.max(n, 1), 100) });
            }
          }}
          className="h-8 text-center text-xs"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">%</p>
      </div>
    </section>
  );
}
