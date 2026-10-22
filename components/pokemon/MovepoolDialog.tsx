"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { useMovepool } from "@/lib/queries";
import type { MovepoolMove } from "@/lib/moveset";
import {
  filterMovepool,
  isMoveAvailableInGame,
  isNumericSortColumn,
  normalizeQuery,
  parseMovepoolQuery,
  pickDefaultVersionGroup,
  sortMovepool,
  type MovepoolLabels,
  type MovepoolSortColumn,
  type MovepoolSortState,
} from "@/lib/movepool-filter";
import { POKEMON_TYPES_ES } from "@/lib/pokemon-types";
import { capitalize } from "@/lib/pokemon-utils";
import { cn } from "@/lib/utils";

/** Tope de filas renderizadas; el aviso invita a filtrar si se supera. */
const MAX_ROWS = 200;

const CATEGORIES = new Set(["physical", "special", "status"]);
const CATEGORY_ORDER = ["physical", "special", "status"] as const;

function slugTitle(slug: string): string {
  return capitalize(slug.replace(/-/g, " "));
}

/** Nombre localizado del movimiento; fallback a inglés y luego al slug. */
function pickName(move: MovepoolMove, locale: string): string {
  return move.names[locale as keyof MovepoolMove["names"]] ?? move.names.en ?? slugTitle(move.slug);
}

export interface MovepoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** id numérico o slug de la especie cuyo movepool se muestra. */
  sourceId: number | string | undefined;
  /** Etiqueta localizada de la especie (para el título). */
  speciesLabel: string;
  /** Slug actualmente seleccionado (se resalta). */
  selectedSlug?: string | null;
  onSelect: (slug: string) => void;
  /** En formato Champions prioriza el learnset `champions` si existe. */
  champions?: boolean;
}

/**
 * Tabla completa de movimientos de una especie (estilo Showdown): buscador,
 * filtro por juego y columnas con tipo, categoría, poder, precisión y PP.
 * Un clic en una fila asigna el movimiento al slot.
 */
export function MovepoolDialog({
  open,
  onOpenChange,
  sourceId,
  speciesLabel,
  selectedSlug,
  onSelect,
  champions = false,
}: MovepoolDialogProps) {
  const t = useTranslations("teams.member");
  const tMoves = useTranslations("moves");
  const tTypes = useTranslations("pokemonTypes");
  const tVersionGroups = useTranslations("versionGroups");
  const locale = useLocale();

  const { data, isLoading, isError } = useMovepool(open ? sourceId : undefined);
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<MovepoolSortState | null>(null);

  // Juego por defecto: Champions si el formato lo pide y la especie tiene
  // learnset propio; si no, Escarlata/Púrpura y luego el más reciente.
  useEffect(() => {
    if (!data || data.versionGroups.length === 0) return;
    setGame(pickDefaultVersionGroup(data.versionGroups, champions));
  }, [data, champions]);

  // Limpia búsqueda y orden al abrir para arrancar siempre desde cero.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSort(null);
    }
  }, [open]);

  const vgLabel = (vg: string) => {
    const label = tVersionGroups(vg);
    return label === `versionGroups.${vg}` || label === vg ? slugTitle(vg) : label;
  };

  // Tokens del buscador que actúan como filtro: nombres de tipo y de categoría
  // (localizados o en slug). El resto se busca por nombre de movimiento.
  const typeByToken = useMemo(() => {
    const map = new Map<string, string>();
    for (const slug of POKEMON_TYPES_ES) {
      map.set(normalizeQuery(tTypes(slug)), slug);
      map.set(slug, slug);
    }
    return map;
  }, [tTypes]);

  const categoryByToken = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of CATEGORY_ORDER) {
      map.set(normalizeQuery(tMoves(`damageClass.${category}`)), category);
      map.set(category, category);
    }
    return map;
  }, [tMoves]);

  const filter = useMemo(
    () => parseMovepoolQuery(query, typeByToken, categoryByToken),
    [query, typeByToken, categoryByToken],
  );

  const labels: MovepoolLabels = useMemo(
    () => ({
      name: (move) => pickName(move, locale),
      type: (move) => tTypes(move.type),
      category: (move) =>
        CATEGORIES.has(move.category)
          ? tMoves(`damageClass.${move.category}`)
          : slugTitle(move.category),
    }),
    [locale, tTypes, tMoves],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const byGame = data.moves.filter((move) => isMoveAvailableInGame(move, game));
    return filterMovepool(byGame, filter, (move) => ({
      name: pickName(move, locale),
      englishName: move.names.en ?? "",
    }));
  }, [data, game, filter, locale]);

  const sorted = useMemo(() => sortMovepool(filtered, sort, labels), [filtered, sort, labels]);

  // Etiquetas de los filtros activos, para feedback bajo el buscador.
  const activeFilters = useMemo(
    () => [
      ...filter.types.map((slug) => tTypes(slug)),
      ...filter.categories.map((category) => tMoves(`damageClass.${category}`)),
    ],
    [filter, tTypes, tMoves],
  );

  const toggleSort = (column: MovepoolSortColumn) => {
    setSort((prev) =>
      prev && prev.column === column
        ? { column, reverse: !prev.reverse }
        : { column, reverse: false },
    );
  };

  /** Dirección efectiva de la columna activa (el primario difiere por tipo). */
  const sortDirectionOf = (column: MovepoolSortColumn): "ascending" | "descending" | "none" => {
    if (sort?.column !== column) return "none";
    const ascending = isNumericSortColumn(column) ? sort.reverse : !sort.reverse;
    return ascending ? "ascending" : "descending";
  };

  const sortButton = (column: MovepoolSortColumn, label: string, align: "left" | "right") => {
    const direction = sortDirectionOf(column);
    return (
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-1 hover:text-foreground",
          align === "right" && "justify-end",
          direction !== "none" && "text-foreground",
        )}
      >
        {label}
        {direction === "ascending" && <ChevronUp className="size-3 shrink-0" aria-hidden />}
        {direction === "descending" && <ChevronDown className="size-3 shrink-0" aria-hidden />}
      </button>
    );
  };

  const rows = sorted.slice(0, MAX_ROWS);
  const truncated = sorted.length > rows.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("movepoolTitle", { name: speciesLabel })}</DialogTitle>
        </DialogHeader>

        {/* Buscador + filtro de juego */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("movepoolSearchPlaceholder")}
              aria-label={t("movepoolSearchPlaceholder")}
              className="pl-9"
              autoFocus
            />
          </div>
          {data && data.versionGroups.length > 0 && (
            <Select value={game ?? ""} onValueChange={(v) => setGame(v)}>
              <SelectTrigger className="sm:w-64" aria-label={tMoves("gameLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.versionGroups.map((vg) => (
                  <SelectItem key={vg} value={vg}>
                    {vgLabel(vg)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Contador, filtros activos y aviso de recorte */}
        {data && (
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>
              {truncated
                ? t("movepoolShowing", { shown: rows.length, total: sorted.length })
                : t("movepoolCount", { count: sorted.length })}
            </span>
            {activeFilters.length > 0 && (
              <span className="font-medium text-foreground">
                {t("movepoolFiltered", { filters: activeFilters.join(", ") })}
              </span>
            )}
          </p>
        )}

        {/* Tabla. Max-height propia: DialogContent es `grid`, así que flex-1
            no aplica; con el scroll del body bloqueado por el modal hay que
            acotar aquí la altura para que la tabla haga scroll. */}
        <div className="max-h-[calc(85vh-14rem)] overflow-auto rounded-md border">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="p-4 text-sm text-muted-foreground">{t("movepoolError")}</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {game ? t("movepoolEmptyGame", { game: vgLabel(game) }) : t("movepoolEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead aria-sort={sortDirectionOf("name")}>
                    {sortButton("name", tMoves("table.name"), "left")}
                  </TableHead>
                  <TableHead aria-sort={sortDirectionOf("type")}>
                    {sortButton("type", tMoves("table.type"), "left")}
                  </TableHead>
                  <TableHead aria-sort={sortDirectionOf("category")}>
                    {sortButton("category", tMoves("table.category"), "left")}
                  </TableHead>
                  <TableHead className="text-right" aria-sort={sortDirectionOf("power")}>
                    {sortButton("power", tMoves("table.power"), "right")}
                  </TableHead>
                  <TableHead className="text-right" aria-sort={sortDirectionOf("accuracy")}>
                    {sortButton("accuracy", tMoves("table.accuracy"), "right")}
                  </TableHead>
                  <TableHead className="text-right" aria-sort={sortDirectionOf("pp")}>
                    {sortButton("pp", tMoves("table.pp"), "right")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((move) => {
                  const selected = move.slug === selectedSlug;
                  const localized = pickName(move, locale);
                  const english = move.names.en;
                  return (
                    <TableRow
                      key={move.slug}
                      aria-selected={selected}
                      className={cn("cursor-pointer", selected && "bg-muted")}
                      onClick={() => {
                        onSelect(move.slug);
                        onOpenChange(false);
                      }}
                    >
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(move.slug);
                            onOpenChange(false);
                          }}
                        >
                          <span className="block">{localized}</span>
                          {english && english !== localized && (
                            <span className="block text-xs text-muted-foreground">{english}</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={move.type} size="sm" />
                      </TableCell>
                      <TableCell className="text-xs">
                        {CATEGORIES.has(move.category)
                          ? tMoves(`damageClass.${move.category}`)
                          : capitalize(move.category)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {move.power ?? tMoves("emptyFallback")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {move.accuracy !== null ? `${move.accuracy}%` : tMoves("emptyFallback")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {move.pp ?? tMoves("emptyFallback")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
