/**
 * Helpers de comparación pura entre dos Pokémon.
 * Sin dependencias de UI — seguro en Server y cliente.
 */
import type { Pokemon } from "@/lib/pokeapi";

export interface StatComparison {
  statKey: string;
  label: string;
  a: number;
  b: number;
  diff: number;
  winner: "a" | "b" | "tie";
}

const STAT_ORDER = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
] as const;

export function compareStats(a: Pokemon, b: Pokemon): StatComparison[] {
  return STAT_ORDER.map((key) => {
    const statA = a.stats.find((s) => s.stat.name === key);
    const statB = b.stats.find((s) => s.stat.name === key);
    const valA = statA?.base_stat ?? 0;
    const valB = statB?.base_stat ?? 0;
    const diff = valA - valB;
    const winner: "a" | "b" | "tie" = diff > 0 ? "a" : diff < 0 ? "b" : "tie";
    return { statKey: key, label: statA?.stat.name ?? key, a: valA, b: valB, diff, winner };
  });
}

export interface PhysicalComparison {
  label: string;
  key: string;
  a: number | null;
  b: number | null;
}

export function comparePhysical(a: Pokemon, b: Pokemon): PhysicalComparison[] {
  return [
    { label: "Altura", key: "height", a: a.height, b: b.height },
    { label: "Peso", key: "weight", a: a.weight, b: b.weight },
    { label: "Exp. base", key: "base_experience", a: a.base_experience, b: b.base_experience },
  ];
}

export function compareTypes(
  a: Pokemon,
  b: Pokemon,
): { shared: string[]; onlyA: string[]; onlyB: string[] } {
  const typesA = a.types.map((t) => t.type.name);
  const typesB = b.types.map((t) => t.type.name);
  const shared = typesA.filter((t) => typesB.includes(t));
  const onlyA = typesA.filter((t) => !typesB.includes(t));
  const onlyB = typesB.filter((t) => !typesA.includes(t));
  return { shared, onlyA, onlyB };
}

export function summarizeAdvantage(a: Pokemon, b: Pokemon): string {
  const nameA = a.name.charAt(0).toUpperCase() + a.name.slice(1);
  const nameB = b.name.charAt(0).toUpperCase() + b.name.slice(1);
  const stats = compareStats(a, b);
  const winsA = stats.filter((s) => s.winner === "a").length;
  const winsB = stats.filter((s) => s.winner === "b").length;

  if (winsA === winsB) return `${nameA} y ${nameB} están empatados en stats base.`;
  if (winsA > winsB) return `${nameA} gana en ${winsA} de ${stats.length} stats base.`;
  return `${nameB} gana en ${winsB} de ${stats.length} stats base.`;
}
