/**
 * Ordenación y filtrado puros de la tabla de movimientos de una especie
 * (botón "Ver todos los movimientos" del constructor de equipos).
 *
 * Sin JSX ni dependencias de React: la UI solo aporta las etiquetas
 * localizadas y consume el resultado.
 */

import type { MovepoolMove } from "@/lib/moveset";

export type MovepoolSortColumn = "name" | "type" | "category" | "power" | "accuracy" | "pp";

/**
 * Juego inicial del movepool. En Champions se usa su propio learnset si la
 * especie lo tiene; si no (p. ej. Pawmot), se cae a Escarlata/Púrpura y, por
 * último, al version-group más reciente disponible.
 */
export function pickDefaultVersionGroup(
  versionGroups: string[],
  champions = false,
): string | undefined {
  if (champions && versionGroups.includes("champions")) return "champions";
  if (versionGroups.includes("scarlet-violet")) return "scarlet-violet";
  return versionGroups.at(-1);
}

/**
 * Indica si un movimiento está disponible en el juego seleccionado. Los
 * movimientos sin version-groups se mantienen visibles como fallback.
 */
export function isMoveAvailableInGame(
  move: Pick<MovepoolMove, "vgs">,
  game: string | undefined,
): boolean {
  return !game || move.vgs.length === 0 || move.vgs.includes(game);
}

export const MOVEPOOL_SORT_COLUMNS: MovepoolSortColumn[] = [
  "name",
  "type",
  "category",
  "power",
  "accuracy",
  "pp",
];

/**
 * Estado de ordenación de la tabla. El primer clic en una columna aplica el
 * orden primario (alfabético A-Z o numérico de mayor a menor) y el segundo lo
 * invierte (`reverse`).
 */
export interface MovepoolSortState {
  column: MovepoolSortColumn;
  reverse: boolean;
}

export interface MovepoolLabels {
  /** Etiqueta mostrada en la columna "Nombre". */
  name: (move: MovepoolMove) => string;
  /** Etiqueta mostrada en la columna "Tipo". */
  type: (move: MovepoolMove) => string;
  /** Etiqueta mostrada en la columna "Categoría". */
  category: (move: MovepoolMove) => string;
}

/**
 * Columnas numéricas: su orden primario es de mayor a menor (el resto, A-Z).
 */
export function isNumericSortColumn(column: MovepoolSortColumn): boolean {
  return column === "power" || column === "accuracy" || column === "pp";
}

/** Normaliza texto para comparar y buscar: sin acentos, minúsculas y sin sobrantes. */
export function normalizeQuery(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Comparador alfanumérico natural: los dígitos ordenan antes que las letras
 * (1-9, A-Z) y los números se comparan por valor ("Move 2" antes que "Move 10").
 */
export function compareAlphanumeric(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Ordena una copia de `moves` según el estado de ordenación. Con `sort` nulo
 * devuelve el array original sin tocarlo. Los valores ausentes (p. ej. el poder
 * de un movimiento de estado) van siempre al final, en ambos sentidos. Los
 * empates se resuelven por nombre en orden alfanumérico (1-9, A-Z).
 */
export function sortMovepool(
  moves: MovepoolMove[],
  sort: MovepoolSortState | null,
  labels: MovepoolLabels,
): MovepoolMove[] {
  if (!sort) return moves;

  const { column, reverse } = sort;
  const numeric = isNumericSortColumn(column);
  // Orden primario: etiquetas A-Z y números de mayor a menor.
  const sign = numeric ? (reverse ? 1 : -1) : reverse ? -1 : 1;

  const numericValueOf = (move: MovepoolMove): number | null => {
    if (column === "power") return move.power;
    if (column === "accuracy") return move.accuracy;
    return move.pp;
  };

  const stringValueOf = (move: MovepoolMove): string => {
    if (column === "name") return labels.name(move);
    if (column === "type") return labels.type(move);
    return labels.category(move);
  };

  const byName = (a: MovepoolMove, b: MovepoolMove) =>
    compareAlphanumeric(labels.name(a), labels.name(b));

  return [...moves].sort((a, b) => {
    if (numeric) {
      const va = numericValueOf(a);
      const vb = numericValueOf(b);
      if (va === null || vb === null) {
        if (va === vb) return byName(a, b);
        return va === null ? 1 : -1;
      }
      if (va !== vb) return sign * (va - vb);
    } else {
      const cmp = compareAlphanumeric(stringValueOf(a), stringValueOf(b));
      if (cmp !== 0) return sign * cmp;
    }
    return byName(a, b);
  });
}

export interface MovepoolFilter {
  /** Slugs de tipo que deben mostrarse (OR entre ellos). Vacío = todos. */
  types: string[];
  /** Categorías de daño que deben mostrarse (OR entre ellas). Vacío = todas. */
  categories: string[];
  /** Términos de texto sobre el nombre; todos deben aparecer (AND). */
  terms: string[];
}

/**
 * Interpreta el texto del buscador como filtros. Cada trozo separado por comas
 * se resuelve, por igualdad exacta, contra el mapa de tipos y el de categorías;
 * si no coincide con ninguno se trata como término de búsqueda por nombre.
 *
 * Ejemplos: "Hada, Eléctrico" → solo esos dos tipos; "Físico" → solo movimientos
 * físicos; "Fuego, Especial, danza" → movimientos de fuego especiales cuyo
 * nombre contenga "danza".
 */
export function parseMovepoolQuery(
  query: string,
  typeByToken: Map<string, string>,
  categoryByToken: Map<string, string>,
): MovepoolFilter {
  const types: string[] = [];
  const categories: string[] = [];
  const terms: string[] = [];

  for (const raw of query.split(",")) {
    const token = normalizeQuery(raw);
    if (!token) continue;

    const type = typeByToken.get(token);
    if (type) {
      if (!types.includes(type)) types.push(type);
      continue;
    }

    const category = categoryByToken.get(token);
    if (category) {
      if (!categories.includes(category)) categories.push(category);
      continue;
    }

    if (!terms.includes(token)) terms.push(token);
  }

  return { types, categories, terms };
}

/** Indica si el filtro no restringe nada. */
export function isMovepoolFilterEmpty(filter: MovepoolFilter): boolean {
  return filter.types.length === 0 && filter.categories.length === 0 && filter.terms.length === 0;
}

/**
 * Filtra los movimientos: los tipos se combinan con OR, las categorías con OR y
 * el texto con AND; entre los tres grupos el resultado es su intersección.
 */
export function filterMovepool(
  moves: MovepoolMove[],
  filter: MovepoolFilter,
  names: (move: MovepoolMove) => { name: string; englishName: string },
): MovepoolMove[] {
  const { types, categories, terms } = filter;
  if (types.length === 0 && categories.length === 0 && terms.length === 0) return moves;

  return moves.filter((move) => {
    if (types.length > 0 && !types.includes(move.type)) return false;
    if (categories.length > 0 && !categories.includes(move.category)) return false;
    if (terms.length === 0) return true;

    const { name, englishName } = names(move);
    const localized = normalizeQuery(name);
    const english = normalizeQuery(englishName);
    return terms.every(
      (term) =>
        localized.includes(term) ||
        english.includes(term) ||
        move.slug.includes(term.replace(/\s+/g, "-")),
    );
  });
}
