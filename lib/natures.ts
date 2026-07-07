/**
 * Catálogo estático de naturalezas (natures) para la calculadora de stats.
 * Datos inmutables — no fetch a PokeAPI necesario.
 */

export type StatKey = "hp" | "attack" | "defense" | "special-attack" | "special-defense" | "speed";

export interface Nature {
  id: number;
  name: string;
  nameEs: string;
  increased: StatKey | null;
  decreased: StatKey | null;
}

export const NATURES: Nature[] = [
  { id: 1, name: "hardy", nameEs: "Fuerte", increased: null, decreased: null },
  { id: 2, name: "lonely", nameEs: "Huraña", increased: "attack", decreased: "defense" },
  { id: 3, name: "brave", nameEs: "Audaz", increased: "attack", decreased: "speed" },
  { id: 4, name: "adamant", nameEs: "Firme", increased: "attack", decreased: "special-attack" },
  { id: 5, name: "naughty", nameEs: "Pícara", increased: "attack", decreased: "special-defense" },
  { id: 6, name: "bold", nameEs: "Osada", increased: "defense", decreased: "attack" },
  { id: 7, name: "docile", nameEs: "Dócil", increased: null, decreased: null },
  { id: 8, name: "relaxed", nameEs: "Plácida", increased: "defense", decreased: "speed" },
  { id: 9, name: "impish", nameEs: "Agitada", increased: "defense", decreased: "special-attack" },
  { id: 10, name: "lax", nameEs: "Floja", increased: "defense", decreased: "special-defense" },
  { id: 11, name: "timid", nameEs: "Miedosa", increased: "speed", decreased: "attack" },
  { id: 12, name: "hasty", nameEs: "Activa", increased: "speed", decreased: "defense" },
  { id: 13, name: "serious", nameEs: "Sería", increased: null, decreased: null },
  { id: 14, name: "jolly", nameEs: "Alegre", increased: "speed", decreased: "special-attack" },
  { id: 15, name: "naive", nameEs: "Ingenua", increased: "speed", decreased: "special-defense" },
  { id: 16, name: "modest", nameEs: "Modesta", increased: "special-attack", decreased: "attack" },
  { id: 17, name: "mild", nameEs: "Afable", increased: "special-attack", decreased: "defense" },
  { id: 18, name: "quiet", nameEs: "Mansa", increased: "special-attack", decreased: "speed" },
  { id: 19, name: "bashful", nameEs: "Tímida", increased: null, decreased: null },
  {
    id: 20,
    name: "rash",
    nameEs: "Alocada",
    increased: "special-attack",
    decreased: "special-defense",
  },
  { id: 21, name: "calm", nameEs: "Serena", increased: "special-defense", decreased: "attack" },
  { id: 22, name: "gentle", nameEs: "Amable", increased: "special-defense", decreased: "defense" },
  { id: 23, name: "sassy", nameEs: "Grosera", increased: "special-defense", decreased: "speed" },
  {
    id: 24,
    name: "careful",
    nameEs: "Cauta",
    increased: "special-defense",
    decreased: "special-attack",
  },
  { id: 25, name: "quirky", nameEs: "Rara", increased: null, decreased: null },
];

export function getNature(name: string): Nature | undefined {
  const q = name.toLowerCase().trim();
  return NATURES.find((n) => n.name === q || n.nameEs.toLowerCase() === q);
}
