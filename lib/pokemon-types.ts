/**
 * Fuente única de verdad para colores y metadata de tipos de Pokémon.
 *
 * Cumple AGENTS.md §4.4: ninguna otra carpeta debe definir colores de tipos.
 * Los hex se usan en inline-style del TypeBadge (necesario porque las vars CSS
 * no aceptan hex dinámicos en Tailwind sin interpolación de strings, prohibida
 * por las mismas reglas). Para fondos/foreground viaja por data-attribute y CSS.
 *
 * Cifras y nombres son los oficiales del ámbito competitivo.
 */

export type PokemonTypeName =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy"
  | "stellar"
  | "unknown";

export interface PokemonTypeMeta {
  /** Color principal (hex) del tipo. */
  color: string;
  /** Color del texto sobre el color principal. */
  text: string;
  /** Etiqueta legible en español, capitalizada. */
  label: string;
}

const TYPES: Record<PokemonTypeName, PokemonTypeMeta> = {
  normal: { color: "#A8A77A", text: "#1f2937", label: "Normal" },
  fire: { color: "#EE8130", text: "#ffffff", label: "Fuego" },
  water: { color: "#6390F0", text: "#ffffff", label: "Agua" },
  electric: { color: "#F7D02C", text: "#1f2937", label: "Eléctrico" },
  grass: { color: "#7AC74C", text: "#1f2937", label: "Planta" },
  ice: { color: "#96D9D6", text: "#1f2937", label: "Hielo" },
  fighting: { color: "#C22E28", text: "#ffffff", label: "Lucha" },
  poison: { color: "#A33EA1", text: "#ffffff", label: "Veneno" },
  ground: { color: "#E2BF65", text: "#1f2937", label: "Tierra" },
  flying: { color: "#A98FF3", text: "#1f2937", label: "Volador" },
  psychic: { color: "#F95587", text: "#ffffff", label: "Psíquico" },
  bug: { color: "#A6B91A", text: "#1f2937", label: "Bicho" },
  rock: { color: "#B6A136", text: "#ffffff", label: "Roca" },
  ghost: { color: "#735797", text: "#ffffff", label: "Fantasma" },
  dragon: { color: "#6F35FC", text: "#ffffff", label: "Dragón" },
  dark: { color: "#705746", text: "#ffffff", label: "Siniestro" },
  steel: { color: "#B7B7CE", text: "#1f2937", label: "Acero" },
  fairy: { color: "#D685AD", text: "#1f2937", label: "Hada" },
  stellar: { color: "#E6E6E6", text: "#1f2937", label: "Stellar" },
  unknown: { color: "#68A090", text: "#ffffff", label: "???" },
};

/**
 * Devuelve la metadata de un tipo por nombre. Lanza en desarrollo si el tipo
 * no está mapeado (defensa en TS estricto), y en producción hace fallback a
 * `unknown` para no romper la UI.
 */
export function getTypeMeta(name: string): PokemonTypeMeta {
  const key = name.toLowerCase() as PokemonTypeName;
  if (key in TYPES) return TYPES[key];
  if (process.env.NODE_ENV !== "production") {
    throw new Error(`Tipo de Pokémon no mapeado: "${name}". Añadir a lib/pokemon-types.ts`);
  }
  return TYPES.unknown;
}

/** Lista de tipos ordenados alfabéticamente en español (para filtros de UI). */
export const POKEMON_TYPES_ES: PokemonTypeName[] = (Object.keys(TYPES) as PokemonTypeName[]).filter(
  (t) => t !== "unknown" && t !== "stellar",
);

export { TYPES as POKEMON_TYPES };
