"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CalcResult } from "@/lib/calc/types";
import { useMoveNames } from "@/lib/queries";
import type { MoveNameLocale } from "@/lib/move-names";
import { titleCase } from "@/lib/calc/convert";
import { cn } from "@/lib/utils";

export interface ResultsPanelProps {
  results: CalcResult[];
}

const KO_THRESHOLDS = [100, 50, 33.3, 25];

function koLabel(t: (key: string) => string, pct: number): string | null {
  if (pct >= 99.5) return t("ko.ohko");
  if (pct >= 49.5) return t("ko.2hko");
  if (pct >= 32.8) return t("ko.3hko");
  if (pct >= 24.5) return t("ko.4hko");
  return null;
}

function barColor(pctMax: number): string {
  if (pctMax >= 99.5) return "bg-red-500";
  if (pctMax >= 49.5) return "bg-orange-500";
  if (pctMax >= 32.8) return "bg-yellow-500";
  return "bg-green-500";
}

/** Lista de resultados por movimiento con la notación Smogon + barra visual. */
export function ResultsPanel({ results }: ResultsPanelProps) {
  const t = useTranslations("calc");
  const locale = useLocale();
  const { data: moveNames } = useMoveNames(true);

  const localize = (slug: string): string => {
    const entry = moveNames?.[slug];
    return entry?.[locale as MoveNameLocale] ?? titleCase(slug);
  };

  if (results.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        {t("emptyResults")}
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{t("results")}</h3>
      <ul className="space-y-4">
        {results.map((r) => {
          const label = koLabel(t, r.pctMax);
          return (
            <li key={r.move} className="space-y-2">
              <p className="text-sm font-medium">{localize(r.move)}</p>
              <p className="text-xs text-muted-foreground">
                {t("damageRange", {
                  min: r.damageMin,
                  max: r.damageMax,
                  pctMin: Math.round(r.pctMin),
                  pctMax: Math.round(r.pctMax),
                })}
              </p>
              <p className="rounded-md bg-muted/40 p-2 font-mono text-xs leading-relaxed">
                {r.desc}
              </p>

              {/* Barra min–max */}
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-0 flex justify-between px-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="h-full w-px bg-foreground/10" aria-hidden />
                  ))}
                </div>
                {r.pctMax > 0 && (
                  <div
                    className={cn("absolute inset-y-0 rounded-full", barColor(r.pctMax))}
                    style={{
                      left: `${Math.max(0, r.pctMin)}%`,
                      width: `${Math.max(1, r.pctMax - r.pctMin)}%`,
                    }}
                  />
                )}
                {label && (
                  <span className="absolute -top-1 right-0 rounded bg-foreground/10 px-1 text-[8px] leading-4">
                    {label}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
