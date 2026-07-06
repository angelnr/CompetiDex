"use client";

import { useState, useMemo, useCallback } from "react";
import { getDefensiveMultiplier } from "@/lib/type-chart";

export interface DefendersInfo {
  id: number;
  name: string;
  types: string[];
}

export interface CalculatorResult {
  moveType: string;
  worst: number;
  perDefender: { id: number; name: string; multiplier: number }[];
}

export function useEffectivenessCalculator() {
  const [moveType, setMoveType] = useState<string | null>(null);
  const [defenders, setDefenders] = useState<DefendersInfo[]>([]);

  const setDefenderTypes = useCallback((id: number, types: string[]) => {
    setDefenders((prev) => prev.map((d) => (d.id === id ? { ...d, types } : d)));
  }, []);

  const result = useMemo<CalculatorResult | null>(() => {
    if (!moveType || defenders.length === 0) return null;
    const resolved = defenders.filter((d) => d.types.length > 0);
    if (resolved.length === 0) return null;
    const perDefender = resolved.map((d) => ({
      id: d.id,
      name: d.name,
      multiplier: getDefensiveMultiplier(moveType, d.types),
    }));
    const worst = Math.min(...perDefender.map((p) => p.multiplier));
    return { moveType, worst, perDefender };
  }, [moveType, defenders]);

  const addDefender = useCallback((info: DefendersInfo) => {
    setDefenders((prev) => {
      if (prev.some((d) => d.id === info.id)) return prev;
      return [...prev, info];
    });
  }, []);

  const removeDefender = useCallback((id: number) => {
    setDefenders((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clear = useCallback(() => {
    setMoveType(null);
    setDefenders([]);
  }, []);

  return {
    moveType,
    setMoveType,
    defenders,
    setDefenderTypes,
    addDefender,
    removeDefender,
    clear,
    result,
  };
}
