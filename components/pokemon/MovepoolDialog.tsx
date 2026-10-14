"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
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
import { capitalize } from "@/lib/pokemon-utils";
import { cn } from "@/lib/utils";

/** Tope de filas renderizadas; el aviso invita a filtrar si se supera. */
const MAX_ROWS = 200;

const CATEGORIES = new Set(["physical", "special", "status"]);

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

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
}: MovepoolDialogProps) {
  const t = useTranslations("teams.member");
  const tMoves = useTranslations("moves");
  const tVersionGroups = useTranslations("versionGroups");
  const locale = useLocale();

  const { data, isLoading, isError } = useMovepool(open ? sourceId : undefined);
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<string | undefined>(undefined);

  // Juego por defecto: el más reciente (prefiriendo Escarlata/Púrpura).
  useEffect(() => {
    if (!data || data.versionGroups.length === 0) return;
    setGame((prev) =>
      prev && data.versionGroups.includes(prev)
        ? prev
        : data.versionGroups.includes("scarlet-violet")
          ? "scarlet-violet"
          : data.versionGroups.at(-1),
    );
  }, [data]);

  // Limpia la búsqueda al abrir para arrancar siempre desde cero.
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const vgLabel = (vg: string) => {
    const label = tVersionGroups(vg);
    return label === `versionGroups.${vg}` || label === vg ? slugTitle(vg) : label;
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = normalize(query.trim());
    return data.moves.filter((move) => {
      if (game && move.vgs.length > 0 && !move.vgs.includes(game)) return false;
      if (!q) return true;
      const es = normalize(pickName(move, locale));
      const en = normalize(move.names.en ?? "");
      return es.includes(q) || en.includes(q) || move.slug.includes(q.replace(/\s+/g, "-"));
    });
  }, [data, game, query, locale]);

  const rows = filtered.slice(0, MAX_ROWS);
  const truncated = filtered.length > rows.length;

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
              placeholder={t("moveSearch")}
              aria-label={t("moveSearch")}
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

        {/* Contador / aviso de recorte */}
        {data && (
          <p className="text-xs text-muted-foreground">
            {truncated
              ? t("movepoolShowing", { shown: rows.length, total: filtered.length })
              : t("movepoolCount", { count: filtered.length })}
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
                  <TableHead>{tMoves("table.name")}</TableHead>
                  <TableHead>{tMoves("table.type")}</TableHead>
                  <TableHead>{tMoves("table.category")}</TableHead>
                  <TableHead className="text-right">{tMoves("table.power")}</TableHead>
                  <TableHead className="text-right">{tMoves("table.accuracy")}</TableHead>
                  <TableHead className="text-right">{tMoves("table.pp")}</TableHead>
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
