"use client";

import { useTranslations } from "next-intl";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import type { EffectivenessBreakdown } from "@/lib/type-effectiveness";
import { formatMultiplier } from "@/lib/type-effectiveness";

export interface TypeEffectivenessProps {
  /** Categorías ya computadas por `categorizeEffectiveness`. */
  breakdown: EffectivenessBreakdown;
}

/**
 * Tabla de efectividades defensivas (debilidades, resistencias, inmunidades).
 * Server component — recibe el breakdown pre-computado en el servidor.
 */
export function TypeEffectiveness({ breakdown }: TypeEffectivenessProps) {
  const t = useTranslations("defensive");
  const { weaknesses, resistances, immunities } = breakdown;
  const isEmpty = weaknesses.length === 0 && resistances.length === 0 && immunities.length === 0;

  if (isEmpty) {
    return <p className="text-sm text-muted-foreground">{t("noData")}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {weaknesses.length > 0 && (
        <Section
          title={t("weaknesses")}
          badges={weaknesses.map((w) => ({ type: w.type, suffix: formatMultiplier(w.multiplier) }))}
        />
      )}
      {resistances.length > 0 && (
        <Section
          title={t("resistances")}
          badges={resistances.map((r) => ({
            type: r.type,
            suffix: formatMultiplier(r.multiplier),
          }))}
        />
      )}
      {immunities.length > 0 && (
        <Section
          title={t("immunities")}
          badges={immunities.map((i) => ({ type: i, suffix: "x0" }))}
        />
      )}
    </div>
  );
}

function Section({ title, badges }: { title: string; badges: { type: string; suffix: string }[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <div key={b.type} className="flex items-center gap-1">
            <TypeBadge type={b.type} />
            <span className="font-mono text-xs text-muted-foreground">{b.suffix}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
