"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { POKEMON_STATS } from "@/lib/pokemon-utils";
import { cn } from "@/lib/utils";

export interface StatBarProps {
  /** Nombre interno del stat: "hp", "attack"... */
  statName: string;
  /** Valor base (0-255). */
  value: number;
}

const STAT_MAX = 255;

/**
 * Barra de stat animada. Se "rellena" al montarse con una transición CSS
 * controlada por el observer de visibilidad para que la animación sea percibida
 * en scroll. Color por rango de valor (verde/amarillo/naranja/rojo).
 * El máximo de la barra es 255 (el stat real máximo en los juegos).
 */
export function StatBar({ statName, value }: StatBarProps) {
  const tStats = useTranslations("stats");
  const meta = POKEMON_STATS[statName];
  const label = tStats(statName);
  const color = (meta?.colorFor ?? (() => "#94a3b8"))(value);
  const widthPct = Math.min(100, (value / STAT_MAX) * 100);

  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-[5rem_2.5rem_1fr] items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-xs tabular-nums">{value}</span>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={`${label}: ${value}`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={STAT_MAX}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out")}
          style={{
            width: visible ? `${widthPct}%` : "0%",
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
